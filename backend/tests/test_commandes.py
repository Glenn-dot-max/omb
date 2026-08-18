# backend/tests/test_commandes.py
import pytest
from unittest.mock import patch, MagicMock
from datetime import date, timedelta

# ===============================================
# TESTS - GET /commandes
# ===============================================

def test_get_commandes_requires_auth(client):
    """Sans token -> accès refusé"""
    response = client.get("/commandes/")
    assert response.status_code in (401, 403)

def test_get_commandes_as_user(client, auth_headers):
    """Un USER obtient uniquement les commandes de sa franchise"""
    fake_commandes = [
        {"id": "c-1", "nom_client": "Dupont", "franchise_id": "franchise-abc"},
    ]
    mock_response = MagicMock()
    mock_response.data = fake_commandes

    with patch("routes.commandes.supabase") as mock_db:
        mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_response
        response = client.get("/commandes/", headers=auth_headers)

    assert response.status_code == 200

def test_get_commandes_scoped_to_franchise(client, auth_headers):
    """Vérifier que le filtre franchise_id est appliqué sur la requête DB"""
    mock_response = MagicMock()
    mock_response.data = []

    with patch("routes.commandes.supabase") as mock_db:
        table_mock = mock_db.table.return_value.select.return_value

        client.get("/commandes/", headers=auth_headers)

        table_mock.eq.assert_called_with("franchise_id", "franchise-abc")

# ===============================================
# TESTS - POST /commandes
# ===============================================

def test_create_commande_requires_auth(client):
    """Créer une commande sans token -> refusé"""
    response = client.post("/commandes/", json={})
    assert response.status_code in (401, 403)

def test_create_commande_success(client, auth_headers):
    """Créer une commande valide -> 200/201"""
    tomorrow = (date.today() + timedelta(days=1)).isoformat()
    fake_commande = {
        "id": "c-new",
        "nom_client": "Martin",
        "franchise_id": "franchise-abc",
        "nombre_couverts": 10,
        "delivery_date": tomorrow,
    }
    mock_response = MagicMock()
    mock_response.data = [fake_commande]

    with patch("routes.commandes.supabase") as mock_db:
        mock_db.table.return_value.insert.return_value.execute.return_value = mock_response
        response = client.post("/commandes/", headers=auth_headers, json={
            "nom_client": "Martin",
            "nombre_couverts": 10,
            "delivery_date": tomorrow,
            "delivery_hour": "10:00"
        })

    assert response.status_code in (200, 201)

def test_create_commande_invalid_date(client, auth_headers):
    """Nombre de couverts invalide (0) -> 422"""
    tomorrow = (date.today() + timedelta(days=1)).isoformat()
    response = client.post("/commandes/", headers=auth_headers, json={
        "nom_client": "Martin",
        "nombre_couverts": 0,
        "delivery_date": tomorrow,
        "heure_livraison": "10:00"
    })

    assert response.status_code == 422

def test_create_commande_nom_client_too_short(client, auth_headers):
    """Nom client trop court -> 422"""
    tomorrow = (date.today() + timedelta(days=1)).isoformat()
    response = client.post("/commandes/", headers=auth_headers, json={
        "nom_client": "A",
        "nombre_couverts": 5,
        "delivery_date": tomorrow,
        "heure_livraison": "10:00"
    })

    assert response.status_code == 422