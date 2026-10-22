from flask import Flask, render_template, request, session, jsonify, send_from_directory
from paho.mqtt import client as mqtt_client
from werkzeug.security import generate_password_hash, check_password_hash
import json
import os
import sqlite3
import urllib.request
import threading
import time
import logging
import re
import queue
import hashlib
import secrets
import subprocess
from contextlib import closing
from pywebpush import webpush, WebPushException
from logging.handlers import RotatingFileHandler
from flask_socketio import SocketIO, emit

# --- DYNAMIC BASE PATH ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# --- PATHS ---
DB_PATH = os.path.join(BASE_DIR, 'monitor.db')
CACHE_FILE = os.path.join(BASE_DIR, 'telemetry_cache.json')
CONFIG_PATH = os.path.join(BASE_DIR, 'config.json')
DMR_IDS_PATH = os.path.join(BASE_DIR, 'dmrid.dat')
NXDN_IDS_PATH = os.path.join(BASE_DIR, 'nxdn.csv')
CLIENTS_PATH = os.path.join(BASE_DIR, 'clients.json')
LOG_FILE = os.path.join(BASE_DIR, 'fleet_console.log')

# --- CONFIG LOADER (INIZIALE PER IL LOGGING) ---
config_lock = threading.Lock()

def read_config():
    try:
        with open(CONFIG_PATH, 'r') as f:
            return json.load(f)
    except Exception:
        return {}

def write_config(cfg):
    tmp = CONFIG_PATH + '.tmp'
    with config_lock:
        with open(tmp, 'w') as f:
            json.dump(cfg, f, indent=4)
        try:
            os.chmod(tmp, os.stat(CONFIG_PATH).st_mode & 0o777)
        except OSError:
            pass
        os.replace(tmp, CONFIG_PATH)

config = read_config()
web_cfg = config.get('web', {})

# --- LOGGING CONFIGURATION DINAMICA ---
log_max_mb = int(config.get('log_max_mb', 50))
log_backup_count = int(config.get('log_backup_count', 10))
max_bytes_val = log_max_mb * 1024 * 1024 if log_max_mb > 0 else 0

logging.basicConfig(
    handlers=[
        RotatingFileHandler(LOG_FILE, maxBytes=max_bytes_val, backupCount=log_backup_count),
        logging.StreamHandler()
    ],
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger("FleetHub")
logging.getLogger('werkzeug').setLevel(logging.ERROR)

def get_secret_key():
    key = os.environ.get('FLEET_SECRET_KEY') or config.get('secret_key')
    if not key or key == 'ari_fvg_secret_ultra_secure':
        key = secrets.token_hex(32)
        config['secret_key'] = key
        try:
            write_config(config)
            logger.warning("🔑 Nuova secret_key generata e salvata in config.json (le sessioni esistenti sono state invalidate).")
        except Exception as e:
            logger.error(f"Impossibile salvare la secret_key in config.json ({e}): sarà valida solo fino al riavvio.")
    return key

def init_db():
    conn = sqlite3.connect(DB_PATH, timeout=10)
    c = conn.cursor()

    c.execute('PRAGMA journal_mode=WAL;')

    c.execute('''CREATE TABLE IF NOT EXISTS radio_logs
                 (id INTEGER PRIMARY KEY AUTOINCREMENT, timestamp DATETIME, client_id TEXT, 
                  source_id TEXT, target TEXT, slot INTEGER, duration REAL, ber REAL, loss REAL)''')
    try:
        c.execute("ALTER TABLE radio_logs ADD COLUMN protocol TEXT DEFAULT 'DMR'")
    except sqlite3.OperationalError: pass

    try:
        c.execute("ALTER TABLE radio_logs ADD COLUMN source_ext TEXT DEFAULT ''")
    except sqlite3.OperationalError: pass
    
    try:
        c.execute("ALTER TABLE radio_logs ADD COLUMN rssi REAL DEFAULT 0")
    except sqlite3.OperationalError: pass

    try:
        c.execute("ALTER TABLE radio_logs ADD COLUMN source_conn TEXT DEFAULT ''")
    except sqlite3.OperationalError: pass
    
    try:
        c.execute("ALTER TABLE radio_logs ADD COLUMN ysf_mode TEXT DEFAULT ''")
    except sqlite3.OperationalError: pass

    c.execute('''CREATE TABLE IF NOT EXISTS users
                 (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password_hash TEXT, 
                  role TEXT, allowed_nodes TEXT)''')

    c.execute('''CREATE TABLE IF NOT EXISTS push_subscriptions
             (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, subscription TEXT UNIQUE)''')

    c.execute('''CREATE TABLE IF NOT EXISTS audit_logs
                 (id INTEGER PRIMARY KEY AUTOINCREMENT, timestamp DATETIME, username TEXT, 
                  client_id TEXT, command TEXT)''')

    c.execute("CREATE INDEX IF NOT EXISTS idx_radio_logs_ts ON radio_logs(timestamp)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_radio_logs_client_ts ON radio_logs(client_id, timestamp)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_audit_logs_ts ON audit_logs(timestamp)")

    c.execute("SELECT COUNT(*) FROM users")
    if c.fetchone()[0] == 0:
        adm_cfg = config.get("web_admin", {})
        def_user = adm_cfg.get("default_user", "admin")
        def_pass = adm_cfg.get("default_pass", "")
        generated = False
        if not def_pass or def_pass == "admin123":
            def_pass = secrets.token_urlsafe(9)
            generated = True

        c.execute("INSERT INTO users (username, password_hash, role, allowed_nodes) VALUES (?,?,?,?)",
                  (def_user, generate_password_hash(def_pass), 'admin', 'all'))
        if generated:
            logger.warning(f">>> DEFAULT USER CREATED - User: {def_user} | Temporary password: {def_pass} | CHANGE IT NOW <<<")
        else:
            logger.info(f">>> DEFAULT USER CREATED - User: {def_user} (password from config.json) <<<")

    conn.commit()
    conn.close()

init_db()

# --- ID DATABASE LOADING ---
user_db = {}
nxdn_db = {}

def load_ids():
    global user_db, nxdn_db
    new_dmr, new_nxdn = {}, {}

    if os.path.exists(DMR_IDS_PATH):
        with open(DMR_IDS_PATH, 'r', encoding='utf-8', errors='ignore') as f:
            for l in f:
                l = l.replace('"', '')
                if ',' in l: p = l.strip().split(',')
                elif '\t' in l: p = l.strip().split('\t')
                elif ';' in l: p = l.strip().split(';')
                else: p = l.strip().split()

                if len(p) >= 2 and p[0].strip().isdigit():
                    new_dmr[p[0].strip()] = p[1].strip()

    if os.path.exists(NXDN_IDS_PATH):
        with open(NXDN_IDS_PATH, 'r', encoding='utf-8', errors='ignore') as f:
            for l in f:
                sep = '\t' if '\t' in l else (',' if ',' in l else ';')
                p = l.strip().split(sep)
                if len(p) >= 2 and p[0].strip().isdigit():
                    new_nxdn[p[0].strip()] = p[1].strip()

    if new_dmr: user_db = new_dmr
    if new_nxdn: nxdn_db = new_nxdn

load_ids()

def get_call(id, proto="DMR"):
    sid = str(id)
    if proto == "NXDN": return nxdn_db.get(sid, sid)
    return user_db.get(sid, sid)

def save_cache(data):
    try:
        tmp = CACHE_FILE + '.tmp'
        with open(tmp, 'w') as f: json.dump(data, f)
        os.replace(tmp, CACHE_FILE)
    except Exception as e:
        logger.error(f"Errore salvataggio cache telemetria: {e}")
    notify_update()

def save_to_sqlite(client_id, data, protocol="DMR"):
    conn = sqlite3.connect(DB_PATH, timeout=10)
    c = conn.cursor()
    
    rssi_val = 0
    if 'rssi' in data and isinstance(data['rssi'], dict):
        rssi_val = data['rssi'].get('ave', 0)
    elif 'rssi' in data:
        rssi_val = data['rssi']
        
    c.execute("INSERT INTO radio_logs (timestamp, client_id, protocol, source_id, target, slot, duration, ber, source_ext, rssi, source_conn, ysf_mode) VALUES (datetime('now', 'localtime'), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
              (client_id, protocol, str(data.get('src_id', '---')), str(data.get('dst_id', '---')), data.get('slot', 0), round(data.get('duration', 0), 1), round(data.get('ber', 0), 2), str(data.get('src_ext', '')), rssi_val, str(data.get('source', '')), str(data.get('mode', ''))))
    conn.commit()
    conn.close()
    notify_update('log_aggiornato')

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins=web_cfg.get('cors_origins', '*'))
app.secret_key = get_secret_key()
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE='Lax',
    SESSION_COOKIE_SECURE=bool(web_cfg.get('cookie_secure', False)),
    PERMANENT_SESSION_LIFETIME=int(web_cfg.get('session_hours', 12)) * 3600,
)

