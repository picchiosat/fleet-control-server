import os
import json
import secrets
import logging
import threading
from logging.handlers import RotatingFileHandler

# --- PERCORSI DINAMICI ---
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

DB_PATH = os.path.join(BASE_DIR, 'monitor.db')
CACHE_FILE = os.path.join(BASE_DIR, 'telemetry_cache.json')
CONFIG_PATH = os.path.join(BASE_DIR, 'config.json')
DMR_IDS_PATH = os.path.join(BASE_DIR, 'dmrid.dat')
NXDN_IDS_PATH = os.path.join(BASE_DIR, 'nxdn.csv')
CLIENTS_PATH = os.path.join(BASE_DIR, 'clients.json')
LOG_FILE = os.path.join(BASE_DIR, 'fleet_console.log')

# --- CONFIG LOADER ---
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

# --- LOGGING ROTATIVO ---
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
            logger.warning("🔑 Nuova secret_key generata e salvata in config.json.")
        except Exception as e:
            logger.error(f"Impossibile salvare la secret_key in config.json ({e}).")
    return key
