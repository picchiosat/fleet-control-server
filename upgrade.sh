#!/usr/bin/env bash
set -e

echo "=== Aggiornamento Fleet Control Server (Redis Migration) ==="

# 1. Verifica e installazione del pacchetto di sistema Redis
if ! command -v redis-server &> /dev/null; then
    echo "📦 Installazione del demone Redis via APT..."
    sudo apt update
    sudo apt install -y redis-server
else
    echo "✅ redis-server già presente nel sistema."
fi

# 2. Avvio e abilitazione del servizio al boot
echo "🚀 Verifica stato servizio Redis..."
sudo systemctl enable --now redis-server
sudo systemctl restart redis-server

# Test rapido di risposta
if redis-cli ping | grep -q "PONG"; then
    echo "✅ Redis è attivo e risponde (PONG)."
else
    echo "❌ Errore: Redis non risponde sulla porta 6379."
    exit 1
fi

# 3. Installazione della libreria Python nel Virtualenv
if [ -d "venv" ]; then
    echo "🐍 Aggiornamento dipendenze nel virtualenv (incluso modulo redis)..."
    venv/bin/pip install --upgrade pip
    venv/bin/pip install -r requirements.txt
else
    echo "⚠️ Cartella venv non trovata. Esegui 'pip install -r requirements.txt' nel tuo ambiente Python."
fi

# 4. Aggiornamento automatico di config.json
if [ -f "migrate.py" ]; then
    echo "⚙️ Controllo e migrazione di config.json..."
    python3 migrate.py
fi

echo ""
echo "🎉 Aggiornamento completato con successo!"
echo "Ora puoi riavviare il servizio: sudo systemctl restart fleet-control"
