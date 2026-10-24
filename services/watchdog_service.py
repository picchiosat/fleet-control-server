import time
import sqlite3
from contextlib import closing
from core.config import DB_PATH, logger
import core.state as state
from services.push_service import broadcast_push_notification

watchdog_notified = {}

def run_diagnostics():
    new_warnings = {}
    
    # 1. Analisi Hardware (Temperatura e Spazio Disco)
    for cid, health in list(state.device_health.items()):
        node_warns = []
        state_up = str(state.client_states.get(cid, '')).upper()
        if 'OFF' in state_up or state_up == '':
            continue
            
        temp = health.get('temp', 0)
        disk = health.get('disk', 0)
        
        # Allarme Temperatura CPU (Soglia 75°C, rientro 68°C)
        key_temp = f"{cid}_TEMP"
        if temp >= 75.0:
            node_warns.append(f"🌡️ Alta Temperatura ({temp}°C)")
            if not watchdog_notified.get(key_temp):
                broadcast_push_notification(f"🌡️ ALLARME TERMICO: {cid.upper()}", f"CPU surriscaldata a {temp}°C! Verificare ventilazione.", cid=cid)
                watchdog_notified[key_temp] = True
        elif temp < 68.0 and watchdog_notified.get(key_temp):
            broadcast_push_notification(f"✅ TEMPERATURA OK: {cid.upper()}", f"Temperatura CPU rientrata a {temp}°C.", cid=cid)
            del watchdog_notified[key_temp]

        # Allarme Spazio Disco (Soglia 90%, rientro 85%)
        key_disk = f"{cid}_DISK"
        if disk >= 90.0:
            node_warns.append(f"💾 Spazio Disco Quasi Pieno ({disk}%)")
            if not watchdog_notified.get(key_disk):
                broadcast_push_notification(f"💾 DISCO CRITICO: {cid.upper()}", f"Utilizzo disco al {disk}%. Rischio blocco log MMDVM.", cid=cid)
                watchdog_notified[key_disk] = True
        elif disk < 85.0 and watchdog_notified.get(key_disk):
            del watchdog_notified[key_disk]

        if node_warns:
            new_warnings.setdefault(cid, []).extend(node_warns)

    # 2. Analisi Radio RF (Media BER sulle ultime 2 ore, solo transiti RF locali)
    try:
        with closing(sqlite3.connect(DB_PATH, timeout=10)) as conn:
            cur = conn.cursor()
            cur.execute("""
                SELECT LOWER(client_id), AVG(ber), COUNT(*) 
                FROM radio_logs 
                WHERE timestamp >= datetime('now', 'localtime', '-2 hours') 
                  AND source_id NOT LIKE '🌐%' 
                  AND (source_conn IS NULL OR LOWER(source_conn) != 'network')
                GROUP BY LOWER(client_id)
            """)
            rows = cur.fetchall()
            
            for cid, avg_ber, cnt in rows:
                key_ber = f"{cid}_BER"
                if cnt >= 5 and avg_ber is not None and avg_ber >= 5.0:
                    new_warnings.setdefault(cid, []).append(f"⚠️ Alto BER RF ({avg_ber:.1f}%)")
                    if not watchdog_notified.get(key_ber):
                        broadcast_push_notification(f"⚠️ ANOMALIA RF: {cid.upper()}", f"Rilevato BER medio del {avg_ber:.1f}% negli ultimi {cnt} passaggi RF.", cid=cid)
                        watchdog_notified[key_ber] = True
                elif avg_ber is not None and avg_ber < 3.0:
                    if watchdog_notified.get(key_ber):
                        del watchdog_notified[key_ber]
    except Exception as e:
        logger.error(f"Errore diagnostica BER Watchdog: {e}")

    # Aggiorna il dizionario globale condiviso preservando i riferimenti in memoria
    changed = new_warnings != state.active_warnings
    state.active_warnings.clear()
    state.active_warnings.update(new_warnings)
    if changed:
        state.notify_update()

def watchdog_loop():
    time.sleep(15)  # Attesa iniziale all'avvio
    while True:
        try:
            run_diagnostics()
        except Exception as e:
            logger.error(f"Errore nel loop del Watchdog: {e}")
        time.sleep(60)
