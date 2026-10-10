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

# ==============================================
# TESTS - Format des dates envoyées à la base (1.6)
# ==============================================

def test_create_commande_sends_text_dates_to_db(client, auth_headers):
    """À la création, date et heure partent en texte vers Supabase"""
    tomorrow = date.today() + timedelta(days=1)
    mock_response = MagicMock()
    mock_response.data = [{"id": "c-new"}]

    with patch("routes.commandes.supabase") as mock_db:
        mock_db.table.return_value.insert.return_value.execute.return_value = mock_response
        response = client.post("/commandes/", headers=auth_headers, json={
            "nom_client": "Martin",
            "nombre_couverts": 10,
            "delivery_date": tomorrow.isoformat(),
            "delivery_hour": "10:30"
        })
        sent = mock_db.table.return_value.insert.call_args[0][0]

    assert response.status_code == 200
    assert sent["delivery_date"] == tomorrow.isoformat()
    assert sent["delivery_hour"] == "10:30:00"

def test_update_commande_hour_only_sends_text_to_db(client, admin_headers):
    """Modifier seulement l'heure (sans la date) -> l'heure part quand même en texte"""
    mock_response = MagicMock()
    mock_response.data = [{"id": "c-1"}]

    with patch("routes.commandes.supabase") as mock_db:
        mock_db.table.return_value.update.return_value.eq.return_value.execute.return_value = mock_response
        response = client.put("/commandes/c-1", headers=admin_headers, json={
            "delivery_hour": "14:00"
        })
        sent = mock_db.table.return_value.update.call_args[0][0]

    assert response.status_code == 200
    assert sent == {"delivery_hour": "14:00:00"}

# ==============================================
# TESTS - Archivage d'une commande (2.1)
# ==============================================

def test_manual_archive_route_no_longer_exists(client, auth_headers):
    """L'archivage manuel a été supprimé : la route ne doit plus exister,
    et surtout ne plus jamais supprimer une commande."""
    with patch("routes.commandes.supabase") as mock_db:
        response = client.patch("/commandes/c-1/archive", headers=auth_headers)

        mock_db.table.return_value.delete.assert_not_called()

    assert response.status_code == 404

# ==============================================
# TESTS - Les erreurs HTTP volontaires ne deviennent pas des 500 (2.3a)
# ==============================================

def test_validate_commande_of_other_franchise_returns_404(client, auth_headers):
    """Valider la commande d'une autre franchise -> 404 (et pas 500)"""
    mock_response = MagicMock()
    mock_response.data = []

    with patch("routes.commandes.supabase") as mock_db:
        mock_db.table.return_value.update.return_value.eq.return_value.eq.return_value.execute.return_value = mock_response
        response = client.patch("/commandes/c-autre/validate", headers=auth_headers)

    assert response.status_code == 404

def test_get_commandes_without_franchise_returns_400(client, catalog_admin_headers):
    """Un compte sans franchise (CATALOG_ADMIN) qui liste les commandes -> 400 (et pas 500)"""
    with patch("routes.commandes.supabase") as mock_db:
        response = client.get("/commandes/", headers=catalog_admin_headers)

    assert response.status_code == 400
    