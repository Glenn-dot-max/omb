# backend/tests/test_commande_retraits.py
from unittest.mock import MagicMock, patch
import pytest
from pydantic import ValidationError
from models import CommandeModification

# ===========================================
# TESTS - Modifier une commande : retirer des formules / produits, changer une quantité (V5.4c1)
# Tout part dans le même appel que le reste de la modification, et seulement à l'enregistrement.
# ===========================================

COMMANDE = "8c4551e7-5f00-4376-ab72-1757c4f5dff5"

# ---------- Modèle ----------

def test_modele_retraits_et_quantites_acceptes():
    m = CommandeModification(
        formules_retirees=[708],
        produits_retires=[31],
        produits_modifies=[{"commande_produit_id": 32, "quantite": 2.5}],
    )
    assert (m.formules_retirees, m.produits_retires) == ([708], [31])
    assert m.produits_modifies[0].quantite == 2.5

@pytest.mark.parametrize("champs", [
    {"formules_retirees": [708, 708]},                                         # en double
    {"produits_retires": [31, 31]},                                            # en double
    {"formules_retirees": [708],
     "formules_modifiees": [{"commande_formule_id": 708, "quantite_finale": 3}]},  # modifiée ET retirée
    {"produits_retires": [32], "produits_modifies": [{"commande_produit_id": 32, "quantite": 2}]},
    {"produits_modifies": [{"commande_produit_id": 32, "quantite": 0}]},       # quantité nulle
    {"produits_modifies": [{"commande_produit_id": 32, "quantite": 2, "unite": "kg"}]},  # champ inconnu
])
def test_modele_retraits_incoherents_refuses(champs):
    with pytest.raises(ValidationError):
        CommandeModification(**champs)

# ---------- Route ----------

def fausse_base(formules_de_la_commande=(708, 709), produits_de_la_commande=(31, 32)):
    """Fausse base : la commande existe ; ses formules et produits sont ceux donnés"""
    tables = {}
    def table(nom):
        if nom in tables:
            return tables[nom]
        t = MagicMock()
        if nom == "carnet_commande":
            t.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = [{"id": COMMANDE}]
        if nom == "commande_formules":
            t.select.return_value.eq.return_value.in_.return_value.execute.return_value.data = [
                {"id": i} for i in formules_de_la_commande
            ]
        if nom == "commande_produits":
            t.select.return_value.eq.return_value.in_.return_value.execute.return_value.data = [
                {"id": i} for i in produits_de_la_commande
            ]
        tables[nom] = t
        return t
    return table, tables

def modifier(client, headers, table, corps):
    with patch("routes.commandes.supabase") as mock_db, patch("routes.commandes.noter_historique") as noter:
        mock_db.table.side_effect = table
        response = client.put(f"/commandes/{COMMANDE}/complete", headers=headers, json=corps)
    return response, noter

def test_retirer_une_formule_et_un_produit_changer_une_quantite(client, auth_headers):
    table, tables = fausse_base()
    response, noter = modifier(client, auth_headers, table, {
        "formules_retirees": [709],
        "produits_retires": [31],
        "produits_modifies": [{"commande_produit_id": 32, "quantite": 4}],
    })

    assert response.status_code == 200
    tables["commande_formules"].delete.return_value.in_.assert_called_once_with("id", [709])
    tables["commande_produits"].delete.return_value.in_.assert_called_once_with("id", [31])
    tables["commande_produits"].update.assert_called_once_with({"quantite": 4.0})
    tables["commande_produits"].update.return_value.eq.assert_called_once_with("id", 32)
    # Les informations de la commande ne sont pas touchées (pas de champ envoyé)
    tables["carnet_commande"].update.assert_not_called()
    # Noté dans l'historique
    details = noter.call_args[0][5]
    assert (details["formules_retirees"], details["produits_retires"], details["produits_modifies"]) == (1, 1, 1)

def test_formule_d_une_autre_commande_404_rien_n_est_retire(client, auth_headers):
    table, tables = fausse_base(formules_de_la_commande=(708,))  # 999 n'est pas dans cette commande
    response, _ = modifier(client, auth_headers, table, {"formules_retirees": [999]})

    assert response.status_code == 404
    tables["commande_formules"].delete.assert_not_called()

def test_produit_d_une_autre_commande_404_rien_n_est_ecrit(client, auth_headers):
    table, tables = fausse_base(produits_de_la_commande=(31,))  # 77 n'est pas dans cette commande
    response, _ = modifier(client, auth_headers, table, {
        "nom_client": "Martin SA",
        "produits_modifies": [{"commande_produit_id": 77, "quantite": 4}],
    })

    assert response.status_code == 404
    tables["carnet_commande"].update.assert_not_called()
    tables["commande_produits"].update.assert_not_called()

# ---------- Anciennes routes de l'ancien frontend (retrait immédiat) : notées aussi ----------

@pytest.mark.parametrize("route, module, details", [
    ("/commande-formules/708", "routes.commande_formules", {"formules_retirees": 1}),
    ("/commande-produits/31", "routes.commande_produits", {"produits_retires": 1}),
])
def test_ancien_retrait_note_dans_l_historique(client, auth_headers, route, module, details):
    with patch(f"{module}.supabase") as mock_db, \
         patch(f"{module}.get_or_404", return_value={"commande_id": COMMANDE}), \
         patch(f"{module}.verify_commande_ownership"), \
         patch(f"{module}.noter_historique") as noter:
        mock_db.table.return_value.delete.return_value.eq.return_value.execute.return_value.data = [{"id": 1}]
        response = client.delete(route, headers=auth_headers)

    assert response.status_code == 200
    _, commande_id, _, _, action, detail = noter.call_args[0]
    assert (commande_id, action, detail) == (COMMANDE, "modification", details)
