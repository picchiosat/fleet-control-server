import gevent.monkey
gevent.monkey.patch_all()

import os
import subprocess
import threading
from flask import Flask, render_template, request
from flask_socketio import emit

# --- IMPORT MODULI CORE ---
from core.config import BASE_DIR, get_secret_key, web_cfg, logger
from core.database import init_db
import core.state as state

# --- IMPORT SERVIZI ---
from services.push_service import push_worker
from services.watchdog_service import watchdog_loop
from services.scheduler_service import auto_update_ids
import services.mqtt_service as mqtt_svc

# --- IMPORT ROTTE / BLUEPRINTS ---
from routes.auth_routes import auth_bp
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
state.socketio.init_app(app)

# Registrazione Blueprint
app.register_blueprint(auth_bp)
app.register_blueprint(api_bp)

# Security Headers
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
        return subprocess.check_output(['git', 'rev-parse', '--short', 'HEAD'], cwd=BASE_DIR).decode('utf-8').strip()
    except Exception:
        return "sconosciuta"

SERVER_COMMIT = get_git_commit()

@app.route('/')
def index():
    return render_template('index.html', git_commit=SERVER_COMMIT)

@state.socketio.on('connect')
def handle_connect():
    emit('mqtt_status', {'connected': mqtt_svc.mqtt_connected_status})

# --- INIZIALIZZAZIONE SISTEMA & THREAD ---
init_db()
state.seed_last_seen()
mqtt_svc.start_mqtt()

threading.Thread(target=auto_update_ids, daemon=True).start()
threading.Thread(target=push_worker, daemon=True).start()
threading.Thread(target=watchdog_loop, daemon=True).start()

logger.info(f"🚀 Fleet Control Console modulare pronta (Git Rev: {SERVER_COMMIT})")

if __name__ == '__main__':
    port = int(config.get('web', {}).get('port', 9000)) if 'config' in locals() else 9000
    state.socketio.run(app, host='0.0.0.0', port=port)