# --- NOTIFICHE WEBSOCKET ---
NOTIFY_DELAY = 0.3
_notify_lock = threading.Lock()
_notify_pending = set()

def notify_update(event='dati_aggiornati'):
    with _notify_lock:
        if event in _notify_pending:
            return
        _notify_pending.add(event)

    def _fire():
        with _notify_lock:
            _notify_pending.discard(event)
        try:
            socketio.emit(event)
        except Exception as e:
            logger.error(f"Errore emit WebSocket '{event}': {e}")

    timer = threading.Timer(NOTIFY_DELAY, _fire)
    timer.daemon = True
    timer.start()

client_states = {}
device_configs = {}
client_telemetry = {}
last_notified_errors = {}
device_health = {}
last_seen_reflector = {}
node_info = {}
node_general = {}
node_versions = {}

if os.path.exists(CACHE_FILE):
    try:
        with open(CACHE_FILE, 'r') as f: client_telemetry = json.load(f)
    except: client_telemetry = {}

active_calls = {}

START_TIME = time.time()
last_seen = {}
last_seen_lock = threading.Lock()

def touch_seen(cid, kind):
    with last_seen_lock:
        last_seen.setdefault(cid, {})[kind] = time.time()

def seen_ages():
    now = time.time()
    with last_seen_lock:
        return {cid: {k: round(now - ts, 1) for k, ts in kinds.items()} for cid, kinds in last_seen.items()}

def seed_last_seen():
    try:
        with closing(sqlite3.connect(DB_PATH, timeout=10)) as conn:
            rows = conn.execute("""SELECT LOWER(client_id), MAX(timestamp) FROM radio_logs
                                   WHERE source_id NOT LIKE '🌐%' GROUP BY LOWER(client_id)""").fetchall()
        for cid, ts in rows:
            try:
                parsed = time.mktime(time.strptime(ts, '%Y-%m-%d %H:%M:%S'))
            except (TypeError, ValueError):
                continue
            with last_seen_lock:
                last_seen.setdefault(cid, {}).setdefault('mmdvm', parsed)
    except Exception as e:
        logger.error(f"seed_last_seen: {e}")

seed_last_seen()

# --- MQTT CALLBACKS ---
mqtt_connected_status = False

def on_connect(client, userdata, flags, reason_code, properties=None):
    global mqtt_connected_status
    if reason_code == 0:
        mqtt_connected_status = True
        logger.info("✅ Successfully connected to MQTT Broker! Subscribing to topics...")
        socketio.emit('mqtt_status', {'connected': True})
        
        default_topics = [
            "servizi/+/stat", "dmr-gateway/+/json", "devices/+/services",
            "nxdn-gateway/+/json", "ysf-gateway/+/json", "p25-gateway/+/json",
            "dstar-gateway/+/json", "mmdvm/+/json", "data/#"
        ]
        
        topics_list = config.get('mqtt', {}).get('topics', default_topics)
        subscribe_list = [(topic, 0) for topic in topics_list]
        subscribe_list.append(("+/+/log", 0))  # Ascolto dinamico dei log
        
        client.subscribe(subscribe_list)
        logger.info(f"Subscribed to {len(subscribe_list)} MQTT topics.")
    else:
        mqtt_connected_status = False
        socketio.emit('mqtt_status', {'connected': False})
        logger.error(f"❌ MQTT Connection Error. Reason code: {reason_code}")

def on_disconnect(client, userdata, disconnect_flags, reason_code, properties=None):
    global mqtt_connected_status
    mqtt_connected_status = False
    socketio.emit('mqtt_status', {'connected': False})
    logger.warning(f"⚠️ MQTT Disconnection detected! Reason code: {reason_code}. Attempting automatic reconnection...")

@socketio.on('connect')
def handle_connect():
    emit('mqtt_status', {'connected': mqtt_connected_status})

