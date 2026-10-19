# backend/tests/test_types.py
import pytest
from unittest.mock import patch

# ============================================
# TESTS - Validation du nom des types (3.3)
# ============================================

@pytest.mark.parametrize("nom", ["<b>Salé</b>", 'Type "spécial"', "L'été", "   "])
def test_create_type_nom_invalide_refuse(client, catalog_admin_headers, nom):
    """Balise, guillemet, apostrophe ou nom vide -> 422, et la base n'est jamais touchée"""
    with patch("routes.types.supabase") as mock_db:
        response = client.post("/types/", headers=catalog_admin_headers, json={"name": nom})
        mock_db.table.assert_not_called()

    assert response.status_code == 422

def test_create_type_nom_valide_accepte(client, catalog_admin_headers):
    """Nom valide -> créé, espaces autour retirés"""
    with patch("routes.types.supabase") as mock_db:
        mock_db.table.return_value.select.return_value.ilike.return_value.execute.return_value.data = []
        mock_db.table.return_value.insert.return_value.execute.return_value.data = [{"id": 1, "name": "Salé"}]
        response = client.post("/types/", headers=catalog_admin_headers, json={"name": "  Salé  "})
        mock_db.table.return_value.insert.assert_called_once_with({"name": "Salé"})

    assert response.status_code == 200      

def test_update_type_nom_invalide_refuse(client, catalog_admin_headers):
    """Même règle à la modification""" 
    with patch("routes.types.supabase") as mock_db:
        response = client.put("/types/1", headers=catalog_admin_headers, json={"name": 'Sucré"'})
        mock_db.table.assert_not_called()

    assert response.status_code == 422
