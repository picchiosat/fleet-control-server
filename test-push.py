"""Invia una notifica push di prova a tutti gli iscritti, senza avviare MQTT e i thread dell'app.

Uso (dalla cartella del progetto, con il venv attivo):   python test-push.py
"""
from core.database import init_db
from services.push_service import _send_push

init_db()
print("🚀 Starting notification test...")
_send_push("⚠️ ALLERTA FLOTTA", "Test Push Notification: System Online!", None)
print("✅ Command sent.")
