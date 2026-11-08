import time
import json
import logging
from core.state import get_all_nodes, update_node_state, delete_node, last_seen as global_last_seen
from core.database import archive_node_error

logger = logging.getLogger(__name__)

def watchdog_loop():
    logger.info("Watchdog service started.")
    while True:
        try:
            now = time.time()
            nodes = get_all_nodes()

            for node_id, state in nodes.items():
                # 1. Normalizza lo stato se è una stringa (es. "ONLINE" o JSON serializzato)
                if isinstance(state, str):
                    try:
                        state = json.loads(state)
                    except Exception:
                        state = {"status": state}
                elif not isinstance(state, dict):
                    continue

                # 2. Recupera last_seen (dal dict, dalla mappa globale di state.py o now)
                node_seen = global_last_seen.get(node_id, {})
                last_seen_ts = max(node_seen.values()) if node_seen else now
                last_seen = float(state.get("last_seen") or last_seen_ts)
                status = state.get("status", "UNKNOWN")

                # 3. Rilevamento disconnessione (nessun heartbeat per 60 secondi)
                if now - last_seen > 60 and status not in ["OFFLINE", "ERROR"]:
                    update_node_state(node_id, {"status": "OFFLINE"})
                    logger.warning(f"Nodo {node_id} marcato come OFFLINE (timeout heartbeat)")

                # 4. Archiviazione errori critici (in errore per più di 5 minuti)
                if status == "ERROR" and (now - last_seen > 300):
                    archive_node_error(node_id, state)
                    delete_node(node_id)
                    logger.error(f"Nodo {node_id} rimosso da Redis e archiviato su DB per errore prolungato.")

        except Exception as e:
            logger.error(f"Errore nel ciclo di watchdog: {e}")

        time.sleep(10)
