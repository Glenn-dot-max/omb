# backend/tests/test_formule_complete.py
import pytest
from unittest.mock import MagicMock, patch
from pydantic import ValidationError
from models import FormuleCreate

# ================================================
# TESTS - Création d'une formule AVEC ses produits en un seul appel (P5b)
# ================================================

PRODUIT_A = "f04478e9-3951-43f0-a5cb-6e21c9e36b9d"
PRODUIT_B = "b2c3d4e5-0000-4000-8000-000000000002"

def payload():
  return {
    "name": "Brunch test",
    "nombre_couverts": 4,
    "produits": [
      {"produit_id": PRODUIT_A, "quantite": 2, "unite": "unité"},
      {"produit_id": PRODUIT_B, "quantite": 1.5, "unite": "kg"},
    ],
  }

# --- Modèle ---

def test_modele_sans_produits_reste_valide():
    """Compatibilité : créer une formule sans produits fonctionne toujours"""
    f = FormuleCreate(name="Brunch", nombre_couverts=4)
    assert f.produits == []

def test_modele_produit_en_double_refuse():
   with pytest.raises(ValidationError):
      FormuleCreate(name="Brunch", nombre_couverts=4, produits=[
         {"produit_id": PRODUIT_A, "quantite": 1},
         {"produit_id": PRODUIT_A, "quantite": 2},
      ])

# --- Fausse base pour la route ---

def fake_db(liens_produits):
    tables = {}

    def table(name):
        if name in tables:
          return tables[name]
        t = MagicMock()
        if name == "formules":
            # Contrôle du nom : aucune formule du même nom
            t.select.return_value.eq.return_value.execute.return_value.data = []
            t.insert.return_value.execute.return_value.data = [{"id": "f-new", "name": "Brunch test", "nombre_couverts": 4}]
        elif name == "franchises":
            t.select.return_value.execute.return_value.data = [{"id": "fr-1"}, {"id": "fr-2"}]
        elif name == "franchise_produits":
            t.select.return_value.eq.return_value.eq.return_value.in_.return_value.execute.return_value.data = liens_produits
        tables[name] = t
        return t

    return table, tables

def appeler(client, headers, table):
    with patch("routes.formules.supabase") as mock_db:
      mock_db.table.side_effect = table
      return client.post("/formules/", headers=headers, json=payload())

# --- Route ---

def test_formule_creee_avec_produits_en_une_insertion(client, auth_headers):
    table, tables = fake_db([{"produit_id": PRODUIT_A}, {"produit_id": PRODUIT_B}])
    response = appeler(client, auth_headers, table)   

    assert response.status_code == 200
    tables["formule_produits"].insert.assert_called_once()
    lignes = tables["formule_produits"].insert.call_args[0][0]
    assert len(lignes) == 2
    assert all(l["formule_id"] == "f-new" for l in lignes)
    # Les droits sur les produits sont vérifiés sur la franchise de l'utilisateur
    tables["franchise_produits"].select.return_value.eq.assert_called_once_with("franchise_id", "franchise-abc")

def test_formule_produit_non_accessible_rien_n_est_cree(client, auth_headers):
    """Un produit pas disponible pour la franchise -> 404, la formule n'est PAS créée"""
    table, tables = fake_db([{"produit_id": PRODUIT_A}])
    response = appeler(client, auth_headers, table)

    assert response.status_code == 404
    # La table "formules" n'a même pas été touchée : refus AVANT toute écriture
    assert "formules" not in tables

def test_formule_admin_produits_sans_controle_franchise(client, admin_headers):
    """Un admin du catalogue compose avec tout le catalogue : pas de contrôle de franchise"""
    table, tables = fake_db([])
    response = appeler(client, admin_headers, table)

    assert response.status_code == 200
    assert "franchise_produits" not in tables
    tables["formule_produits"].insert.assert_called_once()

       