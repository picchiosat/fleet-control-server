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
            
            # Controllo schedulazioni profili
            check_profile_schedules()
        except Exception as e:
            logger.error(f"⚠️ Errore nel thread scheduler: {e}")
        time.sleep(15)

from contextlib import closing
from core.database import db_connect, audit

def apply_scheduled_profile(target_nodes, profile, action_type="SWITCH"):
    from services.mqtt_service import mqtt_publish
    from core.config import CLIENTS_PATH
    import json
    import re

    CID_RE = re.compile(r'^[a-z0-9][a-z0-9_\-]{0,63}$')
    nodes = []
    if target_nodes.strip().lower() == 'all':
        if os.path.exists(CLIENTS_PATH):
            try:
                with open(CLIENTS_PATH, 'r') as f:
                    clist = json.load(f)
                    nodes = [str(c.get('id', '')).lower() for c in clist if CID_RE.match(str(c.get('id', '')).lower())]
            except Exception as e:
                logger.error(f"Errore lettura clients per schedule: {e}")
    else:
        nodes = [x.strip().lower() for x in target_nodes.split(',') if CID_RE.match(x.strip().lower())]

    logger.info(f"📅 Scheduler applica profilo [{profile}] su {len(nodes)} nodi ({target_nodes})")
    for cid in nodes:
        mqtt_publish(f"servizi/{cid}/cmnd", profile)
        if cid in state.client_telemetry and isinstance(state.client_telemetry[cid], dict):
            state.client_telemetry[cid]["alt"] = f"📅 SCHED: {profile}"
    state.notify_update()

def check_profile_schedules():
    try:
        now_str = time.strftime('%Y-%m-%d %H:%M:%S')
        with closing(db_connect(row=True)) as conn:
            c = conn.cursor()
            c.execute("""SELECT id, title, target_nodes, target_profile, restore_profile, 
                                 start_time, end_time, status, created_by 
                          FROM profile_schedules 
                          WHERE status IN ('SCHEDULED', 'ACTIVE')""")
            rows = c.fetchall()
            
            for row in rows:
                sid = row['id']
                title = row['title']
                nodes = row['target_nodes']
                target_prof = row['target_profile']
                restore_prof = row['restore_profile']
                st_time = row['start_time']
                end_time = row['end_time']
                status = row['status']
                
                # Formattiamo le date nel caso abbiano una 'T' (input HTML5 datetime-local)
                st_norm = st_time.replace('T', ' ')
                if len(st_norm) == 16: st_norm += ':00'
                end_norm = end_time.replace('T', ' ')
                if len(end_norm) == 16: end_norm += ':00'
                
                if status == 'SCHEDULED':
                    if st_norm <= now_str < end_norm:
                        logger.info(f"▶️ Avvio schedulazione ID {sid} - '{title}' -> Profilo {target_prof}")
                        apply_scheduled_profile(nodes, target_prof, "START")
                        conn.execute("UPDATE profile_schedules SET status = 'ACTIVE' WHERE id = ?", (sid,))
                        conn.commit()
                        audit("SCHEDULER", nodes, f"START_SCHED_{sid}_{target_prof}")
                    elif now_str >= end_norm:
                        # Scaduta prima di iniziare
                        logger.warning(f"⌛ Schedulazione ID {sid} - '{title}' scaduta senza esecuzione.")
                        conn.execute("UPDATE profile_schedules SET status = 'EXPIRED' WHERE id = ?", (sid,))
                        conn.commit()
                        
                elif status == 'ACTIVE':
                    if now_str >= end_norm:
                        logger.info(f"⏹️ Fine schedulazione ID {sid} - '{title}' -> Ripristino {restore_prof}")
                        if restore_prof and restore_prof.upper() != 'NONE':
                            apply_scheduled_profile(nodes, restore_prof, "RESTORE")
                        conn.execute("UPDATE profile_schedules SET status = 'COMPLETED' WHERE id = ?", (sid,))
                        conn.commit()
                        audit("SCHEDULER", nodes, f"RESTORE_SCHED_{sid}_{restore_prof}")
    except Exception as e:
        logger.error(f"Errore controllo schedulazioni profili: {e}")
