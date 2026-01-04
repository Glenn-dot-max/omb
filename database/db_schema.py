# database/ db_schema.py
import sqlite3
import time
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple, List, Dict
from pathlib import Path
from .db_connection import get_conn

# =====================================================================
#                        Initialisation du schéma
# =====================================================================

def init_db_if_needed(db_path: Optional[str] = None) -> None:
  with get_conn(db_path=db_path) as c: 
      try: c.execute("PRAGMA journal_mode=WAL")
      except Exception: pass
      try: c.execute("PRAGMA busy_timeout=5000")
      except Exception: pass
      try: c.execute("PRAGMA foreign_keys=ON")
      except Exception: pass

      # Table des catégories
      c.execute("""
          CREATE TABLE IF NOT EXISTS categories(
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              nom TEXT UNIQUE NOT NULL
          )
      """)
      
      # Table des types
      c.execute("""
          CREATE TABLE IF NOT EXISTS types(
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            nom TEXT UNIQUE NOT NULL
          )
      """)

      # Table des types par défaut
      types_defaut = [
         "Sucré",
         "Salé"
      ]

      for type_nom in types_defaut:
        try:
            c.execute("INSERT OR IGNORE INTO types (nom) VALUES (?)", (type_nom,))
        except Exception:
           pass
        
      # Gestionnaire de produits
      c.execute("""
          CREATE TABLE IF NOT EXISTS produits(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            categorie_id INTEGER,
            type_id INTEGER, 
            produit TEXT,
            FOREIGN KEY (categorie_id) REFERENCES categories(id),
            FOREIGN KEY (type_id) REFERENCES types(id)
        )
      """)

      # Table des formules (header)
      c.execute("""
          CREATE TABLE IF NOT EXISTS formules(
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            nom_formule TEXT UNIQUE NOT NULL,
            date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )                
      """)

      # Table des units
      c.execute("""
          CREATE TABLE IF NOT EXISTS unite(
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            nom TEXT UNIQUE NOT NULL
          )
      """)

      # Table des units par défaut
      unite_defaut = [
         "unité",
         "g",
         "Kg",
         "L",
         "mL"
      ]

      for type_units in unite_defaut:
        try:
            c.execute("INSERT OR IGNORE INTO unite (nom) VALUES (?)", (type_units,))
        except Exception:
           pass

      # Table de liaison formules-produits(détails)
      c.execute("""
          CREATE TABLE IF NOT EXISTS formule_produits(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            formule_id INTEGER NOT NULL,
            produit_id INTEGER NOT NULL,
            quantite REAL NOT NULL DEFAULT 1,
            unite_id INTEGER NOT NULL,
            FOREIGN KEY (formule_id) REFERENCES formules(id) ON DELETE CASCADE,
            FOREIGN KEY (produit_id) REFERENCES produits(id),
            FOREIGN KEY (unite_id) REFERENCES unite(id),
            UNIQUE(formule_id, produit_id)
          )                
      """)

      # Table de référencement des commandes 
      c.execute("""
          CREATE TABLE IF NOT EXISTS carnet_commande(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nom_client TEXT NOT NULL,
            nombre_couverts INTEGER NOT NULL,
            service INTEGER CHECK(service IN (0, 1)) DEFAULT 0,
            delivery_date DATE,
            delivery_hour TIME,
            notes TEXT
          )            
      """)

      # Table liaison commandes-formules
      c.execute("""
          CREATE TABLE IF NOT EXISTS commande_formules(
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            commande_id INTEGER NOT NULL,
            formule_id INTEGER NOT NULL,
            quantite_recommandee REAL, -- nombre_couverts * quanite_par_personne
            quantite_finale REAL, -- quantité ajustée par l'utilisateur
            FOREIGN KEY (commande_id) REFERENCES carnet_commande(id) ON DELETE CASCADE,
            FOREIGN KEY (formule_id) REFERENCES formules(id),
            UNIQUE(commande_id, formule_id)
          )
      """)

      # Table liaison commande-produits individuels 
      c.execute("""
          CREATE TABLE IF NOT EXISTS commande_produits(
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            commande_id INTEGER NOT NULL,
            produit_id INTEGER NOT NULL,
            quantite REAL NOT NULL,
            unite_id INTEGER, 
            FOREIGN KEY (commande_id) REFERENCES carnet_commande(id) ON DELETE CASCADE,
            FOREIGN KEY (unite_id) REFERENCES unite(id),
            UNIQUE(commande_id, produit_id)
          )
      """)

      # Table archivage des commandes 
      c.execute("""
          CREATE TABLE IF NOT EXISTS commandes_archivees(
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            commande_id_origine INTEGER,
            nom_client TEXT NOT NULL,
            nombre_couverts INTEGER NOT NULL, 
            service INTEGER, 
            delivery_date DATE, 
            delivery_hour TIME,
            date_archivage TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            statut TEXT DEFAULT 'Livrée',
            notes TEXT
          )
      """)

      # Table archivages formules
      c.execute("""
          CREATE TABLE IF NOT EXISTS archives_formules(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            archive_id INTEGER NOT NULL,
            formule_nom TEXT,
            quantite_recommandee REAL,
            quantite_finale REAL,
            FOREIGN KEY (archive_id) REFERENCES commandes_archivees(id) ON DELETE CASCADE
          )
      """)

      # Table archivage produits 
      c.execute("""
          CREATE TABLE IF NOT EXISTS archives_produits(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            archive_id INTEGER NOT NULL,
            produit_nom TEXT, 
            quantite REAL, 
            unite TEXT, 
            FOREIGN KEY (archive_id) REFERENCES commandes_archivees(id) ON DELETE CASCADE
          )
      """)
