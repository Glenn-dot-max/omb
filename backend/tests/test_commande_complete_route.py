# backend/tests/test_commande_complete_route.py
from datetime import date, timedelta
from unittest.mock import MagicMock, patch
from postgrest.exceptions import APIError

# ===========================================
# TESTS - Route POST /commandes/complete (P3b)
# ===========================================

FORMULE_A = "c9ffddc5-70cf-4cf0-b4c3-960679a94de6"
FORMULE_B = "a1b2c3d4-0000-4000-8000-000000000001"
PRODUIT_A = "f04478e9-3951-43f0-a5cb-6e21c9e36b9d"
PRODUIT_B = "e1234567-89ab-4def-8000-000000000002"

def payload():
  """Une commande complète : 2 formules (dont une avec exclusion) + 2 produits"""
  return {
    "nom_client": "Martin",
    "nombre_couverts": 10,
    "delivery_date": (date.today() + timedelta(days=1)).isoformat(),
    "delivery_hour": "10:00",
    "formules": [
        {"formule_id": FORMULE_A, "quantite_finale": 10, "produits_exclus": [PRODUIT_B]},
        {"formule_id": FORMULE_B, "quantite_finale": 4}
    ],
    "produits": [
        {"produit_id": PRODUIT_A, "quantite": 2, "unite": "unité"},
        {"produit_id": PRODUIT_B, "quantite": 3, "unite": "kg"},
    ],
  }

def fake_db(liens_formules, liens_produits, doublon=None, erreur_produits=None):
  """Fausse base : une fausse table par nom, gardée dans `tables`pour l'inspecter après coup."""
  tables = {}

  def inserer_avec_ids(lignes):
    """Simule un insert qui renvoie les lignes avec un id (1, 2, 3...)"""
    resultat = MagicMock()
    resultat.execute.return_value.data = [{**ligne, "id": i + 1} for i, ligne in enumerate(lignes)]
    return resultat

  def table(name):
    if name in tables:
      return tables[name]
    t = MagicMock()
    if name == "carnet_commande":
      # Contrôle de doublon : select + 5 filtres .eq
      t.select.return_value.eq.return_value.eq.return_value.eq.return_value.eq.return_value.eq.return_value.execute.return_value.data = doublon or []
      t.insert.return_value.execute.return_value.data = [{"id": "cmd-1", "nom_client": "Martin"}]
    elif name == "franchise_formules":
      t.select.return_value.eq.return_value.eq.return_value.in_.return_value.execute.return_value.data = liens_formules
    elif name == "franchise_produits":
      t.select.return_value.eq.return_value.eq.return_value.in_.return_value.execute.return_value.data = liens_produits
    elif name == "commande_formules":
      t.insert.side_effect = inserer_avec_ids
    elif name == "commande_produits" and erreur_produits:
      t.insert.return_value.execute.side_effect = erreur_produits
    tables[name] = t
    return t

  return table, tables

TOUS_LIENS_FORMULES = [{"formule_id": FORMULE_A}, {"formule_id": FORMULE_B}]
TOUS_LIENS_PRODUITS = [{"produit_id": PRODUIT_A}, {"produit_id": PRODUIT_B}]



def test_commande_complete_creee_en_lots(client, auth_headers):
  """Tout est créé, avec UNE insertion par table (et pas une par formule/produit)"""
  table, tables = fake_db(TOUS_LIENS_FORMULES, TOUS_LIENS_PRODUITS)
  with patch("routes.commandes.supabase") as mock_db:
    mock_db.table.side_effect = table
    response = client.post("/commandes/complete", headers=auth_headers, json=payload())

  assert response.status_code == 200
  assert response.json()["id"] == "cmd-1"

  # 1 seule insertion de commande, rattachée à la franchise de l'utilisateur
  tables["carnet_commande"].insert.assert_called_once()
  lignes_formules = tables["commande_formules"].insert.call_args[0][0]
  assert len(lignes_formules) == 2
  assert all (l["commande_id"] == "cmd-1" for l in lignes_formules)

  # exclusion rattachée à la bonne commande_formule (id 1 = FORMULE_A)
  exclusions = tables["commande_formule_exclusions"].insert.call_args[0][0]
  assert exclusions == [{"commande_formule_id": 1, "produit_id": PRODUIT_B}]

  # 1 seule insertion pour les 2 produits
  tables['commande_produits'].insert.assert_called_once()
  assert len(tables["commande_produits"].insert.call_args[0][0]) == 2

  # Les droits sont vérifiés sur la franchise de l'utilisateur
  tables["franchise_formules"].select.return_value.eq.assert_called_once_with("franchise_id", "franchise-abc")

def test_commande_complete_formule_non_accessible_rien_n_est_cree(client, auth_headers):
  """Une formule pas disponible pour la franchise -> 404,  et AUCUNE insertion"""
  table, tables = fake_db([{"formule_id": FORMULE_A}], TOUS_LIENS_PRODUITS)
  with patch("routes.commandes.supabase") as mock_db:
    mock_db.table.side_effect = table
    response = client.post("/commandes/complete", headers=auth_headers, json=payload())

  assert response.status_code == 404
  tables["carnet_commande"].insert.assert_not_called()

def test_commande_complete_produit_non_accessible_rien_n_est_cree(client, auth_headers):
  table, tables = fake_db(TOUS_LIENS_FORMULES, [{"produit_id": PRODUIT_A}])
  with patch("routes.commandes.supabase") as mock_db:
    mock_db.table.side_effect = table
    response = client.post("/commandes/complete", headers=auth_headers, json=payload())

  assert response.status_code == 404
  tables["carnet_commande"].insert.assert_not_called()

def test_commande_complete_doublon_409(client, auth_headers):
    """Une commande identique existe déjà -> 409, rien n'est créé"""
    table, tables = fake_db(TOUS_LIENS_FORMULES, TOUS_LIENS_PRODUITS, doublon=[{"id": "existante"}])
    with patch("routes.commandes.supabase") as mock_db:
        mock_db.table.side_effect = table
        response = client.post("/commandes/complete", headers=auth_headers, json=payload())

    assert response.status_code == 409
    tables["carnet_commande"].insert.assert_not_called()

def test_commande_complete_echec_en_cours_annule_la_commande(client, auth_headers):
    """Si l'insertion des produits échoue, la commande déjà créée est supprimée"""
    erreur = APIError({"message": "erreur base", "code": "XX000", "hint": None, "details": None})
    table, tables = fake_db(TOUS_LIENS_FORMULES, TOUS_LIENS_PRODUITS, erreur_produits=erreur)
    with patch("routes.commandes.supabase") as mock_db:
        mock_db.table.side_effect = table
        response = client.post("/commandes/complete", headers=auth_headers, json=payload())

    assert response.status_code == 500
    tables["carnet_commande"].delete.return_value.eq.assert_called_once_with("id", "cmd-1")

def test_commande_complete_compte_sans_franchise_400(client, catalog_admin_headers):
    """Un compte sans franchise ne peut pas créer de commande -> 400"""
    with patch("routes.commandes.supabase"):
        response = client.post("/commandes/complete", headers=catalog_admin_headers, json=payload())

    assert response.status_code == 400

                       

  