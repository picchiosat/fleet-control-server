import os
import re
import json
import time
import sqlite3
import subprocess
from contextlib import closing
from flask import Blueprint, request, jsonify, send_from_directory
from core.config import (
    BASE_DIR, CLIENTS_PATH, DB_PATH, config, read_config, write_config, logger
)
from core.database import db_connect, audit
import core.state as state
from services.mqtt_service import mqtt_publish
from services.push_service import node_allowed
from routes.auth_routes import get_auth, json_body, err

api_bp = Blueprint('api', __name__)

# --- REGEX & COSTANTI COMANDI ---
CID_RE = re.compile(r'^[a-z0-9][a-z0-9_\-]{0,63}$')
SERVICE_RE = re.compile(r'^[A-Za-z0-9][A-Za-z0-9_.@\-]{0,63}$')
PROFILE_KEY_RE = re.compile(r'^[A-Za-z0-9_\-]{1,32}$')
TIME_RE = re.compile(r'^([01]\d|2[0-3]):[0-5]\d$')

SIMPLE_COMMANDS = {'TG:ON', 'TG:OFF'}
PRIVILEGED_COMMANDS = {'REBOOT', 'RESET_HAT', 'UPDATE_AGENT'}
SERVICE_ACTIONS = {'start', 'stop', 'restart'}

def known_profile_keys(cid=None):
    keys = {'A', 'B'}
    healths = [state.device_health.get(cid)] if cid else list(state.device_health.values())
    for h in healths:
        profiles = (h or {}).get('profiles') or {}
        if isinstance(profiles, dict):
            keys.update(str(k) for k in profiles.keys() if PROFILE_KEY_RE.match(str(k)))
    return keys - PRIVILEGED_COMMANDS - SIMPLE_COMMANDS

# --- ROTTE DATI GENERALI & LOGS ---

@api_bp.route('/api/clients')
def get_clients():
    if os.path.exists(CLIENTS_PATH):
        with open(CLIENTS_PATH, 'r') as f:
            return jsonify(json.load(f))
    return jsonify([])

@api_bp.route('/api/logs')
def get_logs():
    conn = sqlite3.connect(DB_PATH, timeout=10)
    c = conn.cursor()
    c.execute("""SELECT timestamp, client_id, protocol, source_id, target, slot, duration, ber, source_ext, rssi, source_conn, ysf_mode 
                 FROM radio_logs ORDER BY id DESC LIMIT 60""")
    logs = c.fetchall()
    conn.close()
    return jsonify(logs)

@api_bp.route('/api/states', methods=['GET'])
def get_states():
    clean_versions = {}
    for c, d in state.node_versions.items():
        clean_versions[c] = {k: v for k, v in d.items() if not k.startswith('_')}

    enriched_gateway_states = dict(state.gateway_states)
    
    for cid, confs in state.device_configs.items():
        if 'dmrgateway' in confs:
            dmr_conf = confs['dmrgateway']
            if isinstance(dmr_conf, dict) and 'raw_text' in dmr_conf:
                raw = dmr_conf['raw_text']
                active_dmr_nets = []
                
                for i in range(1, 6):
                    section_name = f"[DMR Network {i}]"
                    if section_name in raw:
                        block = raw.split(section_name)[1].split('[')[0]
                        if re.search(r'^Enabled\s*=\s*1', block, re.MULTILINE | re.IGNORECASE):
                            m_name = re.search(r'^Name\s*=\s*(.+)', block, re.MULTILINE | re.IGNORECASE)
                            net_name = m_name.group(1).strip() if m_name else f"Net {i}"
                            active_dmr_nets.append(net_name)
                
                if active_dmr_nets:
                    if cid not in enriched_gateway_states:
                        enriched_gateway_states[cid] = {}
                    enriched_gateway_states[cid]['DMR_NETS'] = active_dmr_nets

    return jsonify({
        "states": state.client_states,
        "telemetry": state.client_telemetry,
        "health": state.device_health,
        "info": state.node_info,
        "general": state.node_general,
        "last_seen": state.seen_ages(),
        "uptime": int(time.time() - state.START_TIME),
        "versions": clean_versions,
        "gateway_states": enriched_gateway_states,
        "warnings": state.active_warnings
    })

