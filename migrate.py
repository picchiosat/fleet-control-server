#!/usr/bin/env python3
import json
import os
import sys

config_path = "config.json"

if not os.path.exists(config_path):
    print(f"⚠️ {config_path} non trovato. Nessuna migrazione necessaria.")
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
    print("🔧 Aggiunta della configurazione Redis a config.json...")
    cfg["web"]["redis_url"] = "redis://localhost:6379/0"
    
    bak_path = config_path + ".bak"
    try:
        with open(config_path, "r", encoding="utf-8") as rf:
            with open(bak_path, "w", encoding="utf-8") as wf:
                wf.write(rf.read())
        print(f"💾 Backup creato in {bak_path}")
    except Exception as e:
        print(f"⚠️ Impossibile creare backup: {e}")

    tmp_path = config_path + ".tmp"
    with open(tmp_path, "w", encoding="utf-8") as f:
        json.dump(cfg, f, indent=4)
    os.replace(tmp_path, config_path)
    print("✅ config.json aggiornato con successo!")
else:
    print("ℹ️ config.json contiene già la configurazione Redis.")
