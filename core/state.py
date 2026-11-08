import os
import json
import time
import threading
import sqlite3
import redis
from contextlib import closing
from flask_socketio import SocketIO
from core.config import CACHE_FILE, DB_PATH, DMR_IDS_PATH, NXDN_IDS_PATH, logger, web_cfg
from core.permissions import node_allowed

# --- WEBSOCKET SOCKETIO ---
socketio = SocketIO(cors_allowed_origins=web_cfg.get('cors_origins', '*'))

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

# --- REDIS CLIENT & NAMESPACE ---
REDIS_URL = os.getenv("REDIS_URL", web_cfg.get("redis_url", "redis://localhost:6379/0"))
try:
    redis_client = redis.from_url(REDIS_URL, decode_responses=True)
except Exception as e:
    logger.error(f"Errore connessione Redis ({REDIS_URL}): {e}")
    redis_client = None

NAMESPACE = "fleet:node:"

# --- STATI GLOBALI IN MEMORIA ---
START_TIME = time.time()
state_lock = threading.RLock()

client_states = {}
device_configs = {}
client_telemetry = {}
last_notified_errors = {}
device_health = {}
last_seen_reflector = {}
node_info = {}
node_general = {}
node_versions = {}
gateway_states = {}
active_warnings = {}
active_calls = {}
operating_modes = {}
node_logs = {}  # In-memory circular buffer for live logs
connected_web_clients = set()
active_logged_users = {}
socket_auth = {}      # sid -> {"username","role","allowed_nodes","ts"} (solo socket con sessione valida)
auth_lookup = None    # impostato da app.py: username -> dict auth aggiornato oppure None

AUTH_REFRESH_SEC = 120

def emit_to_authorized(event, data, cid=None):
    """Invia l'evento solo ai socket autenticati (e, se cid e' dato, autorizzati su quel nodo)."""
    now = time.time()
    for sid, a in list(socket_auth.items()):
        try:
            # Rilegge periodicamente ruolo/nodi: utenti rimossi o declassati perdono l'accesso live
            if auth_lookup and now - a.get('ts', 0) > AUTH_REFRESH_SEC:
                fresh = auth_lookup(a['username'])
                if not fresh:
                    socket_auth.pop(sid, None)
                    continue
                a.update(fresh)
                a['ts'] = now
            if cid is None or node_allowed(a.get('role'), a.get('allowed_nodes'), cid):
                socketio.emit(event, data, to=sid)
        except Exception as e:
            logger.error(f"emit_to_authorized '{event}': {e}")

def emit_aprs(data):
    """APRS live: broadcast come prima, oppure solo utenti loggati se web.require_login_for_read."""
    if web_cfg.get('require_login_for_read'):
        emit_to_authorized('aprs_msg', data)
    else:
        socketio.emit('aprs_msg', data)

# Caricamento iniziale cache telemetria
if os.path.exists(CACHE_FILE):
    try:
        with open(CACHE_FILE, 'r') as f:
            client_telemetry = json.load(f)
    except Exception:
        client_telemetry = {}

def save_cache(data):
    try:
        tmp = CACHE_FILE + '.tmp'
        with open(tmp, 'w') as f:
            json.dump(data, f)
        os.replace(tmp, CACHE_FILE)
    except Exception as e:
        logger.error(f"Errore salvataggio cache telemetria: {e}")
    notify_update()

# --- GESTIONE LAST SEEN ---
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

