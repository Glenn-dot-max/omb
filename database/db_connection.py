# database/ db_connection.py
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Optional

DB_PATH = Path("data/omb.db")

@contextmanager
def get_conn(db_path: Optional[str] = None):
  """Context manager pour connexion SQLite"""
  path = db_path or DB_PATH
  Path(path).parent.mkdir(parents=True, exist_ok=True)
  conn = sqlite3.connect(path)
  try:
      yield conn.cursor()
      conn.commit()
  except Exception as e:
     conn.rollback()
     raise e
  finally:
    conn.close()