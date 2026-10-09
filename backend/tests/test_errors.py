# backend/tests/test_errors.py
from unittest.mock import patch
from postgrest.exceptions import APIError

# ==============================================
# TESTS - Gestion des doublons (contrainte d'unicité en base)
# ==============================================

DUPLICATE_ERROR = APIError({
    "message": "duplicate key value violates unique constraint",
    "code": "23505",
    "hint": None,
    "details": "Key (...) already exists"
})

def test_duplicate_produit_in_commande_returns_409(client, admin_headers):
    """Ajouter un produit déjà présent dans la commande -> 409 (et pas 500)"""
    with patch("routes.commande_produits.supabase") as mock_db:
        mock_db.table.return_value.insert.return_value.execute.side_effect = DUPLICATE_ERROR
        response = client.post("/commande-produits/", headers=admin_headers, json={
            "commande_id": "f4efe8e8-e861-4f1a-91a7-1d9e2608a8d6",
            "produit_id": "f04478e9-3951-43f0-a5cb-6e21c9e36b9d",
            "quantite": 2,
            "unite": "unité"
        })

    assert response.status_code == 409

def test_duplicate_formule_in_commande_returns_409(client, admin_headers):
    """Ajouter une formule déjà présente dans la commande -> 409 (et pas 500)"""
    with patch("routes.commande_formules.supabase") as mock_db:
        mock_db.table.return_value.insert.return_value.execute.side_effect = DUPLICATE_ERROR
        response = client.post("/commande-formules/", headers=admin_headers, json={
            "commande_id": "f4efe8e8-e861-4f1a-91a7-1d9e2608a8d6",
            "formule_id": "c9ffddc5-70cf-4cf0-b4c3-960679a94de6",
            "quantite_finale": 10
        })

    assert response.status_code == 409