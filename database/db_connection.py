"""
Connexion PostgreSQL pour Supabase avec pooling
Remplace l'ancienne connexion sans pool
"""

import psycopg2
from psycopg2 import pool
from contextlib import contextmanager
import streamlit as st

# Pool de connexions global
_connection_pool = None

def get_connection_string():
    """
    Récupère la chaîne de connexion depuis les secrects ou config locale.
    """
    try:
        # En production (Streamlit Cloud) - lire depuis secrects
        return st.secrets["database"]["connection_string"]
    except Exception as e:
        st.error("❌ Erreur : secrets non configurés ! Veuillez configurer les secrets de la base de données.")
        raise e

def get_pool():
    """
    Retourne le pool de connexions (singleton).
    """
    global _coonnection_pool
    if _connection_pool is None:
        try:
            _connection_pool = pool.ThreadedConnectionPool(
                minconn=1,
                maxconn=10,
                dsn=get_connection_string()
            )
        except Exception as e:
            st.error(f"❌ Erreur connexion base de données : {e}")
            raise
    return _connection_pool

@contextmanager
def get_conn():
    """
    Context manager avec pooling de connexions.
    """
    conn = None
    try:
        conn = get_pool().getconn()
        cursor = conn.cursor()
        yield cursor
        conn.commit()
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Erreur dans la transaction : {e}")
        raise e
    finally:
        if conn:
            cursor.close()
            get_pool().putconn(conn)

def test_connection():
    """
    Test de connexion à Supabase.
    """
    try:
        with get_conn() as c:
            c.execute("SELECT version();")
            version = c.fetchone()
            print(f"✅ Connexion réussie ) PostgreSQL !")
            return True
    except Exception as e:
        print(f"❌ Échec de la connexion à PostgreSQL : {e}")
        return False

if __name__ == "__main__":
    test_connection()
    
