# backend/tests/test_formules.py
import pytest
from pydantic import ValidationError
from models import FormuleCreate, FormuleUpdate


# ===============================================
# TESTS UNITAIRES - Validation des modèles de formule
# ===============================================

def test_formule_create_accepts_apostrophe():
    """Une apostrophe est autorisée, et les espaces autour du nom sont retirés."""
    formule = FormuleCreate(name=" Formule d'été ", nombre_couverts=10)
    assert formule.name == "Formule d'été"

@pytest.mark.parametrize("payload", [
    {"name": ""},
    {"name": "   "},
    {"name": "<img src=x onerror=alert(1)>"},
    {"name": "Brunch", "nombre_couverts": -5},
    {"name": "Brunch", "nombre_couverts": 0},
    {"name": "x" * 201},
])

def test_formule_create_rejects_invalid_data(payload):
    """Données invalides -> la création est refusée"""
    with pytest.raises(ValidationError):
        FormuleCreate(**payload)

def test_formule_update_rejects_html_in_name():
    """Renommer une formule avec du HTML -> refusé"""
    with pytest.raises(ValidationError):
        FormuleUpdate(name="<b>Brunch</b>")

def test_formule_update_allows_partial_update():
    """On peut modifier seulement les couverts, sans renvoyer le nom."""
    formule = FormuleUpdate(nombre_couverts=20)
    assert formule.name is None 

# ===============================================
# TESTS - Routes POST /formules/
# ===============================================

def test_create_formule_with_html_name_returns_422(client, admin_headers):
    """La route refuse un nom contenant du HTML avant même de toucher à la base"""
    response = client.post("/formules/", headers=admin_headers, json={
        "name": "<img src=x onerror=alert(1)>",
        "nombre_couverts": 10
    })
    assert response.status_code == 422

# ===============================================
# TESTS - Nombre de franchises par formule, sans troncature à 1000 lignes (P9)
# ===============================================
from unittest.mock import patch

def test_nb_franchises_formules_compte_tous_les_liens(client, auth_headers):
    """nb_franchises doit compter TOUS les liens actifs, même au-delà de 1000 lignes"""
    liens_ma_franchise = [{"formule_id": "f1"}, {"formule_id": "f2"}]
    tous_les_liens = [{"formule_id": "f1"}] * 3 + [{"formule_id": "f2"}]  # f1 = 3 franchises, f2 = 1

    def faux_fetch_all(supabase, table, select, filters=None, page_size=1000):
        return liens_ma_franchise if "franchise_id" in (filters or {}) else tous_les_liens

    with patch("routes.formules.fetch_all_paginated", side_effect=faux_fetch_all), \
         patch("routes.formules.supabase") as mock_db:
        mock_db.table.return_value.select.return_value.in_.return_value.order.return_value.execute.return_value.data = [
            {"id": "f1", "name": "Brunch"}, {"id": "f2", "name": "Goûter"}
        ]
        mock_db.table.return_value.select.return_value.execute.return_value.data = [{"id": "x"}, {"id": "y"}, {"id": "z"}]
        response = client.get("/formules/", headers=auth_headers)

    assert response.status_code == 200
    nb = {f["id"]: f["nb_franchises"] for f in response.json()}
    assert nb == {"f1": 3, "f2": 1}
    