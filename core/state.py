import os
import json
import time
import threading
import sqlite3
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

# --- STATI GLOBALI IN MEMORIA ---
START_TIME = time.time()
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

def get_call(id_val, proto="DMR"):
    sid = str(id_val)
    if proto == "NXDN":
        return nxdn_db.get(sid, sid)
    return user_db.get(sid, sid)

# Inizializzazione automatica ID
load_ids()