@api_bp.route('/api/stats')
def get_stats():
    node = request.args.get('node', 'all').lower()
    
    conn = sqlite3.connect(DB_PATH, timeout=10)
    c = conn.cursor()
    
    node_filter = ""
    params = []
    if node != 'all':
        node_filter = " AND LOWER(client_id) = ?"
        params.append(node)
    
    c.execute(f"""SELECT target, COUNT(*) as cnt FROM radio_logs 
                 WHERE target NOT IN ('---', 'NET', '') 
                 AND timestamp >= date('now', 'localtime') AND timestamp < date('now', 'localtime', '+1 day'){node_filter} 
                 GROUP BY target ORDER BY cnt DESC LIMIT 5""", params)
    top_tgs = [{"target": row[0], "count": row[1]} for row in c.fetchall()]
    
    c.execute(f"""SELECT source_id, COUNT(*) as cnt FROM radio_logs 
                 WHERE source_id NOT LIKE '🌐%' 
                 AND timestamp >= date('now', 'localtime') AND timestamp < date('now', 'localtime', '+1 day'){node_filter} 
                 GROUP BY source_id ORDER BY cnt DESC LIMIT 5""", params)
    top_calls = [{"call": row[0], "count": row[1]} for row in c.fetchall()]
    
    c.execute(f"""SELECT AVG(duration) FROM radio_logs 
                 WHERE duration > 0.5 
                 AND timestamp >= date('now', 'localtime') AND timestamp < date('now', 'localtime', '+1 day'){node_filter}""", params)
    avg_dur = c.fetchone()[0]
    avg_dur = round(avg_dur, 1) if avg_dur else 0
    
    c.execute(f"SELECT COUNT(*) FROM radio_logs WHERE timestamp >= date('now', 'localtime') AND timestamp < date('now', 'localtime', '+1 day'){node_filter}", params)
    today_tx = c.fetchone()[0]
    
    conn.close()
    return jsonify({
        "top_tgs": top_tgs,
        "top_calls": top_calls,
        "avg_duration": avg_dur,
        "today_tx": today_tx
    })

# --- COMANDI NODO & RETE ---

@api_bp.route('/api/command', methods=['POST'])
def cmd():
    auth = get_auth()
    if not auth:
        return err("Non autenticato", 403)

    d = json_body()
    cid = str(d.get('clientId', '')).strip().lower()
    cmd_type = str(d.get('type', '')).strip()

    if not CID_RE.match(cid):
        return err("ID nodo non valido")
    if not node_allowed(auth['role'], auth['allowed_nodes'], cid):
        return err("Permesso negato per questo nodo.", 403)

    if cmd_type in PRIVILEGED_COMMANDS:
        if auth['role'] != 'admin':
            return err("Solo gli amministratori possono eseguire questo comando.", 403)
    elif cmd_type in SIMPLE_COMMANDS:
        pass
    elif cmd_type in known_profile_keys(cid):
        pass
    else:
        logger.warning(f"Comando non consentito da {auth['username']}: {cmd_type[:40]!r} -> {cid}")
        return err("Comando sconosciuto")

    if not mqtt_publish(f"servizi/{cid}/cmnd", cmd_type):
        return err("Broker MQTT non raggiungibile - comando non inviato", 503)

    audit(auth['username'], cid, cmd_type)
    state.client_telemetry[cid] = {"ts1": "🔄 Inviato...", "ts2": "🔄 Inviato...", "alt": ""}
    return jsonify({"success": True})

@api_bp.route('/api/global_command', methods=['POST'])
def global_cmd():
    auth = get_auth()
    if not auth or auth['role'] != 'admin':
        return err("Azione riservata agli amministratori!", 403)

    cmd_type = str(json_body().get('type', '')).strip()
    if cmd_type not in known_profile_keys():
        return err("Profilo sconosciuto")

    clients_list = []
    if os.path.exists(CLIENTS_PATH):
        with open(CLIENTS_PATH, 'r') as f:
            clients_list = json.load(f)

    sent, failed = 0, 0
    for client in clients_list:
        cid = str(client.get('id', '')).lower()
        if not CID_RE.match(cid):
            continue
        if mqtt_publish(f"servizi/{cid}/cmnd", cmd_type):
            audit(auth['username'], cid, f"GLOBAL_OVERRIDE_{cmd_type}")
            sent += 1
        else:
            failed += 1
    if failed and not sent:
        return err("Broker MQTT non raggiungibile", 503)
    return jsonify({"success": True, "sent": sent, "failed": failed})

