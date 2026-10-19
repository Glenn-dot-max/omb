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
# TESTS - Format des dates envoyés à la base (1.6)
# ===============================================
from datetime import time
from routes.commandes import format_delivery_fields

def test_format_delivery_fields_date_et_heure_en_texte():
    """Date et heure partent en texte vers Supabase"""
    data = format_delivery_fields({"delivery_date": date(2026, 11, 3), "delivery_hour": time(10, 30)})
    assert data == {"delivery_date": "2026-11-03", "delivery_hour": "10:30:00"}

def test_format_delivery_fields_heure_seule():
    """Modifier seulement l'heure (sans la date) -> l'heure part quand même en texte"""
    assert format_delivery_fields({"delivery_hour": time(14, 0)}) == {"delivery_hour": "14:00:00"}

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


# ==============================================
# TESTS - Archivage automatique en une seule requête (P4)
# ==============================================
from datetime import datetime
from zoneinfo import ZoneInfo

def today_paris():
    return datetime.now(ZoneInfo("Europe/Paris")).date().isoformat()

def test_auto_archive_franchise_single_update(client, auth_headers):
    """Franchise : UNE seule requête update, filtrée sur la date et sur SA franchise"""
    with patch("routes.commandes.supabase") as mock_db:
        update = mock_db.table.return_value.update
        chaine = update.return_value.eq.return_value.eq.return_value.lt.return_value
        chaine.eq.return_value.execute.return_value.data = [{"id": "c-1"}, {"id": "c-2"}]

        response = client.post("/commandes/auto-archive", headers=auth_headers)

        assert update.call_count == 1
        assert update.call_args[0][0]["archived"] is True
        update.return_value.eq.return_value.eq.return_value.lt.assert_called_once_with("delivery_date", today_paris())
        chaine.eq.assert_called_once_with("franchise_id", "franchise-abc")
        mock_db.table.return_value.select.assert_not_called()

    assert response.status_code == 200
    assert response.json()["count"] == 2

def test_auto_archive_nothing_to_archive(client, auth_headers):
    """Aucune commande passée -> count 0"""
    with patch("routes.commandes.supabase") as mock_db:
        chaine = mock_db.table.return_value.update.return_value.eq.return_value.eq.return_value.lt.return_value
        chaine.eq.return_value.execute.return_value.data = []
        response = client.post("/commandes/auto-archive", headers=auth_headers)

    assert response.status_code == 200
    assert response.json()["count"] == 0

def test_auto_archive_admin_all_franchises(client, admin_headers):
    """Admin : archive les commandes passées de toutes les franchises (pas de filtre franchise)"""
    with patch("routes.commandes.supabase") as mock_db:
        chaine = mock_db.table.return_value.update.return_value.eq.return_value.eq.return_value.lt.return_value
        chaine.execute.return_value.data = [{"id": "c-1"}]
        response = client.post("/commandes/auto-archive", headers=admin_headers)

        chaine.eq.assert_not_called()

    assert response.status_code == 200
    assert response.json()["count"] == 1