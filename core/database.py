import sqlite3
import secrets
from contextlib import closing
from werkzeug.security import generate_password_hash
from core.config import DB_PATH, config, read_config, logger
from core.state import notify_update

def db_connect(row=False):
    conn = sqlite3.connect(DB_PATH, timeout=10)
    if row:
        conn.row_factory = sqlite3.Row
    return conn

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

def save_to_sqlite(client_id, data, protocol="DMR"):
    conn = sqlite3.connect(DB_PATH, timeout=10)
    c = conn.cursor()
    
    rssi_val = 0
    if 'rssi' in data and isinstance(data['rssi'], dict):
        rssi_val = data['rssi'].get('ave', 0)
    elif 'rssi' in data:
        rssi_val = data['rssi']
        
    c.execute("""INSERT INTO radio_logs 
                 (timestamp, client_id, protocol, source_id, target, slot, duration, ber, source_ext, rssi, source_conn, ysf_mode) 
                 VALUES (datetime('now', 'localtime'), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
              (client_id, protocol, str(data.get('src_id', '---')), str(data.get('dst_id', '---')), 
               data.get('slot', 0), round(data.get('duration', 0), 1), round(data.get('ber', 0), 2), 
               str(data.get('src_ext', '')), rssi_val, str(data.get('source', '')), str(data.get('mode', ''))))
    conn.commit()
    conn.close()
    notify_update('log_aggiornato')

def audit(username, client_id, command):
    try:
        with closing(db_connect()) as conn:
            conn.execute("INSERT INTO audit_logs (timestamp, username, client_id, command) VALUES (datetime('now','localtime'), ?, ?, ?)",
                         (username, client_id, command))
            conn.commit()
    except Exception as e:
        logger.error(f"Audit log error: {e}")

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