def on_message(client, userdata, msg):
    try:
        topic = msg.topic
        payload = msg.payload.decode('utf-8', errors='replace').strip()
        parts = topic.split('/')
        if len(parts) < 2: return
        
        cid = parts[1].lower()
        p0 = parts[0].lower().replace('-', '')
        p2 = parts[2].lower().replace('-', '') if len(parts) > 2 else ""

        # --- LOG MANAGEMENT (ESTRAZIONE VERSIONI E GIT ID) ---
        if len(parts) >= 3 and parts[2].lower() == 'log':
            if cid not in node_versions:
                node_versions[cid] = {}
            
            m_fw = re.search(r'description:\s*(MMDVM[^\n\r]+)', payload, re.IGNORECASE)
            if m_fw:
                node_versions[cid]["Firmware MMDVM"] = m_fw.group(1).strip()
                notify_update()
                
            m_sw1 = re.search(r'([A-Za-z0-9_]+)-([a-zA-Z0-9.\-]+)\s+is starting', payload, re.IGNORECASE)
            if m_sw1:
                prog = m_sw1.group(1)
                node_versions[cid][prog] = m_sw1.group(2).strip()
                node_versions[cid]["_last_prog"] = prog
                notify_update()

            m_sw2 = re.search(r'([A-Za-z0-9_]+)\s+version\s+([a-zA-Z0-9.\-\s#]+)', payload, re.IGNORECASE)
            if m_sw2:
                prog = m_sw2.group(1)
                if prog.lower() not in ['protocol', 'firmware', 'mmdvm firmware']:
                    ver = m_sw2.group(2).replace("is starting", "").strip()
                    node_versions[cid][prog] = ver
                    node_versions[cid]["_last_prog"] = prog
                    notify_update()

            m_git = re.search(r'Built .*?\(GitID #([0-9a-fA-F]+)\)', payload, re.IGNORECASE)
            if m_git:
                git_id = m_git.group(1)
                last_prog = node_versions[cid].get("_last_prog")
                if last_prog and last_prog in node_versions[cid]:
                    if "GitID" not in node_versions[cid][last_prog]:
                        node_versions[cid][last_prog] += f" (GitID #{git_id})"
                        notify_update()
            return

        if p0 == 'mmdvm':
            touch_seen(cid, 'mmdvm')
        elif p0 in ('dmrgateway', 'nxdngateway', 'ysfgateway', 'p25gateway', 'dstargateway'):
            touch_seen(cid, 'gateway')
        elif p0 == 'devices' and p2 == 'services':
            touch_seen(cid, 'health')

        if p0 == 'data' and len(parts) >= 4 and parts[3].lower() == 'full_config':
            cid_conf = parts[1].lower()
            svc_name = parts[2].lower()
            if cid_conf not in device_configs:
                device_configs[cid_conf] = {}
            try:
                device_configs[cid_conf][svc_name] = json.loads(payload)
                logger.debug(f"Configuration saved for {cid_conf} -> {svc_name}")
            except Exception as e:
                logger.error(f"Error parsing config JSON: {e}")

        elif p0 == 'servizi':
            client_states[cid] = payload
            notify_update()
            
            state_up = payload.upper()
            if state_up.startswith('OFFLINE'):
                if not msg.retain and last_notified_errors.get(f"{cid}_NODE") != 'OFFLINE':
                    broadcast_push_notification(f"💀 NODE OFFLINE: {cid.upper()}", "Connection lost with broker.", cid=cid)
                    last_notified_errors[f"{cid}_NODE"] = 'OFFLINE'
            elif state_up.startswith('ONLINE'):
                if last_notified_errors.get(f"{cid}_NODE") == 'OFFLINE':
                    broadcast_push_notification(f"🌤️ NODE ONLINE: {cid.upper()}", "Node is back online.", cid=cid)
                    del last_notified_errors[f"{cid}_NODE"]

            if not state_up.startswith('OFF') and state_up != '':
                tel = client_telemetry.get(cid, {})
                if isinstance(tel, dict) and '🔄' in str(tel.get('ts1', '')):
                    client_telemetry[cid] = {"ts1": "Waiting...", "ts2": "Waiting...", "alt": ""}
                    save_cache(client_telemetry)

        elif p0 == 'devices' and len(parts) >= 3 and p2 == 'services':
            try:
                data = json.loads(payload)
                new_health = {
                    "cpu": round(data.get("cpu_usage_percent", 0), 1),
                    "temp": round(data.get("cpu_temp", 0), 1),
                    "ram": round(data.get("memory_usage_percent", 0), 1),
                    "disk": round(data.get("disk_usage_percent", 0), 1),
                    "processes": data.get("processes", {}),
                    "files": data.get("files", data.get("config_files", [])),
                    "file_names": data.get("file_names", []),
                    "profiles": data.get("profiles", {"A": "PROFILE A", "B": "PROFILE B"}),
                    "interval": data.get("update_interval"),
                    "uptime": data.get("uptime_seconds", 0)
                }
                bin_versions = data.get("versions", {})
                if bin_versions:
                    if cid not in node_versions:
                        node_versions[cid] = {}
                        
                    keys_to_remove = [k for k in node_versions[cid].keys() 
                                      if k not in bin_versions and k not in ["Firmware MMDVM", "_last_prog"]]
                    for k in keys_to_remove:
                        del node_versions[cid][k]
                        
                    for prog_name, prog_ver in bin_versions.items():
                        node_versions[cid][prog_name] = prog_ver

                health_changed = device_health.get(cid) != new_health
                device_health[cid] = new_health
                if health_changed:
                    notify_update()

                processes = data.get("processes", {})
                for svc_name, svc_status in processes.items():
                    status_key = f"{cid}_{svc_name}"
                    s_lower = svc_status.lower()
                    if s_lower in ["error", "stopped", "failed"]:
                        if last_notified_errors.get(status_key) != s_lower:
                            msg_err = f"Service {svc_name} KO ({svc_status})"
                            if s_lower == "error": msg_err += " - Auto-healing failed! ⚠️"
                            broadcast_push_notification(f"🚨 ALARM: {cid.upper()}", msg_err, cid=cid)
                            last_notified_errors[status_key] = s_lower
                    elif s_lower == "online" and status_key in last_notified_errors:
                        broadcast_push_notification(f"✅ RESTORED: {cid.upper()}", f"Service {svc_name} back ONLINE.", cid=cid)
                        del last_notified_errors[status_key]

            except Exception as e: 
                logger.error(f"Error parsing health data: {e}")

        elif len(parts) >= 4 and p0 == 'data' and p2 in ('mmdvm', 'mmdvmhost') and parts[3].lower() == 'info':
            try:
                cid = parts[1].lower()
                data = json.loads(payload)
                
                tx = data.get("TXFrequency", "0")
                rx = data.get("RXFrequency", "0")
                lat = data.get("Latitude", "0.0")
                lon = data.get("Longitude", "0.0")
                loc = data.get("Location", "Sconosciuta")
                
                def format_freq(f):
                    if str(f).isdigit() and int(f) > 0:
                        hz = int(f)
                        mhz, frac = divmod(hz, 1000000)
                        dec = f"{frac:06d}"
                        if dec.endswith("0"):
                            dec = dec[:-1]
                        return f"{mhz}.{dec} MHz"
                    return str(f)
                    
                node_info[cid] = {
                    "tx": format_freq(tx), 
                    "rx": format_freq(rx),
                    "lat": lat,
                    "lon": lon,
                    "loc": loc
                }
                notify_update()
            except Exception as e:
                logger.error(f"Error parsing MMDVMHost info for {cid}: {e}")

        elif len(parts) >= 4 and p0 == 'data' and p2 in ('mmdvm', 'mmdvmhost') and parts[3].lower() == 'general':
            try:
                cid = parts[1].lower()
                data = json.loads(payload)
                callsign = data.get("Callsign", "")
                radio_id = data.get("Id", "")
                duplex = data.get("Duplex", "1")
                
                if callsign:
                    node_general[cid] = {"callsign": callsign, "radio_id": radio_id, "duplex": str(duplex)}
                    notify_update()
            except Exception as e:
                logger.error(f"Error parsing MMDVMHost general for {cid}: {e}")

        elif p0 in ['dmrgateway', 'nxdngateway', 'ysfgateway', 'p25gateway', 'dstargateway']:
            data = json.loads(payload)
            proto = "DMR"
            if "nxdn" in p0: proto = "NXDN"
            elif "ysf" in p0: proto = "YSF"
            elif "p25" in p0: proto = "P25"
            elif "dstar" in p0: proto = "D-STAR"
            
            m = ""
            if 'status' in data: 
                m = data['status'].get('message', '')
            elif 'link' in data:
                l = data['link']
                dest = str(l.get('reflector') or l.get('talkgroup') or '---').strip()
                action = l.get('action')
                if action == 'linking': last_seen_reflector[f"{cid}_{proto}"] = dest
                elif action == 'unlinking': last_seen_reflector[f"{cid}_{proto}"] = "---"
                m = f"{'Link' if action=='linking' else 'Unlinked'} {dest}"
            
            if m: save_to_sqlite(cid, {'src_id': "🌐 " + m, 'dst_id': 'NET'}, protocol=proto)

        elif parts[0] == 'mmdvm':
            data = json.loads(payload)
            if cid not in active_calls: active_calls[cid] = {}
            if cid not in client_telemetry or not isinstance(client_telemetry.get(cid), dict):
                client_telemetry[cid] = {"ts1": "Waiting...", "ts2": "Waiting...", "alt": "", "idle": True}

            if 'MMDVM' in data and data['MMDVM'].get('mode') == 'idle':
                client_telemetry[cid]["idle"] = True
                save_cache(client_telemetry)
                return 

            client_telemetry[cid]["idle"] = False

            if 'DMR' in data:
                d = data['DMR']
                act = d.get('action')
                sk = f"ts{d.get('slot', 1)}"
                if act in ['start', 'late_entry']:
                    src = get_call(d.get('src_id'))
                    dst = str(d.get('dst_id'))
                    
                    active_calls[cid][sk] = {
                        'src': src, 
                        'dst': dst,
                        'slot': d.get('slot', 1),
                        'ext': str(d.get('src_ext', '')),
                        'source': str(d.get('source', '')),
                        'mode': str(d.get('mode', ''))
                    }
                    
                    client_telemetry[cid]["alt"] = ""
                    client_telemetry[cid][sk] = f"🎙️ {src} ➔ TG {dst}"
                    notify_update()
                    
                elif act in ['end', 'lost']:
                    info = active_calls[cid].get(sk, {'src': '---', 'dst': '---', 'slot': d.get('slot', 1), 'ext': '', 'source': '', 'mode': ''})
                    
                    d.update({
                        'src_id': info['src'], 
                        'dst_id': info['dst'],
                        'slot': info['slot'],
                        'src_ext': info['ext'],
                        'source': info['source'],
                        'mode': info['mode']
                    })
                    
                    save_to_sqlite(cid, d, protocol="DMR")
                    client_telemetry[cid][sk] = f"{'✅' if act=='end' else '⚠️'} {info['src']}"
                    save_cache(client_telemetry)
                    if sk in active_calls[cid]: del active_calls[cid][sk]
            else:
                for k, ico, name in [('NXDN','🟢','NXDN'),('YSF','🟣','YSF'),('P25','🟠','P25'),('D-Star','🔵','D-STAR')]:
                    if k in data:
                        p = data[k]
                        act = p.get('action')
                        
                        if act == 'start':
                            if k == 'NXDN': src = get_call(p.get('src_id', '---'), 'NXDN')
                            elif k == 'P25': src = get_call(p.get('src_id', '---'), 'DMR')
                            else: src = str(p.get('Callsign', p.get('src_callsign', p.get('src_info', p.get('src_id', '---')))))
                            
                            raw_target = str(p.get('dst_callsign', p.get('dst_id', ''))).strip()
                            
                            if name == 'D-STAR':
                                target = raw_target if raw_target else "---"
                            else:
                                target = raw_target if raw_target not in ['', '0', 'ALL'] else "---"
                            if name == 'YSF' and 'dg-id' in p:
                                dg_id = str(p.get('dg-id')).strip()
                                if dg_id:
                                    target = f"DG-ID {dg_id}" if target == "---" else f"{target} (DG {dg_id})"
                            
                            mem_ref = last_seen_reflector.get(f"{cid}_{name}", "---")
                            pack_ref = str(p.get('reflector', '')).strip()
                            
                            ref_slot = mem_ref if mem_ref != "---" else (pack_ref if pack_ref else "---")

                            active_calls[cid][k] = {'src': src, 'dst': target, 'slot': ref_slot, 'ext': str(p.get('src_ext', '')), 'source': str(p.get('source', '')), 'mode': str(p.get('mode', ''))}
                            
                            target_str = target if target != "---" else "NET"
                            client_telemetry[cid].update({"ts1":"","ts2":"","alt": f"{ico} {name}: {src} ➔ {target_str} ({ref_slot})"})
                            notify_update()
                        
                        elif act in ['end', 'lost']:
                            info = active_calls[cid].get(k, {'src': '---', 'dst': '---', 'slot': '---', 'ext': '', 'source': '', 'mode': ''})
                            
                            p.update({'src_id': info['src'], 'dst_id': info['dst'], 'slot': info['slot'], 'src_ext': info['ext'], 'source': info['source'], 'mode': info['mode']})
                            
                            save_to_sqlite(cid, p, protocol=name)
                            client_telemetry[cid]["alt"] = f"{'✅' if act=='end' else '⚠️'} {name}: {info['src']}"
                            save_cache(client_telemetry)
                            if k in active_calls[cid]: del active_calls[cid][k]
    except Exception as e: 
        logger.error(f"MQTT MSG ERROR: {e}")

