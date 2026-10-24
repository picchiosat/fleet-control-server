import re
import time
import hashlib
import threading
import sqlite3
from contextlib import closing
from flask import Blueprint, request, session, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from core.config import config, logger
from core.database import db_connect, audit

auth_bp = Blueprint('auth', __name__)

# --- COSTANTI & REGEX VALIDAZIONE ---
VALID_ROLES = ('admin', 'operator')
USERNAME_RE = re.compile(r'^[A-Za-z0-9_.@\-]{3,32}$')
MIN_PASSWORD_LEN = 8

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

# --- RATE LIMITING / BRUTE FORCE PROTECTION ---
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

# --- ROTTE AUTENTICAZIONE ---

@auth_bp.route('/api/login', methods=['POST'])
def login():
    d = json_body()
    username, password = d.get('user'), d.get('pass')
    if not isinstance(username, str) or not isinstance(password, str) or not username or not password:
        return err("Credenziali mancanti", 400)

    ip = client_ip()
    if login_blocked(ip):
        logger.warning(f"Login bloccato (troppi tentativi) da {ip}")
        return err("Troppi tentativi falliti. Riprova tra qualche minuto.", 429)

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

@auth_bp.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({"success": True})

@auth_bp.route('/api/me')
def me():
    auth = get_auth()
    if not auth:
        return jsonify({"logged_in": False})
    return jsonify({"logged_in": True, "user": auth['username'], "role": auth['role'],
                    "allowed_nodes": auth['allowed_nodes']})

@auth_bp.route('/api/change_password', methods=['POST'])
def change_password():
    auth = get_auth()
    if not auth:
        return err("Non autenticato", 403)

    d = json_body()
    new_pass = d.get('new_password')
    user_to_change = d.get('username') or auth['username']
    if auth['role'] != 'admin' and auth['username'] != user_to_change:
        return err("Non autorizzato", 403)
    if not new_pass or not isinstance(new_pass, str):
        return err("La password non può essere vuota")
    if len(new_pass) < MIN_PASSWORD_LEN:
        return err(f"La password deve contenere almeno {MIN_PASSWORD_LEN} caratteri")

    with closing(db_connect()) as conn:
        cur = conn.execute("UPDATE users SET password_hash = ? WHERE username = ?",
                           (generate_password_hash(new_pass), user_to_change))
        conn.commit()
        if cur.rowcount == 0:
            return err("Utente non trovato", 404)
    audit(auth['username'], '-', f"PASSWORD_CHANGE_{user_to_change}")
    return jsonify({"success": True})

# --- GESTIONE UTENTI (ADMIN ONLY) ---

@auth_bp.route('/api/users', methods=['GET'])
def get_users():
    auth = get_auth()
    if not auth or auth['role'] != 'admin':
        return err("Non autorizzato", 403)
    with closing(db_connect(row=True)) as conn:
        users = [dict(r) for r in conn.execute("SELECT id, username, role, allowed_nodes FROM users")]
    return jsonify(users)

@auth_bp.route('/api/users', methods=['POST'])
def add_user():
    auth = get_auth()
    if not auth or auth['role'] != 'admin':
        return err("Non autorizzato", 403)

    d = json_body()
    username = str(d.get('username', '')).strip()
    password = d.get('password')
    role = d.get('role', 'operator')
    allowed = normalize_nodes(d.get('allowed_nodes', 'all'))

    if not username or not password:
        return err("Dati mancanti")
    if not USERNAME_RE.match(username):
        return err("Username non valido (3-32 caratteri: lettere, numeri, . _ @ -)")
    if not isinstance(password, str) or len(password) < MIN_PASSWORD_LEN:
        return err(f"La password deve contenere almeno {MIN_PASSWORD_LEN} caratteri")
    if role not in VALID_ROLES:
        return err("Ruolo non valido")

    try:
        with closing(db_connect()) as conn:
            conn.execute("INSERT INTO users (username, password_hash, role, allowed_nodes) VALUES (?,?,?,?)",
                         (username, generate_password_hash(password), role, allowed))
            conn.commit()
    except sqlite3.IntegrityError:
        return err("Username già esistente")
    audit(auth['username'], '-', f"USER_ADD_{username}_{role}")
    return jsonify({"success": True})

@auth_bp.route('/api/users/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    auth = get_auth()
    if not auth or auth['role'] != 'admin':
        return err("Non autorizzato", 403)

    d = json_body()
    password = d.get('password')
    if password is not None and not isinstance(password, str):
        return err("Password non valida")

    with closing(db_connect()) as conn:
        c = conn.cursor()
        c.execute("SELECT username, role, allowed_nodes FROM users WHERE id = ?", (user_id,))
        existing = c.fetchone()
        if not existing:
            return err("Utente non trovato", 404)

        role = d.get('role', existing[1])
        allowed = normalize_nodes(d.get('allowed_nodes', existing[2]))
        if role not in VALID_ROLES:
            return err("Ruolo non valido")
        if existing[1] == 'admin' and role != 'admin' and count_admins(c, exclude_id=user_id) == 0:
            return err("Impossibile degradare l'ultimo amministratore rimasto!")

        if password and password.strip() != "":
            if len(password) < MIN_PASSWORD_LEN:
                return err(f"La password deve contenere almeno {MIN_PASSWORD_LEN} caratteri")
            c.execute("UPDATE users SET password_hash=?, role=?, allowed_nodes=? WHERE id=?",
                      (generate_password_hash(password), role, allowed, user_id))
        else:
            c.execute("UPDATE users SET role=?, allowed_nodes=? WHERE id=?", (role, allowed, user_id))
        conn.commit()
    audit(auth['username'], '-', f"USER_EDIT_{existing[0]}")
    return jsonify({"success": True})

@auth_bp.route('/api/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    auth = get_auth()
    if not auth or auth['role'] != 'admin':
        return err("Non autorizzato", 403)

    with closing(db_connect()) as conn:
        c = conn.cursor()
        c.execute("SELECT username, role FROM users WHERE id = ?", (user_id,))
        u = c.fetchone()
        if not u:
            return err("Utente non trovato", 404)
        if u[0] == auth['username']:
            return err("Non puoi eliminare il tuo stesso account!")
        if u[1] == 'admin' and count_admins(c, exclude_id=user_id) == 0:
            return err("Impossibile eliminare l'ultimo amministratore rimasto!")
        c.execute("DELETE FROM users WHERE id = ?", (user_id,))
        c.execute("DELETE FROM push_subscriptions WHERE username = ?", (u[0],))
        conn.commit()
    audit(auth['username'], '-', f"USER_DEL_{u[0]}")
    return jsonify({"success": True})
