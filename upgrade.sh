#!/usr/bin/env bash
set -e

# Forza l'esecuzione nella cartella in cui risiede lo script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "============================================================"
echo "   Fleet Control Server - Aggiornamento & Migrazione v7.0.0"
echo "============================================================"

# 1. Installazione del pacchetto di sistema Redis
if ! command -v redis-server &> /dev/null; then
    echo "📦 Installazione del demone Redis via APT..."
    sudo apt update
    sudo apt install -y redis-server
else
    echo "✅ redis-server già installato."
fi

# 2. Configurazione di /etc/redis/redis.conf (Persistenza AOF)
REDIS_CONF="/etc/redis/redis.conf"
if [ -f "$REDIS_CONF" ]; then
    echo "⚙️ Configurazione persistenza in $REDIS_CONF..."
    # Imposta appendonly yes
    if grep -q "^#* *appendonly" "$REDIS_CONF"; then
        sudo sed -i 's/^#* *appendonly .*/appendonly yes/' "$REDIS_CONF"
    else
        echo "appendonly yes" | sudo tee -a "$REDIS_CONF" > /dev/null
    fi

    # Imposta appendfsync everysec
    if grep -q "^#* *appendfsync" "$REDIS_CONF"; then
        sudo sed -i 's/^#* *appendfsync .*/appendfsync everysec/' "$REDIS_CONF"
    else
        echo "appendfsync everysec" | sudo tee -a "$REDIS_CONF" > /dev/null
    fi
    echo "✅ redis.conf aggiornato con 'appendonly yes'."
fi

# 3. Riavvio e verifica del servizio Redis
echo "🚀 Riavvio del servizio Redis..."
sudo systemctl enable redis-server
sudo systemctl restart redis-server

if redis-cli ping | grep -q "PONG"; then
    echo "✅ Redis è attivo e risponde correttamente (PONG)."
else
    echo "❌ Errore: Redis non risponde sulla porta 6379."
    exit 1
fi

# 4. Aggiornamento dipendenze Python nel virtualenv
if [ -d "venv" ]; then
    echo "🐍 Aggiornamento dipendenze nel venv (inclusa libreria redis)..."
    venv/bin/pip install --upgrade pip
    venv/bin/pip install -r requirements.txt
else
    echo "⚠️ Cartella venv non trovata. Esegui 'pip install -r requirements.txt' nel tuo ambiente."
fi

# 5. Migrazione automatica di config.json (eseguita inline da Python)
echo "⚙️ Controllo e allineamento di config.json..."
PYTHON_BIN="python3"
[ -f "venv/bin/python3" ] && PYTHON_BIN="venv/bin/python3"

$PYTHON_BIN - << 'EOF'
import json
import os
import sys

config_path = "config.json"

if not os.path.exists(config_path):
    print(f"⚠️ {config_path} non trovato. Nulla da migrare.")
    sys.exit(0)

try:
    with open(config_path, "r", encoding="utf-8") as f:
        cfg = json.load(f)
except Exception as e:
    print(f"❌ Errore nella lettura di {config_path}: {e}")
    sys.exit(1)

if "web" not in cfg:
    cfg["web"] = {}

if "redis_url" not in cfg["web"]:
    print("🔧 Aggiunta della direttiva 'redis_url' in config.json...")
    cfg["web"]["redis_url"] = "redis://localhost:6379/0"
    
    # Backup di sicurezza preventivo
    bak_path = config_path + ".bak"
    try:
        with open(config_path, "r", encoding="utf-8") as rf:
            with open(bak_path, "w", encoding="utf-8") as wf:
                wf.write(rf.read())
        print(f"💾 Backup salvato in {bak_path}")
    except Exception as e:
        print(f"⚠️ Impossibile salvare backup: {e}")

    # Scrittura atomica per evitare file vuoti o corrotti
    tmp_path = config_path + ".tmp"
    with open(tmp_path, "w", encoding="utf-8") as f:
        json.dump(cfg, f, indent=4)
    os.replace(tmp_path, config_path)
    print("✅ config.json aggiornato con successo.")
else:
    print("ℹ️ config.json contiene già la configurazione Redis.")
EOF

echo ""
echo "🎉 Aggiornamento completato con successo!"
echo "Puoi avviare o riavviare il servizio: sudo systemctl restart fleet-control"