mqtt_id = config.get('mqtt', {}).get('client_id', 'flask_backend_generic')
mqtt_backend = mqtt_client.Client(mqtt_client.CallbackAPIVersion.VERSION2, mqtt_id)
mqtt_backend.username_pw_set(config.get('mqtt', {}).get('user', ''), config.get('mqtt', {}).get('password', ''))
mqtt_backend.on_connect = on_connect
mqtt_backend.on_disconnect = on_disconnect
mqtt_backend.on_message = on_message
try:
    mqtt_backend.connect_async(config.get('mqtt', {}).get('broker', 'localhost'), config.get('mqtt', {}).get('port', 1883))
    mqtt_backend.loop_start()
    logger.info(f"Avvio connessione MQTT asincrona verso {config.get('mqtt', {}).get('broker')}...")
except Exception as e:
    logger.error(f"Errore critico nell'inizializzazione MQTT: {e}")

def mqtt_publish(topic, payload, qos=1):
    if not mqtt_connected_status:
        logger.warning(f"MQTT offline: pubblicazione su {topic} annullata")
        return False
    try:
        info = mqtt_backend.publish(topic, payload, qos=qos)
        if info.rc != mqtt_client.MQTT_ERR_SUCCESS:
            logger.warning(f"MQTT publish fallita su {topic} (rc={info.rc})")
            return False
        return True
    except Exception as e:
        logger.error(f"MQTT publish error su {topic}: {e}")
        return False

