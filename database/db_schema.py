# database/db_schema.py
"""
Schéma de base de données
Note:  Les tables sont déjà créées dans Supabase (PostgreSQL)
Ce fichier est conservé pour référence mais n'exécute plus de CREATE TABLE
"""

from . db_connection_pg import get_conn

def init_db_if_needed() -> None:
    """
    Vérifie simplement que la connexion fonctionne. 
    Les tables sont gérées directement dans Supabase. 
    """
    try: 
        with get_conn() as c:
            c.execute("SELECT 1")  # Simple test de connexion
            print("✅ Connexion à Supabase OK")
    except Exception as e:
        print(f"⚠️ Erreur de connexion à la base :  {e}")