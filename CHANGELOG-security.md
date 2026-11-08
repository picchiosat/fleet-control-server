# Modifiche di sicurezza e correzioni / Security fixes & changes

Tutte le modifiche mantengono il comportamento precedente **per default**; ciò che cambia
visibilmente è indicato esplicitamente. / Every change keeps the previous behaviour **by default**;
visible differences are listed explicitly.

## Correzioni attive subito / Active immediately

| # | Modifica | Effetto visibile |
|---|----------|------------------|
| 1 | **Scheduler**: i profili/comandi vengono validati come in `/api/command`. `REBOOT`, `RESET_HAT`, `UPDATE_AGENT` possono essere schedulati solo da un `admin` (controllo al salvataggio **e** all'esecuzione). I nodi target vengono validati. | Un `node_admin` non può più programmare comandi riservati agli admin. Schedulazioni già presenti create da non-admin con quei comandi non vengono più eseguite (warning nel log). |
| 2 | **WebSocket `live_log_<nodo>`**: inviato solo ai socket con sessione valida **e** autorizzati su quel nodo (ruolo/`allowed_nodes` rivalidati ogni 2 min). | Nessuno per l'uso normale: la console log già richiedeva il login via `/api/logs/<nodo>`. Chi non è loggato non riceve più i log in diretta. |
| 3 | **Rate limit login dietro reverse proxy**: se la richiesta arriva da loopback con `X-Forwarded-For`, si usa l'IP reale (ultimo valore, aggiunto dal proxy). Con `trust_proxy: true` il comportamento è invariato. | Un utente che sbaglia la password non blocca più il login a tutti gli altri. |
| 4 | **Scheduler su thread dedicato**: non è più ritardato dal download degli ID DMR/NXDN. | Le schedulazioni partono puntuali anche durante i download. |
| 5 | **Pruning**: `telemetry_logs` (default 90 giorni) e `config_backups` (ultimi 100 per nodo/servizio) ora vengono potati. | Dati più vecchi di quelle soglie vengono eliminati; configurabile (0 = disattiva). |
| 6 | `save_to_sqlite` chiude sempre la connessione; `__main__` usa `web.port`; emoji corrotta nel log; `test-push.py` funzionante; nomi file in `install.txt` corretti; `chart.js` fissato alla versione 4.4.1. | Nessuno. |

## Opzioni nuove (tutte disattivate / invariate di default) / New opt-in options

Nel blocco `web` di `config.json` (vedi `config.json.example`):

* `require_login_for_read: true` – richiede il login per `/api/states`, `/api/logs`, `/api/stats`, `/api/clients` e limita `aprs_msg` ai soli utenti loggati. **Attenzione:** la vista pubblica della dashboard resterà vuota finché non si fa il login.
* `cors_origins: "https://tuo.dominio"` – restringe le origini ammesse per Socket.IO (default `"*"`, invariato).
* `ota_enabled: false` – disabilita l'aggiornamento OTA da interfaccia (`git pull` + riavvio).
* `trust_proxy`, `cookie_secure` (consigliato `true` dietro HTTPS), `session_hours`.

Nel blocco `mqtt`: `"tls": true` (+ `"ca_certs"`, porta tipicamente 8883) per cifrare la connessione al broker.
Altre chiavi: `telemetry_retention_days`, `config_backups_keep`.

## Non modificato di proposito / Deliberately left as is

* **Servizio come root e bind su 0.0.0.0**: cambiarlo di default romperebbe le installazioni esistenti
  (permessi su cartella/log, accesso diretto alla porta 9000). È incluso
  `systemd/fleet-console.hardened.service.example` con utente dedicato e hardening, da adottare quando vuoi.
* **CSP e SRI**: la UI usa molti stili e handler inline, quindi una CSP rigida la romperebbe; l'SRI richiede
  gli hash delle librerie (calcolabili con `curl -s URL | openssl dgst -sha384 -binary | openssl base64 -A`).
* **Broker MQTT**: l'autenticazione dei messaggi e le ACL per nodo si configurano sul broker (es. Mosquitto
  `acl_file`), non nel server.
* **Backup di config in chiaro**: i file `.ini` salvati in `config_backups` possono contenere password di rete.
  Proteggere `monitor.db` con permessi `600`.
* **Schedulazioni sovrapposte** sugli stessi nodi e ripristino del "profilo precedente": non gestiti.