@app.after_request
def add_security_headers(resp):
    resp.headers.setdefault('X-Content-Type-Options', 'nosniff')
    resp.headers.setdefault('X-Frame-Options', 'DENY')
    resp.headers.setdefault('Referrer-Policy', 'same-origin')
    if request.path.startswith('/api/'):
        resp.headers['Cache-Control'] = 'no-store'
    return resp

def get_git_commit():
    try:
        # Legge i primi 7 caratteri dell'hash del commit corrente
        return subprocess.check_output(['git', 'rev-parse', '--short', 'HEAD']).decode('utf-8').strip()
    except Exception:
        return "sconosciuta"

SERVER_COMMIT = get_git_commit()

@app.route('/')
def index():
    return render_template('index.html', git_commit=SERVER_COMMIT)

@app.route('/api/clients')
def get_clients():
    if os.path.exists(CLIENTS_PATH):
        with open(CLIENTS_PATH, 'r') as f: return jsonify(json.load(f))
    return jsonify([])

@app.route('/api/logs')
def get_logs():
    conn = sqlite3.connect(DB_PATH, timeout=10)
    c = conn.cursor()
    c.execute("SELECT timestamp, client_id, protocol, source_id, target, slot, duration, ber, source_ext, rssi, source_conn, ysf_mode FROM radio_logs ORDER BY id DESC LIMIT 60")
    logs = c.fetchall()
    conn.close()
    return jsonify(logs)

@app.route('/api/states', methods=['GET'])
def get_states():
    clean_versions = {}
    for c, d in node_versions.items():
        clean_versions[c] = {k: v for k, v in d.items() if not k.startswith('_')}

    return jsonify({
        "states": client_states,
        "telemetry": client_telemetry,
        "health": device_health,
        "info": node_info,
        "general": node_general,
        "last_seen": seen_ages(),
        "uptime": int(time.time() - START_TIME),
        "versions": clean_versions
    })

@app.route('/api/stats')
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

# =====================================================================
#  AUTENTICAZIONE / VALIDAZIONE
# =====================================================================
VALID_ROLES = ('admin', 'operator')
USERNAME_RE = re.compile(r'^[A-Za-z0-9_.@\-]{3,32}$')
CID_RE = re.compile(r'^[a-z0-9][a-z0-9_\-]{0,63}$')
SERVICE_RE = re.compile(r'^[A-Za-z0-9][A-Za-z0-9_.@\-]{0,63}$')
PROFILE_KEY_RE = re.compile(r'^[A-Za-z0-9_\-]{1,32}$')
TIME_RE = re.compile(r'^([01]\d|2[0-3]):[0-5]\d$')
MIN_PASSWORD_LEN = 8

SIMPLE_COMMANDS = {'TG:ON', 'TG:OFF'}
PRIVILEGED_COMMANDS = {'REBOOT', 'RESET_HAT', 'UPDATE_AGENT'}
SERVICE_ACTIONS = {'start', 'stop', 'restart'}

def db_connect(row=False):
    conn = sqlite3.connect(DB_PATH, timeout=10)
    if row:
        conn.row_factory = sqlite3.Row
    return conn

def json_body():
    d = request.get_json(silent=True)
    return d if isinstance(d, dict) else {}

def err(msg, code=400):
    return jsonify({"success": False, "error": msg}), code

def pw_fingerprint(password_hash):
    return hashlib.sha256(password_hash.encode()).hexdigest()[:16]

def get_auth():
    username = session.get('user')
    if not session.get('logged_in') or not username:
        return None
    with closing(db_connect(row=True)) as conn:
        row = conn.execute("SELECT username, password_hash, role, allowed_nodes FROM users WHERE username = ?",
                           (username,)).fetchone()
    if not row or session.get('pv') != pw_fingerprint(row['password_hash']):
        session.clear()
        return None
    return {"username": row['username'], "role": row['role'], "allowed_nodes": row['allowed_nodes'] or ''}

def node_allowed(role, allowed_nodes, cid):
    if role == 'admin':
        return True
    allowed = (allowed_nodes or '').strip().lower()
    if allowed == 'all':
        return True
    return cid in [x.strip().lower() for x in allowed.split(',') if x.strip()]

def known_profile_keys(cid=None):
    keys = {'A', 'B'}
    healths = [device_health.get(cid)] if cid else list(device_health.values())
    for h in healths:
        profiles = (h or {}).get('profiles') or {}
        if isinstance(profiles, dict):
            keys.update(str(k) for k in profiles.keys() if PROFILE_KEY_RE.match(str(k)))
    return keys - PRIVILEGED_COMMANDS - SIMPLE_COMMANDS

def audit(username, client_id, command):
    try:
        with closing(db_connect()) as conn:
            conn.execute("INSERT INTO audit_logs (timestamp, username, client_id, command) VALUES (datetime('now','localtime'), ?, ?, ?)",
                         (username, client_id, command))
            conn.commit()
    except Exception as e:
        logger.error(f"Audit log error: {e}")

def count_admins(cursor, exclude_id=None):
    if exclude_id is None:
        cursor.execute("SELECT COUNT(*) FROM users WHERE role = 'admin'")
    else:
        cursor.execute("SELECT COUNT(*) FROM users WHERE role = 'admin' AND id != ?", (exclude_id,))
    return cursor.fetchone()[0]

def normalize_nodes(value):
    value = (value or '').strip().lower()
    if not value or value == 'all':
        return 'all'
    return ','.join(x.strip() for x in value.split(',') if x.strip())

LOGIN_MAX_FAILS = 5
LOGIN_WINDOW_SEC = 300
login_attempts = {}
login_lock = threading.Lock()

def client_ip():
    if config.get('web', {}).get('trust_proxy'):
        fwd = request.headers.get('X-Forwarded-For', '')
        if fwd:
            return fwd.split(',')[0].strip()
    return request.remote_addr or 'unknown'

