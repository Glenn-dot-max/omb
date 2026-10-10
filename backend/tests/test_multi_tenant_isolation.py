# backend/tests/test_multi_tenant_isolation.py
"""
Tests de non-regréssion pour les 2 failles de sécurité corrigées le 05/09/2026 :
1. PATCH /commande-formules/{id} sans authentification (accès libre non-scopé)
2. GET /admin/franchises/{id}/produits|formules accessible par un simple USER (IDOR)
"""
import pytest
from unittest.mock import MagicMock, patch

# =================================================
# TICKET 1 - PATCH /commande-formules/{id}
# =================================================

def test_patch_commande_formules_requires_auth(client):
    """Sans token -> doit être bloqué avant même d'atteindre la DB"""
    response = client.patch("/commande-formules/1", json={"produits_exclus": []})
    assert response.status_code in (401, 403)

def test_patch_commande_formule_cross_franchise_blocked(client, auth_headers):
    """Un USER de franchise-abc ne peut pas modifier un commande_formule
    dont la commande appartient à une autre franchise"""
    commande_formule_response = MagicMock()
    commande_formule_response.data = [{"commande_id": "commande-xyz"}]

    carnet_commande_response = MagicMock()
    carnet_commande_response.data = []

    def table_side_effect(table_name):
        mock_table = MagicMock()
        if table_name == "commande_formules":
            mock_table.select.return_value.eq.return_value.execute.return_value = commande_formule_response
        elif table_name == "carnet_commande":
            mock_table.select.return_value.eq.return_value.eq.return_value.execute.return_value = carnet_commande_response
        return mock_table

    with patch("routes.commande_formules.supabase") as mock_db:
        mock_db.table.side_effect = table_side_effect
        response = client.patch(
            "/commande-formules/1",
            headers=auth_headers,
            json={"produits_exclus": [], "quantite_finale": 5},
        )

    assert response.status_code == 404

def test_patch_commande_formule_rejects_invalid_payload(client, auth_headers):
    """Un payload avec un champ non prévu par le modèle Pydantic doit être rejeté (422)"""
    response = client.patch(
        "/commande-formules/1",
        headers=auth_headers,
        json={"produits_exclus": [], "champ_invente": "hack"},
    )
    assert response.status_code == 422

# =================================================
# TICKET 2 - GET /admin/franchises/{id}/produits|formules
# =================================================

def test_franchise_catalogue_produits_forbidden_for_user(client, auth_headers):
    """Un simple USER ne doit jamais accéder au catalogue d'une franchise via cette route"""
    response = client.get(
        "/admin/franchises/franchise-abc/produits", 
        headers=auth_headers,
    )
    assert response.status_code == 403

def test_franchise_catalogue_formules_forbidden_for_user(client, auth_headers):
    response = client.get(
        "/admin/franchises/franchise-abc/formules",
        headers=auth_headers,
    )
    assert response.status_code == 403

def test_franchise_catalogue_produits_allowed_for_catalog_admin(client, catalog_admin_headers):
    """Un CATALOG_ADMIN doit toujours pouvoir consulter le catalogue d'une franchise"""
    liens_response = MagicMock()
    liens_response.date = [{"produit_id": "produit-1", "name": "Croissant", "categorie_id": 1, "type_id": 1}]

    produits_response = MagicMock()
    produits_response.data = [{"id": "produit-1", "name": "Croissant", "categorie_id": 1, "type_id": 1}]

    def table_side_effect(table_name):
        mock_table = MagicMock()
        if table_name == "franchise_produits":
            mock_table.select.return_value.eq.return_value.execute.return_value = liens_response
        elif table_name == "produits":
            mock_table.select.return_value.eq.return_value.execute.return_value = produits_response
        return mock_table

    with patch("routes.admin.supabase") as mock_db, \
        patch("routes.admin.get_cached", return_value={1: "Boissons"}), \
        patch("routes.admin.set_cached"):
        mock_db.return_value.table.side_effect = table_side_effect
        response = client.get(
            "/admin/franchises/franchise-abc/produits",
            headers=catalog_admin_headers,
        )

    assert response.status_code == 200

# =================================================
# 2.2 - GET /produits/{id} et /formules/{id} cloisonnés par franchise
# =================================================

def fake_tables(liens_data, item_data):
    """Fausse base : la table de liens (franchise_produits / franchise_formules)
     répons liens_data, la table principale (produits / formules) répond item_data."""
    def table(name):
        mock_table = MagicMock()
        if name.startswith("franchise_"):
            mock_table.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = liens_data
        else:
            mock_table.select.return_value.eq.return_value.execute.return_value.data = item_data
        return mock_table
    return table

@pytest.mark.parametrize("ressource", ["produits", "formules"])
def test_get_item_of_other_franchise_returns_404(client, auth_headers, ressource):
    """Une franchise demande un produit/une formule qui n'est pas lié(e) à elle -> 404"""
    with patch(f"routes.{ressource}.supabase") as mock_db:
        mock_db.table.side_effect = fake_tables(liens_data=[], item_data=[{"id": "x-1", "name": "Secret"}])
        response = client.get(f"/{ressource}/x-1", headers=auth_headers)

    assert response.status_code == 404

@pytest.mark.parametrize("ressource", ["produits", "formules"])
def test_get_item_of_own_franchise_returns_200(client, auth_headers, ressource):
    """Une franchise demande un produit/une formule lié(e) à elle -> 200"""
    with patch(f"routes.{ressource}.supabase") as mock_db:
        mock_db.table.side_effect = fake_tables(liens_data=[{"id": 1}], item_data=[{"id": "x-1", "name": "Croissant"}])
        response = client.get(f"/{ressource}/x-1", headers=auth_headers)

    assert response.status_code == 200

@pytest.mark.parametrize("ressource", ["produits", "formules"])
def test_get_any_item_as_admin_returns_200(client, admin_headers, ressource):
    """Un admin peut lire n'importe quel produit/une formule, sans vérification de lien"""
    with patch(f"routes.{ressource}.supabase") as mock_db:
        mock_db.table.side_effect = fake_tables(liens_data=[], item_data=[{"id": "x-1", "name": "Croissant"}])
        response = client.get(f"/{ressource}/x-1", headers=admin_headers)

    assert response.status_code == 200
    