# --- FUNZIONI DI GESTIONE STATO & REDIS ---
def update_node_state(node_id: str, payload: dict) -> None:
    """Aggiorna lo stato del nodo sia in memoria locale che su Redis in modo sicuro."""
    if not node_id:
        return
        
    with state_lock:
        current = client_states.get(node_id)
        # Se lo stato attuale è una stringa semplice, convertilo in dizionario
        if not isinstance(current, dict):
            current = {"status": current} if isinstance(current, str) else {}
            client_states[node_id] = current
            
        if isinstance(payload, dict):
            current.update(payload)
        elif isinstance(payload, str):
            current["status"] = payload
        
    touch_seen(node_id, 'mqtt')
    
    # Scrittura asincrona/pipeline su Redis
    if redis_client:
        try:
            key = f"{NAMESPACE}{node_id}"
            if isinstance(payload, dict):
                flat_payload = {
                    k: (json.dumps(v) if isinstance(v, (dict, list)) else str(v))
                    for k, v in payload.items()
                }
            else:
                flat_payload = {"status": str(payload)}

            if flat_payload:
                pipeline = redis_client.pipeline()
                pipeline.hset(key, mapping=flat_payload)
                pipeline.execute()
        except Exception as e:
            logger.error(f"Errore update Redis nodo {node_id}: {e}")
            
    notify_update()            

def get_node_state(node_id: str) -> dict:
    """Recupera lo stato del nodo da Redis, con fallback sulla memoria locale."""
    if redis_client:
        try:
            key = f"{NAMESPACE}{node_id}"
            data = redis_client.hgetall(key)
            if data:
                for k, v in data.items():
                    try:
                        if str(v).startswith(("{", "[")):
                            data[k] = json.loads(v)
                    except (ValueError, TypeError):
                        pass
                return data
        except Exception as e:
            logger.error(f"Errore lettura Redis nodo {node_id}: {e}")
            
    with state_lock:
        return dict(client_states.get(node_id, {}))

def get_all_nodes() -> dict:
    """Scansiona tutti i nodi registrati in Redis o memoria."""
    if redis_client:
        try:
            nodes = {}
            for key in redis_client.scan_iter(match=f"{NAMESPACE}*"):
                node_id = key.split(":")[-1]
                nodes[node_id] = get_node_state(node_id)
            if nodes:
                return nodes
        except Exception as e:
            logger.error(f"Errore get_all_nodes Redis: {e}")
            
    with state_lock:
        return dict(client_states)

def delete_node(node_id: str) -> None:
    """Rimuove il nodo da Redis e dalla memoria locale."""
    with state_lock:
        client_states.pop(node_id, None)
        
    if redis_client:
        try:
            key = f"{NAMESPACE}{node_id}"
            redis_client.delete(key)
        except Exception as e:
            logger.error(f"Errore delete Redis nodo {node_id}: {e}")
            
    notify_update()

def clear_all_nodes() -> None:
    """Svuota la cache nodi da Redis e memoria locale (usato al boot)."""
    with state_lock:
        client_states.clear()
        
    if redis_client:
        try:
            for key in redis_client.scan_iter(match=f"{NAMESPACE}*"):
                redis_client.delete(key)
        except Exception as e:
            logger.error(f"Errore clear_all_nodes Redis: {e}")

# --- DATABASE ID DMR / NXDN ---
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
                elif '	' in l: p = l.strip().split('	')
                elif ';' in l: p = l.strip().split(';')
                else: p = l.strip().split()

                if len(p) >= 2 and p[0].strip().isdigit():
                    new_dmr[p[0].strip()] = p[1].strip()

    if os.path.exists(NXDN_IDS_PATH):
        with open(NXDN_IDS_PATH, 'r', encoding='utf-8', errors='ignore') as f:
            for l in f:
                sep = '	' if '	' in l else (',' if ',' in l else ';')
                p = l.strip().split(sep)
                if len(p) >= 2 and p[0].strip().isdigit():
                    new_nxdn[p[0].strip()] = p[1].strip()

    if new_dmr: user_db = new_dmr
    if new_nxdn: nxdn_db = new_nxdn

def get_call(id_val, proto="DMR"):
    sid = str(id_val)
    if proto == "NXDN":
        return nxdn_db.get(sid, sid)
    return user_db.get(sid, sid)

# Inizializzazione automatica ID
load_ids()