@api_bp.route('/api/service_control', methods=['POST'])
def service_control():
    auth = get_auth()
    if not auth or auth['role'] != 'admin':
        return err("Non autorizzato", 403)

    d = json_body()
    cid = str(d.get('clientId', '')).strip().lower()
    action = str(d.get('action', '')).strip().lower()
    service = str(d.get('service', '')).strip()
    if not CID_RE.match(cid):
        return err("ID nodo non valido")
    if action not in SERVICE_ACTIONS:
        return err("Azione servizio non valida")
    if not SERVICE_RE.match(service):
        return err("Nome servizio non valido")

    if not mqtt_publish(f"devices/{cid}/control", f"{action}:{service}"):
        return err("Broker MQTT non raggiungibile", 503)
    audit(auth['username'], cid, f"SVC_{action.upper()}_{service}")
    return jsonify({"success": True})

@api_bp.route('/api/update_nodes', methods=['POST'])
def update_nodes():
    auth = get_auth()
    if not auth or auth['role'] != 'admin':
        return err("Non autorizzato", 403)
    if not mqtt_publish("devices/control/request", "update"):
        return err("Broker MQTT non raggiungibile", 503)
    logger.info(f"📢 REQ CONFIG inviata a tutta la flotta da {auth['username']}")
    audit(auth['username'], '*', 'REQ_CONFIG_ALL')
    return jsonify({"success": True})

# --- CONFIGURAZIONI & FILE .INI ---

@api_bp.route('/api/ui_config', methods=['GET'])
def get_ui_config():
    try:
        cfg = read_config()
        ui_cfg = cfg.get("ui", {
            "profileA_Name": "PROFILE A",
            "profileA_Color": "#3498db",
            "profileB_Name": "PROFILE B",
            "profileB_Color": "#9b59b6"
        })
        return jsonify(ui_cfg)
    except Exception as e:
        logger.error(f"ui_config error: {e}")
        return jsonify({"error": "Configurazione non disponibile"}), 500

@api_bp.route('/api/config', methods=['GET'])
def get_config_api():
    auth = get_auth()
    if not auth or auth['role'] != 'admin':
        return err("Non autorizzato", 403)
    cfg = read_config()
    return jsonify({
        "update_schedule": cfg.get("update_schedule", "03:00"),
        "url_dmr": cfg.get("id_urls", {}).get("dmr", ""),
        "url_nxdn": cfg.get("id_urls", {}).get("nxdn", ""),
        "log_max_mb": cfg.get("log_max_mb", 50),
        "log_backup_count": cfg.get("log_backup_count", 10)
    })

@api_bp.route('/api/config', methods=['POST'])
def save_config_api():
    auth = get_auth()
    if not auth or auth['role'] != 'admin':
        return err("Non autorizzato", 403)

    d = json_body()
    schedule = str(d.get("update_schedule", "03:00")).strip()
    url_dmr = str(d.get("url_dmr", "")).strip()
    url_nxdn = str(d.get("url_nxdn", "")).strip()
    
    try:
        log_max_mb = int(d.get("log_max_mb", 50))
        log_backup_count = int(d.get("log_backup_count", 10))
    except ValueError:
        return err("Parametri di rotazione log non validi")

    if not TIME_RE.match(schedule):
        return err("Formato orario non valido (usa HH:MM)")
    for u in (url_dmr, url_nxdn):
        if not u.lower().startswith(('http://', 'https://')):
            return err("Gli URL devono iniziare con http:// o https://")

    cfg = read_config()
    cfg["update_schedule"] = schedule
    cfg.setdefault("id_urls", {})
    cfg["id_urls"]["dmr"] = url_dmr
    cfg["id_urls"]["nxdn"] = url_nxdn
    cfg["log_max_mb"] = log_max_mb
    cfg["log_backup_count"] = log_backup_count
    
    write_config(cfg)
    audit(auth['username'], '-', 'EDIT_SERVER_CONFIG')
    return jsonify({"success": True})

@api_bp.route('/api/config_file/<cid>/<service>', methods=['GET'])
def get_config_file(cid, service):
    auth = get_auth()
    if not auth or auth['role'] != 'admin':
        return err("Non autorizzato", 403)
    cid = cid.lower()
    service = service.lower()
    if not CID_RE.match(cid) or not SERVICE_RE.match(service):
        return err("Parametri non validi")
    config_data = state.device_configs.get(cid, {}).get(service)
    if not config_data:
        return err("Configurazione non ancora ricevuta. Invia un comando di richiesta aggiornamento.", 404)
    return jsonify({"success": True, "data": config_data})

