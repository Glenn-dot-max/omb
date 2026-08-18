# backend/tests/test_produits.py
import pytest
from unittest.mock import patch, MagicMock

# ===============================================
# TESTS - GET /produits
# ===============================================

def test_get_produits_requires_auth(client):
    """Sans token -> accès refusé"""
    response = client.get("/produits/")
    assert response.status_code in (401, 403)

def test_get_produits_as_user(client, auth_headers):
    """Un USER obtient la liste des produits de sa franchise"""
    fake_produits = [
        {"id": "p-1", "name": "Croissant", "franchise_id": "franchise-abc"},
        {"id": "p-2", "name": "Jus d'orange", "franchise_id": "franchise-abc"},
    ]
    mock_response = MagicMock()
    mock_response.data = fake_produits

    with patch("routes.produits.supabase") as mock_db:
        mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_response
        response = client.get("/produits/", headers=auth_headers)

    assert response.status_code == 200

def test_get_produits_scoped_to_franchise(client, auth_headers):
    """Un USER ne doit pas pouvoir accéder aux produits d'une autre franchise"""
    # Le USER a franchise_id="franchise-abc" dans son token
    # Il ne doit jamais voir les produits de "franchise-xyz"
    fake_produits = [
        {"id": "p-1", "name": "Croissant", "franchise_id": "franchise-abc"},
    ]
    mock_response = MagicMock()
    mock_response.data = fake_produits

    with patch("routes.produits.supabase") as mock_db:
        table_mock = mock_db.table.return_value.select.return_value
        eq_mock = table_mock.eq.return_value
        eq_mock.range.return_value.execute.return_value = mock_response

        client.get("/produits/", headers=auth_headers)
        table_mock.eq.assert_called_with("franchise_id", "franchise-abc")

# ===============================================
# TESTS - POST /produits
# ===============================================

def test_create_produit_requires_auth(client):
    """Créer un produit sans token -> refusé""" 
    response = client.post("/produits/", json={"name": "Test"})
def test_create_produits_as_admin(client, admin_headers):
    """Un TECH_ADMIN peut créer un produit"""
    fake_produit = {"id": "p-new", "name": "Nouveau produit"}
    mock_response = MagicMock()
    mock_response.data = [fake_produit]

    with patch("routes.produits.supabase") as mock_db:
        # Le check doublon doit retourner vide (sinon MagicMock truthy → 409)
        mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
        mock_db.table.return_value.insert.return_value.execute.return_value = mock_response
        response = client.post("/produits/", headers=admin_headers, json={
            "name": "Nouveau produit",
            "categorie_id": 1,
            "type_id": 1,
        })

    assert response.status_code in (200, 201)
    