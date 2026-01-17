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

@st.cache_resource
def get_connection_pool():
    """
    Pool de connexion réutilisables.
    """
    connection_string = get_connection_string()
    return pool.ThreadedConnectionPool(
        minconn=2,
        maxconn=10,
        dsn=connection_string
    )

@contextmanager
def get_conn():
    """
    Context manager avec pooling de connexions.
    """
    connection_pool = get_connection_pool()
    conn = connection_pool.getconn()
    try:
        cursor = conn.cursor()
        yield cursor
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cursor.close()
        connection_pool.putconn(conn)

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
    