@api_bp.route('/api/config_file', methods=['POST'])
def save_config_file():
    auth = get_auth()
    if not auth or auth['role'] != 'admin':
        return err("Non autorizzato", 403)

    d = json_body()
    cid = str(d.get('clientId', '')).strip().lower()
    service = str(d.get('service', '')).strip().lower()
    new_config = d.get('config_data')
    if not CID_RE.match(cid) or not SERVICE_RE.match(service):
        return err("Parametri non validi")
    if not isinstance(new_config, dict) or not isinstance(new_config.get('raw_text'), str):
        return err("Payload configurazione non valido")
    if len(new_config['raw_text']) > 65536:
        return err("File di configurazione troppo grande (max 64 KB)")

    if not mqtt_publish(f"devices/{cid}/config_set/{service}", json.dumps(new_config)):
        return err("Broker MQTT non raggiungibile", 503)
    audit(auth['username'], cid, f"EDIT_CONFIG_{service.upper()}")
    return jsonify({"success": True})

# --- AGGIORNAMENTO SERVER OTA ---

@api_bp.route('/api/server_update/check', methods=['GET'])
def check_server_update():
    auth = get_auth()
    if not auth or auth['role'] != 'admin':
        return err("Non autorizzato", 403)
    
    try:
        subprocess.run(['git', 'fetch'], timeout=10, cwd=BASE_DIR)
        local_hash = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=BASE_DIR).decode('utf-8').strip()
        remote_hash = subprocess.check_output(['git', 'rev-parse', '@{u}'], cwd=BASE_DIR).decode('utf-8').strip()
        update_available = local_hash != remote_hash
        return jsonify({"success": True, "update_available": update_available})
    except Exception as e:
        logger.error(f"Errore controllo aggiornamenti server: {e}")
        return jsonify({"success": False, "error": "Impossibile verificare aggiornamenti"})

@api_bp.route('/api/server_update/apply', methods=['POST'])
def apply_server_update():
    auth = get_auth()
    if not auth or auth['role'] != 'admin':
        return err("Non autorizzato", 403)
    
    try:
        audit(auth['username'], 'SERVER', 'SERVER_OTA_UPDATE')
        subprocess.run(['git', 'pull', '--ff-only'], timeout=30, cwd=BASE_DIR, check=True)
        def restart_server():
            time.sleep(2)
            os._exit(1)
        import threading
        threading.Thread(target=restart_server, daemon=True).start()
        return jsonify({"success": True})
    except subprocess.CalledProcessError as e:
        logger.error(f"Errore durante git pull: {e}")
        return err("Conflitto o errore durante il git pull.")
    except Exception as e:
        logger.error(f"Errore aggiornamento server: {e}")
        return err(str(e))

# --- NOTIFICHE WEBPUSH VAPID ---

@api_bp.route('/api/vapid_public_key')
def get_vapid_key():
    return jsonify({"public_key": config.get('webpush', {}).get('vapid_public_key', '')})

@api_bp.route('/api/subscribe', methods=['POST'])
def subscribe_push():
    auth = get_auth()
    if not auth:
        return err("Non autorizzato", 403)
    sub_data = json_body()
    if not sub_data.get('endpoint'):
        return err("Sottoscrizione non valida")
    with closing(db_connect()) as conn:
        conn.execute("""INSERT INTO push_subscriptions (username, subscription) VALUES (?, ?)
                        ON CONFLICT(subscription) DO UPDATE SET username = excluded.username""",
                     (auth['username'], json.dumps(sub_data)))
        conn.commit()
    return jsonify({"success": True})

# --- ASSET PWA / OFFLINE ---

@api_bp.route('/manifest.json')
def serve_manifest():
    return send_from_directory(BASE_DIR, 'manifest.json')

@api_bp.route('/sw.js')
def serve_sw():
    resp = send_from_directory(BASE_DIR, 'sw.js', mimetype='application/javascript')
    resp.headers['Cache-Control'] = 'no-cache'
    resp.headers['Service-Worker-Allowed'] = '/'
    return resp

@api_bp.route('/icon-512.png')
def serve_icon():
    return send_from_directory(BASE_DIR, 'icon-512.png')
