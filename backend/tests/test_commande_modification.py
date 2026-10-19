# backend/tests/test_commande_modification.py
import pytest
from unittest.mock import MagicMock, patch
from pydantic import ValidationError
from models import CommandeModification

# ================================================
# TESTS - Modification d'une commande en un seul appel (P5a)
# ================================================

FORMULE_C = "c9ffddc5-70cf-4cf0-b4c3-960679a94de6"
PRODUIT_A = "f04478e9-3951-43f0-a5cb-6e21c9e36b9d"
PRODUIT_B = "b2c3d4e5-0000-4000-8000-000000000002"
COMMANDE = "8c4551e7-5f00-4376-ab72-1757c4f5dff5"

def payload():
  """Modif: nouvelle heure, 2 formules existantes (708 avec 1 exclusion, 709 sans),
  1 formule ajoutée, 1 produit ajouté"""
  return {
    "delivery_hour": "11:30",
    "formules_modifiees": [
      {"commande_formule_id": 708, "quantite_finale": 12, "produits_exclus": [PRODUIT_A]},
      {"commande_formule_id": 709, "quantite_finale": 4},
    ],
    "formules_ajoutees": [{"formule_id": FORMULE_C, "quantite_finale": 6, "produits_exclus": [PRODUIT_B]}],
    "produits_ajoutes": [{"produit_id": PRODUIT_A, "quantite": 2, "unite": "unité"}],
  }

# --- Tests du modèle ---

def test_modele_formule_ajoutee_en_double_refusee():
    with pytest.raises(ValidationError):
       CommandeModification(formules_ajoutees=[
          {"formule_id": FORMULE_C, "quantite_finale": 1},
          {"formule_id": FORMULE_C, "quantite_finale": 2},
       ])

def test_modele_formule_modifiee_en_double_refusee():
   with pytest.raises(ValidationError):
       CommandeModification(formules_modifiees=[
          {"commande_formule_id": 708, "quantite_finale": 1},
          {"commande_formule_id": 708, "quantite_finale": 2},
       ])

def test_modele_modification_vide_acceptee():
    """Ne changer que l'heure, sans toucher au contenu, est validé"""
    m = CommandeModification(delivery_hour="11:30")
    assert m.formules_modifiees == []

@pytest.mark.parametrize("nom", ["<img src=x onerror=alert(1)>", "Dupont <b>", "   "])
def test_modele_modification_nom_client_invalide_refuse(nom):
    """À la modification, le nom du client suit les mêmes règles qu'à la création (3.1)"""
    with pytest.raises(ValidationError):
        CommandeModification(nom_client=nom)

def test_modele_modification_nom_client_valide_accepte():
    """Nom valide accepté, espaces autour retirés"""
    m = CommandeModification(nom_client ="  Mariage Durand  ")
    assert m.nom_client == "Mariage Durand"

# --- Fausse base pour la route ---

def fake_db(commande_trouvee=True, formules_de_la_commande=(708, 709), liens_formules=None):
    tables = {}

    def inserer_avec_ids(lignes):
       resultat = MagicMock()
       resultat.execute.return_value.data = [{**l, "id": 900 + i} for i, l in enumerate(lignes)]
       return resultat

    def table(name):
        if name in tables:
            return tables[name]
        t = MagicMock()
        if name == "carnet_commande":
            # verify_commande_ownership : select + 2 filtres .eq
            t.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = (
                [{"id": COMMANDE}] if commande_trouvee else []
            )
        elif name == "commande_formules":
            t.select.return_value.eq.return_value.in_.return_value.execute.return_value.data = [
                {"id": i} for i in formules_de_la_commande
            ]
            t.insert.side_effect = inserer_avec_ids
        elif name == "franchise_formules":
            t.select.return_value.eq.return_value.eq.return_value.in_.return_value.execute.return_value.data = (
                liens_formules if liens_formules is not None else [{"formule_id": FORMULE_C}]
            )
        elif name == "franchise_produits":
            t.select.return_value.eq.return_value.eq.return_value.in_.return_value.execute.return_value.data = [
                {"produit_id": PRODUIT_A}
            ]
        tables[name] = t
        return t

    return table, tables

def appeler(client, headers, table):
    with patch("routes.commandes.supabase") as mock_db:
        mock_db.table.side_effect = table
        return client.put(f"/commandes/{COMMANDE}/complete", headers=headers, json=payload())

# --- Tests de la route ----

def test_modification_complete_en_un_appel(client, auth_headers):
    table, tables = fake_db()
    response = appeler(client, auth_headers, table)

    assert response.status_code == 200

    # Infos de la commande : une seule mise à jour, avec l'heure en texte
    tables["carnet_commande"].update.assert_called_once()
    assert tables["carnet_commande"].update.call_args[0][0] == {"delivery_hour": "11:30:00"}

    # Couverts des 2 formules existantes mis à jour 
    assert tables["commande_formules"].update.call_count == 2

    # Anciennes exclusions des formules existantes supprimées EN UNE FOIS
    tables["commande_formule_exclusions"].delete.return_value.in_.assert_called_once_with(
        "commande_formule_id", [708, 709]
    )

    # Toutes les nouvelles exclusions insérées EN UNE FOIS (formule existante 708 + formule ajoutée id 900)
    tables["commande_formule_exclusions"].insert.assert_called_once()
    exclusions = tables["commande_formule_exclusions"].insert.call_args[0][0]
    assert {"commande_formule_id": 708, "produit_id": PRODUIT_A} in exclusions
    assert {"commande_formule_id": 900, "produit_id": PRODUIT_B} in exclusions

    # Ajouts : une insetion pour les formules, une pour les produits 
    tables["commande_formules"].insert.assert_called_once()
    tables["commande_produits"].insert.assert_called_once()

def test_modification_commande_autre_franchise_404(client, auth_headers):
    table, tables = fake_db(commande_trouvee=False)
    response = appeler(client, auth_headers, table)

    assert response.status_code == 404
    tables["carnet_commande"].update.assert_not_called()

def test_modification_formule_d_une_autre_commande_404(client, auth_headers):
    """commande_formule_id 709 n'appartient pas à cette commande -> 404, rien n'est écrit"""
    table, tables = fake_db(formules_de_la_commande=(708,))
    response = appeler(client, auth_headers, table)

    assert response.status_code == 404
    tables["carnet_commande"].update.assert_not_called()
    tables["commande_formules"].update.assert_not_called()

def test_modification_formule_ajoutee_non_accessible_404(client, auth_headers):
    table, tables = fake_db(liens_formules=[])
    response = appeler(client, auth_headers, table)

    assert response.status_code == 404
    tables["carnet_commande"].update.assert_not_called()

def test_modification_compte_sans_franchise_400(client, catalog_admin_headers):
    with patch("routes.commandes.supabase"):
        response = client.put(f"/commandes/{COMMANDE}/complete", headers=catalog_admin_headers, json=payload())

    assert response.status_code == 400