def login_blocked(ip):
    now = time.time()
    with login_lock:
        fails = [x for x in login_attempts.get(ip, []) if now - x < LOGIN_WINDOW_SEC]
        if fails:
            login_attempts[ip] = fails
        else:
            login_attempts.pop(ip, None)
        return len(fails) >= LOGIN_MAX_FAILS

def login_register_fail(ip):
    with login_lock:
        login_attempts.setdefault(ip, []).append(time.time())

def login_reset(ip):
    with login_lock:
        login_attempts.pop(ip, None)

@app.route('/api/login', methods=['POST'])
def login():
    d = json_body()
    username, password = d.get('user'), d.get('pass')
    if not isinstance(username, str) or not isinstance(password, str) or not username or not password:
        return err("Missing credentials", 400)

    ip = client_ip()
    if login_blocked(ip):
        logger.warning(f"Login bloccato (troppi tentativi) da {ip}")
        return err("Too many failed attempts. Try again in a few minutes.", 429)

    with closing(db_connect(row=True)) as conn:
        user = conn.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()

    if user and check_password_hash(user['password_hash'], password):
        login_reset(ip)
        session.clear()
        session.permanent = True
        session['logged_in'] = True
        session['user'] = user['username']
        session['pv'] = pw_fingerprint(user['password_hash'])
        logger.info(f"Login OK: {user['username']} da {ip}")
        return jsonify({"success": True, "role": user['role'], "allowed_nodes": user['allowed_nodes']})

    login_register_fail(ip)
    logger.warning(f"Login fallito per {username[:32]!r} da {ip}")
    return jsonify({"success": False}), 401

@app.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({"success": True})

@app.route('/api/me')
def me():
    auth = get_auth()
    if not auth:
        return jsonify({"logged_in": False})
    return jsonify({"logged_in": True, "user": auth['username'], "role": auth['role'],
                    "allowed_nodes": auth['allowed_nodes']})

@app.route('/api/command', methods=['POST'])
def cmd():
    auth = get_auth()
    if not auth:
        return err("Not authenticated", 403)

    d = json_body()
    cid = str(d.get('clientId', '')).strip().lower()
    cmd_type = str(d.get('type', '')).strip()

    if not CID_RE.match(cid):
        return err("Invalid node id")
    if not node_allowed(auth['role'], auth['allowed_nodes'], cid):
        return err("You do not have permission for this node.", 403)

    if cmd_type in PRIVILEGED_COMMANDS:
        if auth['role'] != 'admin':
            return err("Only Admins can run this command.", 403)
    elif cmd_type in SIMPLE_COMMANDS:
        pass
    elif cmd_type in known_profile_keys(cid):
        pass
    else:
        logger.warning(f"Comando non ammesso da {auth['username']}: {cmd_type[:40]!r} -> {cid}")
        return err("Unknown command")

    if not mqtt_publish(f"servizi/{cid}/cmnd", cmd_type):
        return err("MQTT broker offline - command not sent", 503)

    audit(auth['username'], cid, cmd_type)
    client_telemetry[cid] = {"ts1": "🔄 Sent...", "ts2": "🔄 Sent...", "alt": ""}
    return jsonify({"success": True})

@app.route('/api/global_command', methods=['POST'])
def global_cmd():
    auth = get_auth()
    if not auth or auth['role'] != 'admin':
        return err("Admin action only!", 403)

    cmd_type = str(json_body().get('type', '')).strip()
    if cmd_type not in known_profile_keys():
        return err("Unknown profile")

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
        return err("MQTT broker offline - command not sent", 503)
    return jsonify({"success": True, "sent": sent, "failed": failed})

@app.route('/api/service_control', methods=['POST'])
def service_control():
    auth = get_auth()
    if not auth or auth['role'] != 'admin':
        return err("Unauthorized", 403)

    d = json_body()
    cid = str(d.get('clientId', '')).strip().lower()
    action = str(d.get('action', '')).strip().lower()
    service = str(d.get('service', '')).strip()
    if not CID_RE.match(cid):
        return err("Invalid node id")
    if action not in SERVICE_ACTIONS:
        return err("Invalid action")
    if not SERVICE_RE.match(service):
        return err("Invalid service name")

    if not mqtt_publish(f"devices/{cid}/control", f"{action}:{service}"):
        return err("MQTT broker offline - command not sent", 503)
    audit(auth['username'], cid, f"SVC_{action.upper()}_{service}")
    return jsonify({"success": True})

@app.route('/api/update_nodes', methods=['POST'])
def update_nodes():
    auth = get_auth()
    if not auth or auth['role'] != 'admin':
        return err("Unauthorized", 403)
    if not mqtt_publish("devices/control/request", "update"):
        return err("MQTT broker offline - command not sent", 503)
    logger.info(f"📢 REQ CONFIG inviata a tutta la flotta da {auth['username']}")
    audit(auth['username'], '*', 'REQ_CONFIG_ALL')
    return jsonify({"success": True})

@app.route('/api/users', methods=['GET'])
def get_users():
    auth = get_auth()
    if not auth or auth['role'] != 'admin':
        return err("Unauthorized", 403)
    with closing(db_connect(row=True)) as conn:
        users = [dict(r) for r in conn.execute("SELECT id, username, role, allowed_nodes FROM users")]
    return jsonify(users)

@app.route('/api/users', methods=['POST'])
def add_user():
    auth = get_auth()
    if not auth or auth['role'] != 'admin':
        return err("Unauthorized", 403)

    d = json_body()
    username = str(d.get('username', '')).strip()
    password = d.get('password')
    role = d.get('role', 'operator')
    allowed = normalize_nodes(d.get('allowed_nodes', 'all'))

    if not username or not password:
        return err("Missing data")
    if not USERNAME_RE.match(username):
        return err("Invalid username (3-32 chars: letters, digits, . _ @ -)")
    if not isinstance(password, str) or len(password) < MIN_PASSWORD_LEN:
        return err(f"Password must be at least {MIN_PASSWORD_LEN} characters")
    if role not in VALID_ROLES:
        return err("Invalid role")

    try:
        with closing(db_connect()) as conn:
            conn.execute("INSERT INTO users (username, password_hash, role, allowed_nodes) VALUES (?,?,?,?)",
                         (username, generate_password_hash(password), role, allowed))
            conn.commit()
    except sqlite3.IntegrityError:
        return err("Username already exists")
    audit(auth['username'], '-', f"USER_ADD_{username}_{role}")
    return jsonify({"success": True})

