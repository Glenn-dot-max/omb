import os
import json
from pathlib import Path
from supabase import create_client
from dotenv import load_dotenv

load_dotenv('.env.new')

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Trouver le dossier de backup
backup_dir = list(Path("backups").glob("omb_*"))[0]
print(f"Backup : {backup_dir}")

TABLES = ["categories", "types", "unite", "produits", "formules", "carnet_commade",
          "formule_produits", "commande_formules", "commande_produits"]

for table in TABLES:
    file = backup_dir / f"{table}.json"
    if not file.exists():
        print(f" ⚠️ {table} : fichier introuvable")
        continue
    
    with open(file) as f:
        data = json.load(f)
      
    if data:
        print(f" ⏳ {table} : Insertion de {len(data)} lignes")
        supabase.table(table).insert(data).execute()
        print(f" ✅ {table} : Insertion terminée")
    else:
        print(f" ⚠️ {table} : Aucun donnée à insérer")

print("🎉 Restauration terminée !")