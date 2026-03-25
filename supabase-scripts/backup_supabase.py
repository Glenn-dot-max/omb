import os
import json
from datetime import datetime
from pathlib import Path
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

TABLES = ["categories", "types", "produits", "formules", "carnet_commande",
          "formule_produits", "commande_formules", "commande_produits"]

timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
backup_dir = Path(f"backups/omb_{timestamp}")
backup_dir.mkdir(parents=True, exist_ok=True)

for table in TABLES:
  print(f"📥 {table}...")
  response = supabase.table(table).select("*").execute()
  with open(backup_dir / f"{table}.json", 'w') as f:
    json.dump(response.data, f, indent=2, default=str)
  print(f"  ✅ {len(response.data)} lignes")

print(f"\nSauvegarde terminée dans le dossier : {backup_dir.resolve()}")