@app.route('/api/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    auth = get_auth()
    if not auth or auth['role'] != 'admin':
        return err("Unauthorized", 403)

    with closing(db_connect()) as conn:
        c = conn.cursor()
        c.execute("SELECT username, role FROM users WHERE id = ?", (user_id,))
        u = c.fetchone()
        if not u:
            return err("User not found", 404)
        if u[0] == auth['username']:
            return err("You cannot delete yourself!")
        if u[1] == 'admin' and count_admins(c, exclude_id=user_id) == 0:
            return err("You cannot delete the last admin!")
        c.execute("DELETE FROM users WHERE id = ?", (user_id,))
        c.execute("DELETE FROM push_subscriptions WHERE username = ?", (u[0],))
        conn.commit()
    audit(auth['username'], '-', f"USER_DEL_{u[0]}")
    return jsonify({"success": True})

@app.route('/api/users/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    auth = get_auth()
    if not auth or auth['role'] != 'admin':
        return err("Unauthorized", 403)

    d = json_body()
    password = d.get('password')
    if password is not None and not isinstance(password, str):
        return err("Invalid password")

    with closing(db_connect()) as conn:
        c = conn.cursor()
        c.execute("SELECT username, role, allowed_nodes FROM users WHERE id = ?", (user_id,))
        existing = c.fetchone()
        if not existing:
            return err("User not found", 404)

        role = d.get('role', existing[1])
        allowed = normalize_nodes(d.get('allowed_nodes', existing[2]))
        if role not in VALID_ROLES:
            return err("Invalid role")
        if existing[1] == 'admin' and role != 'admin' and count_admins(c, exclude_id=user_id) == 0:
            return err("You cannot demote the last admin!")

        if password and password.strip() != "":
            if len(password) < MIN_PASSWORD_LEN:
                return err(f"Password must be at least {MIN_PASSWORD_LEN} characters")
            c.execute("UPDATE users SET password_hash=?, role=?, allowed_nodes=? WHERE id=?",
                      (generate_password_hash(password), role, allowed, user_id))
        else:
            c.execute("UPDATE users SET role=?, allowed_nodes=? WHERE id=?", (role, allowed, user_id))
        conn.commit()
    audit(auth['username'], '-', f"USER_EDIT_{existing[0]}")
    return jsonify({"success": True})

@app.route('/api/change_password', methods=['POST'])
def change_password():
    auth = get_auth()
    if not auth:
        return err("Not authenticated", 403)

    d = json_body()
    new_pass = d.get('new_password')
    user_to_change = d.get('username') or auth['username']
    if auth['role'] != 'admin' and auth['username'] != user_to_change:
        return err("Unauthorized", 403)
    if not new_pass or not isinstance(new_pass, str):
        return err("Password cannot be empty")
    if len(new_pass) < MIN_PASSWORD_LEN:
        return err(f"Password must be at least {MIN_PASSWORD_LEN} characters")

    with closing(db_connect()) as conn:
        cur = conn.execute("UPDATE users SET password_hash = ? WHERE username = ?",
                           (generate_password_hash(new_pass), user_to_change))
        conn.commit()
        if cur.rowcount == 0:
            return err("User not found", 404)
    audit(auth['username'], '-', f"PASSWORD_CHANGE_{user_to_change}")
    return jsonify({"success": True})

def download_file(url, dest):
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=60) as response:
        data = response.read()
    if len(data) < 1024:
        raise ValueError(f"file scaricato troppo piccolo ({len(data)} byte) da {url}")
    tmp = dest + '.tmp'
    with open(tmp, 'wb') as out_file:
        out_file.write(data)
    os.replace(tmp, dest)

def prune_old_data():
    try:
        cfg = read_config()
        radio_days = int(cfg.get("retention_days", 90))
        audit_days = int(cfg.get("audit_retention_days", 365))
        with closing(db_connect()) as conn:
            c = conn.cursor()
            c.execute("DELETE FROM radio_logs WHERE timestamp < datetime('now', 'localtime', ?)", (f"-{radio_days} days",))
            n1 = c.rowcount
            c.execute("DELETE FROM audit_logs WHERE timestamp < datetime('now', 'localtime', ?)", (f"-{audit_days} days",))
            n2 = c.rowcount
            conn.commit()
        if n1 or n2:
            logger.info(f"🧹 Pulizia DB: {n1} ascolti e {n2} audit rimossi.")
    except Exception as e:
        logger.error(f"❌ Errore pulizia DB: {e}")

def auto_update_ids():
    def download_logic():
        try:
            urls = read_config().get("id_urls") or {}
            url_dmr = urls.get("dmr") or "https://radioid.net/static/users.csv"
            url_nxdn = urls.get("nxdn") or "https://radioid.net/static/nxdn.csv"
            logger.info("📡 Inizio download database ID (DMR e NXDN)...")
            download_file(url_dmr, DMR_IDS_PATH)
            download_file(url_nxdn, NXDN_IDS_PATH)
            load_ids()
            logger.info(f"✅ Aggiornamento completato ({len(user_db)} ID DMR, {len(nxdn_db)} ID NXDN).")
        except Exception as e:
            logger.error(f"❌ Errore durante il download: {e}")

    if not os.path.exists(DMR_IDS_PATH) or not os.path.exists(NXDN_IDS_PATH):
        logger.info("🔍 File ID mancanti. Avvio download immediato...")
        download_logic()
    prune_old_data()

    while True:
        try:
            now = time.strftime("%H:%M")
            target_time = read_config().get("update_schedule", "03:00")
            if now == target_time:
                logger.info(f"⏰ Orario programmato ({target_time}) raggiunto. Aggiorno...")
                download_logic()
                prune_old_data()
                time.sleep(65)
        except Exception as e:
            logger.error(f"⚠️ Errore nel thread update: {e}")
        time.sleep(30)

@app.route('/api/ui_config', methods=['GET'])
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
        return jsonify({"error": "Configuration unavailable"}), 500

@app.route('/api/config', methods=['GET'])
def get_config_api():
    auth = get_auth()
    if not auth or auth['role'] != 'admin':
        return err("Unauthorized", 403)
    cfg = read_config()
    return jsonify({
        "update_schedule": cfg.get("update_schedule", "03:00"),
        "url_dmr": cfg.get("id_urls", {}).get("dmr", ""),
        "url_nxdn": cfg.get("id_urls", {}).get("nxdn", ""),
        "log_max_mb": cfg.get("log_max_mb", 50),
        "log_backup_count": cfg.get("log_backup_count", 10)
    })

@app.route('/api/config', methods=['POST'])
def save_config_api():
    auth = get_auth()
    if not auth or auth['role'] != 'admin':
        return err("Unauthorized", 403)

    d = json_body()
    schedule = str(d.get("update_schedule", "03:00")).strip()
    url_dmr = str(d.get("url_dmr", "")).strip()
    url_nxdn = str(d.get("url_nxdn", "")).strip()
    
    try:
        log_max_mb = int(d.get("log_max_mb", 50))
        log_backup_count = int(d.get("log_backup_count", 10))
    except ValueError:
        return err("Invalid log rotation settings")

    if not TIME_RE.match(schedule):
        return err("Invalid time (use HH:MM)")
    for u in (url_dmr, url_nxdn):
        if not u.lower().startswith(('http://', 'https://')):
            return err("URLs must start with http:// or https://")

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

@app.route('/api/config_file/<cid>/<service>', methods=['GET'])
def get_config_file(cid, service):
    auth = get_auth()
    if not auth or auth['role'] != 'admin':
        return err("Unauthorized", 403)
    cid = cid.lower()
    service = service.lower()
    if not CID_RE.match(cid) or not SERVICE_RE.match(service):
        return err("Invalid parameters")
    config_data = device_configs.get(cid, {}).get(service)
    if not config_data:
        return err("Configuration not received yet. Wait or send an UPDATE command.", 404)
    return jsonify({"success": True, "data": config_data})

@app.route('/api/config_file', methods=['POST'])
def save_config_file():
    auth = get_auth()
    if not auth or auth['role'] != 'admin':
        return err("Unauthorized", 403)

    d = json_body()
    cid = str(d.get('clientId', '')).strip().lower()
    service = str(d.get('service', '')).strip().lower()
    new_config = d.get('config_data')
    if not CID_RE.match(cid) or not SERVICE_RE.match(service):
        return err("Invalid parameters")
    if not isinstance(new_config, dict) or not isinstance(new_config.get('raw_text'), str):
        return err("Invalid configuration payload")
    if len(new_config['raw_text']) > 65536:
        return err("Configuration too large (max 64 KB)")

    if not mqtt_publish(f"devices/{cid}/config_set/{service}", json.dumps(new_config)):
        return err("MQTT broker offline - configuration not sent", 503)
    audit(auth['username'], cid, f"EDIT_CONFIG_{service.upper()}")
    return jsonify({"success": True})

@app.route('/api/server_update/check', methods=['GET'])
def check_server_update():
    auth = get_auth()
    if not auth or auth['role'] != 'admin':
        return err("Unauthorized", 403)
    
    try:
        # Aggiorna le informazioni dal remote senza unire i file
        subprocess.run(['git', 'fetch'], timeout=10, cwd=BASE_DIR)
        
        # Confronta il commit locale con quello remoto
        local_hash = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=BASE_DIR).decode('utf-8').strip()
        remote_hash = subprocess.check_output(['git', 'rev-parse', '@{u}'], cwd=BASE_DIR).decode('utf-8').strip()
        
        update_available = local_hash != remote_hash
        return jsonify({"success": True, "update_available": update_available})
    except Exception as e:
        logger.error(f"Errore controllo aggiornamenti server: {e}")
        return jsonify({"success": False, "error": "Impossibile verificare aggiornamenti"})

