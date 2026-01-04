"""
Connexion PostgreSQL pour Supabase
Remplace l'ancienne connexion SQLite
"""

import psycopg2
from contextlib import contextmanager
import streamlit as st

def get_connection_string():
    """
    Récupère la chaîne de connexion depuis les secrets ou config locale
    """
    try:
        # En production (Streamlit Cloud) - lire depuis secrets
        return st.secrets["database"]["connection_string"]
    except:
        # En local (pour tester) - à remplacer par ta vraie URI
        # ⚠️ REMPLACE PAR TON URI SUPABASE COMPLÈTE (avec ton mot de passe)
        return "postgresql://postgres:tibceb-viqzef-7tucpY@db.vaevkhnkfjpfqqcbslvi.supabase.co:5432/postgres"

def get_db_connection():
    """
    Crée une connexion à PostgreSQL Supabase
    """
    try:
        conn = psycopg2.connect(
            get_connection_string()
            # Pas de cursor_factory = retourne des tuples normaux comme SQLite
        )
        return conn
    except Exception as e:
        print(f"Erreur de connexion à la base de données : {e}")
        raise

@contextmanager
def get_conn():
    """
    Context manager pour les connexions PostgreSQL
    Usage: with get_conn() as cursor:
    """
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        yield cursor
        conn.commit()
    except Exception as e:
        conn.rollback()
        print(f"Erreur dans la transaction : {e}")
        raise e
    finally:
        cursor.close()
        conn.close()

# Fonction helper pour tester la connexion
def test_connection():
    """
    Test de connexion à Supabase
    """
    try:
        with get_conn() as c:
            c.execute("SELECT version();")
            version = c.fetchone()
            print(f"✅ Connexion réussie à PostgreSQL !")
            print(f"Version : {version['version']}")
            return True
    except Exception as e:
        print(f"❌ Échec de connexion : {e}")
        return False

if __name__ == "__main__":
    # Test de connexion
    test_connection()