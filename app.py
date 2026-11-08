import gevent.monkey
gevent.monkey.patch_all()

import os
import subprocess
import threading
import time
from contextlib import closing
from flask import Flask, render_template, request, jsonify
from flask_socketio import emit, SocketIO

# --- IMPORT MODULI CORE ---
from core.config import BASE_DIR, get_secret_key, web_cfg, logger
from core.database import init_db, get_last_known_states
import core.state as state
from core.state import clear_all_nodes, update_node_state

# --- IMPORT SERVIZI ---
from services.push_service import push_worker
from services.watchdog_service import watchdog_loop
from services.scheduler_service import auto_update_ids, schedule_loop
import services.mqtt_service as mqtt_svc

# --- IMPORT ROTTE / BLUEPRINTS ---
from routes.auth_routes import auth_bp, get_auth
from core.database import db_connect
from routes.api_routes import api_bp

# Inizializzazione Flask
template_dir = os.path.join(BASE_DIR, 'templates') if os.path.isdir(os.path.join(BASE_DIR, 'templates')) else BASE_DIR
app = Flask(__name__, template_folder=template_dir)

# Configurazione Sicurezza Sessioni
app.secret_key = get_secret_key()
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE='Lax',
    SESSION_COOKIE_SECURE=bool(web_cfg.get('cookie_secure', False)),
    PERMANENT_SESSION_LIFETIME=int(web_cfg.get('session_hours', 12)) * 3600,
)

# Collegamento SocketIO
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='gevent')

# Rendiamo disponibile l'istanza globale socketio nel modulo state
# in modo che gli altri servizi (mqtt_service, push_service, api_routes) 
# che importano `from core.state import socketio` continuino a funzionare.
state.socketio = socketio

# Registrazione Blueprint
app.register_blueprint(auth_bp)
app.register_blueprint(api_bp)

# Aggiungi la funzione di sincronizzazione
def init_fleet_state():
    """Bootloader: sincronizza Redis con il DB all'avvio del worker."""
    app.logger.info("Inizializzazione stato flotta su Redis...")
    clear_all_nodes()
    
    last_states = get_last_known_states()
    for node_id, data in last_states.items():
        data["status"] = "RECONNECTING"
        update_node_state(node_id, data)

# Esegui la sincronizzazione prima di far partire i servizi
init_fleet_state()

# Security Headers
@app.after_request
def add_security_headers(resp):
    resp.headers.setdefault('X-Content-Type-Options', 'nosniff')
    resp.headers.setdefault('X-Frame-Options', 'DENY')
    resp.headers.setdefault('Referrer-Policy', 'same-origin')
    if request.path.startswith('/api/'):
        resp.headers['Cache-Control'] = 'no-store'
    return resp

# Se in config.json -> "web": {"require_login_for_read": true} le API di sola lettura richiedono il login.
# Default: disattivato (la dashboard pubblica funziona come prima).
READ_PROTECTED_PATHS = ('/api/states', '/api/logs', '/api/stats', '/api/clients')

@app.before_request
def enforce_read_login():
    if web_cfg.get('require_login_for_read') and request.path in READ_PROTECTED_PATHS:
        if not get_auth():
            return jsonify({"success": False, "error": "Login richiesto"}), 401
    return None

def get_git_commit():
    try:
        return subprocess.check_output(['git', 'rev-parse', '--short', 'HEAD'], cwd=BASE_DIR).decode('utf-8').strip()
    except Exception:
        return "sconosciuta"

SERVER_COMMIT = get_git_commit()

@app.route('/')
def index():
    return render_template('index.html', git_commit=SERVER_COMMIT)

@socketio.on('connect')
def handle_connect():
    state.connected_web_clients.add(request.sid)
    
    # Se l'utente è loggato (session), associamo il suo username al SID
    auth = get_auth()
    if auth:
        state.active_logged_users[request.sid] = auth['username']
        state.socket_auth[request.sid] = {
            "username": auth['username'], "role": auth['role'],
            "allowed_nodes": auth['allowed_nodes'], "ts": time.time()
        }

    emit('mqtt_status', {'connected': mqtt_svc.mqtt_connected_status})
    
    # Prepariamo la lista unica degli utenti loggati attivi (togliendo i duplicati se un utente ha più tab aperti)
    logged_names = list(set(state.active_logged_users.values()))
    socketio.emit('web_users_count', {'count': len(state.connected_web_clients), 'users': logged_names})

@socketio.on('disconnect')
def handle_disconnect():
    state.connected_web_clients.discard(request.sid)
    state.active_logged_users.pop(request.sid, None)
    state.socket_auth.pop(request.sid, None)
    
    logged_names = list(set(state.active_logged_users.values()))
    socketio.emit('web_users_count', {'count': len(state.connected_web_clients), 'users': logged_names})

def _lookup_auth(username):
    """Ruolo/nodi aggiornati di un utente (usato per rivalidare i socket gia' connessi)."""
    try:
        with closing(db_connect(row=True)) as conn:
            row = conn.execute("SELECT role, allowed_nodes FROM users WHERE username = ?", (username,)).fetchone()
        if not row:
            return None
        return {"role": row['role'], "allowed_nodes": row['allowed_nodes'] or ''}
    except Exception as e:
        logger.error(f"lookup auth socket: {e}")
        return None

state.auth_lookup = _lookup_auth

# --- INIZIALIZZAZIONE SISTEMA & THREAD ---
init_db()
state.seed_last_seen()
mqtt_svc.start_mqtt()

threading.Thread(target=auto_update_ids, daemon=True).start()
threading.Thread(target=schedule_loop, daemon=True).start()
threading.Thread(target=push_worker, daemon=True).start()
threading.Thread(target=watchdog_loop, daemon=True).start()

logger.info(f"🚀 Fleet Control Console modulare pronta (Git Rev: {SERVER_COMMIT})")

if __name__ == '__main__':
    port = int(web_cfg.get('port', 9000))
    socketio.run(app, host='0.0.0.0', port=port)