@app.route('/api/server_update/apply', methods=['POST'])
def apply_server_update():
    auth = get_auth()
    if not auth or auth['role'] != 'admin':
        return err("Unauthorized", 403)
    
    try:
        audit(auth['username'], 'SERVER', 'SERVER_OTA_UPDATE')
        logger.warning(f"🔄 Aggiornamento OTA del server avviato da {auth['username']}")
        
        # Esegue il pull
        subprocess.run(['git', 'pull', '--ff-only'], timeout=30, cwd=BASE_DIR, check=True)
        
        # Programma il riavvio (esce dal processo, systemd lo farà ripartire)
        def restart_server():
            time.sleep(2)
            os._exit(1)
            
        threading.Thread(target=restart_server, daemon=True).start()
        return jsonify({"success": True})
    except subprocess.CalledProcessError as e:
        logger.error(f"Errore durante git pull: {e}")
        return err("Conflitto o errore durante il git pull.")
    except Exception as e:
        logger.error(f"Errore aggiornamento server: {e}")
        return err(str(e))

@app.route('/manifest.json')
def serve_manifest():
    return send_from_directory(BASE_DIR, 'manifest.json')

@app.route('/sw.js')
def serve_sw():
    resp = send_from_directory(BASE_DIR, 'sw.js', mimetype='application/javascript')
    resp.headers['Cache-Control'] = 'no-cache'
    resp.headers['Service-Worker-Allowed'] = '/'
    return resp

@app.route('/icon-512.png')
def serve_icon():
    return send_from_directory(BASE_DIR, 'icon-512.png')

push_queue = queue.Queue(maxsize=200)

def broadcast_push_notification(title, body, cid=None):
    if not config.get('webpush'):
        return
    try:
        push_queue.put_nowait((title, body, cid))
    except queue.Full:
        logger.warning("Push queue piena: notifica scartata")

def _send_push(title, body, cid):
    wp_config = config.get('webpush')
    if not wp_config:
        return
    payload = json.dumps({"title": title, "body": body, "tag": cid or "fleet-alert"})
    dead = []

    with closing(db_connect()) as conn:
        rows = conn.execute("""SELECT p.id, p.subscription, u.role, u.allowed_nodes
                               FROM push_subscriptions p
                               LEFT JOIN users u ON u.username = p.username""").fetchall()
        for sub_id, sub_json, role, allowed in rows:
            if role is None:
                dead.append(sub_id)
                continue
            if cid and not node_allowed(role, allowed, cid):
                continue
            try:
                webpush(
                    subscription_info=json.loads(sub_json),
                    data=payload,
                    vapid_private_key=wp_config['vapid_private_key'],
                    vapid_claims={"sub": wp_config['vapid_claim_email']},
                    timeout=10
                )
            except WebPushException as ex:
                status = getattr(getattr(ex, 'response', None), 'status_code', None)
                if status in (404, 410):
                    dead.append(sub_id)
                else:
                    logger.warning(f"Push error (status {status}): {ex}")
            except Exception as e:
                logger.error(f"Generic Push Error: {e}")
        for sub_id in dead:
            conn.execute("DELETE FROM push_subscriptions WHERE id = ?", (sub_id,))
        if dead:
            conn.commit()

def push_worker():
    while True:
        title, body, cid = push_queue.get()
        try:
            _send_push(title, body, cid)
        except Exception as e:
            logger.error(f"Push worker error: {e}")

@app.route('/api/vapid_public_key')
def get_vapid_key():
    return jsonify({"public_key": config.get('webpush', {}).get('vapid_public_key', '')})

@app.route('/api/subscribe', methods=['POST'])
def subscribe_push():
    auth = get_auth()
    if not auth:
        return err("Unauthorized", 403)
    sub_data = json_body()
    if not sub_data.get('endpoint'):
        return err("Invalid subscription")
    with closing(db_connect()) as conn:
        conn.execute("""INSERT INTO push_subscriptions (username, subscription) VALUES (?, ?)
                        ON CONFLICT(subscription) DO UPDATE SET username = excluded.username""",
                     (auth['username'], json.dumps(sub_data)))
        conn.commit()
    return jsonify({"success": True})

threading.Thread(target=auto_update_ids, daemon=True).start()
threading.Thread(target=push_worker, daemon=True).start()

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=9000)
