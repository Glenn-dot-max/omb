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

