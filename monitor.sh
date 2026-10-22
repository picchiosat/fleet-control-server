#!/bin/bash
echo "⏳ In ascolto di crash o timeout su Fleet Console... (Premi CTRL+C per fermare)"
echo "--------------------------------------------------------------------------------"

# Cattura gli errori dal demone systemd (Gunicorn)
journalctl -u fleet-console -f | grep --line-buffered --color=always -iE "error|traceback|exception|timeout|worker|exited|failed|killed|critical" &

# Cattura gli errori dal file di log di Python
tail -F /opt/fleet-control-server/fleet_console.log | grep --line-buffered --color=always -iE "error|traceback|exception|locked|critical" &

wait
