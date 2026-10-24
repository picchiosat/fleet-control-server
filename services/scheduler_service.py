import os
import time
import urllib.request
from core.config import DMR_IDS_PATH, NXDN_IDS_PATH, read_config, logger
from core.database import prune_old_data
import core.state as state

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

def download_logic():
    try:
        urls = read_config().get("id_urls") or {}
        url_dmr = urls.get("dmr") or "https://radioid.net/static/users.csv"
        url_nxdn = urls.get("nxdn") or "https://radioid.net/static/nxdn.csv"
        logger.info("📡 Inizio download database ID (DMR e NXDN)...")
        download_file(url_dmr, DMR_IDS_PATH)
        download_file(url_nxdn, NXDN_IDS_PATH)
        state.load_ids()
        logger.info(f"✅ Aggiornamento completato ({len(state.user_db)} ID DMR, {len(state.nxdn_db)} ID NXDN).")
    except Exception as e:
        logger.error(f"❌ Errore durante il download: {e}")

def auto_update_ids():
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
