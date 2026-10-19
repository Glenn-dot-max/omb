# backend/tests/test_commande_complete.py
import pytest
from datetime import date, timedelta
from pydantic import ValidationError
from models import CommandeComplete

# ===========================================
# TESTS UNITAIRES - Modèle CommandeComplete (P3)
# ===========================================

FORMULE_A = "c9ffddc5-70cf-4cf0-b4c3-960679a94de6"
FORMULE_B = "a1b2c3d4-0000-4000-8000-000000000001"
PRODUIT_A = "f04478e9-3951-43f0-a5cb-6e21c9e36b9d"

def commande(**contenu):
    """Une commande valide (demain, 10 couverts), à laquelle on ajoute formules/produits"""
    return {
        "nom_client": "Martin",
        "nombre_couverts": 10,
        "delivery_date": (date.today() + timedelta(days=1)).isoformat(),
        "delivery_hour": "10:00",
        **contenu,
    }

def test_commande_complete_valide():
    c = CommandeComplete(**commande(
        formules=[{"formule_id": FORMULE_A, "quantite_finale": 10, "produits_exclus": [PRODUIT_A]}],
        produits=[{"produit_id": PRODUIT_A, "quantite": 2, "unite": "unité"}],
    ))
    assert len(c.formules) == 1
    assert len(c.produits) == 1

def test_commande_complete_sans_contenu_refusee():
    """Ni formule ni produit -> refusé"""
    with pytest.raises(ValidationError):
        CommandeComplete(**commande())

def test_commande_complete_formule_en_double_refusee():
    with pytest.raises(ValidationError):
        CommandeComplete(**commande(formules=[
            {"formule_id": FORMULE_A, "quantite_finale": 10},
            {"formule_id": FORMULE_A, "quantite_finale": 5},
        ]))


def test_commande_complete_produit_meme_unite_en_double_refuse():
    with pytest.raises(ValidationError):
        CommandeComplete(**commande(produits=[
            {"produit_id": PRODUIT_A, "quantite": 2, "unite": "unité"},
            {"produit_id": PRODUIT_A, "quantite": 3, "unite": "unité"},
        ]))

def test_commande_complete_meme_produit_unites_differentes_accepte():
    """Le même produit avec deux unités différentes est autorisé (comme en base)"""
    c = CommandeComplete(**commande(produits=[
        {"produit_id": PRODUIT_A, "quantite": 2, "unite": "unité"},
        {"produit_id": PRODUIT_A, "quantite": 1, "unite": "kg"},
    ]))
    assert len(c.produits) == 2

@pytest.mark.parametrize("contenu", [
    {"formules": [{"formule_id": FORMULE_A, "quantite_finale": -1}]},
    {"produits": [{"produit_id": PRODUIT_A, "quantite": 20000}]},
    {"formules": [{"formule_id": "pas-un-uuid", "quantite_finale": 10}]},
    {"formules": [{"formule_id": FORMULE_A, "quantite_finale": 10, "champ_inconnu": 1}]}
])
def test_commande_complete_lignes_invalides_refusees(contenu):
    with pytest.raises(ValidationError):
        CommandeComplete(**commande(**contenu))

@pytest.mark.parametrize("champs", [
    {"nombre_couverts": 0}, 
    {"nom_client": "A"}
])
def test_commande_complete_infos_invalides_refusees(champs):
    """Les règles de la commande elle-même s'appliquent aussi (couverts >=1, nom d'au moins 2 caractères)"""
    contenu = {"formules": [{"formule_id": FORMULE_A, "quantite_finale": 10}]}
    with pytest.raises(ValidationError):
        CommandeComplete(**{**commande(**contenu), **champs})

def test_commande_complete_notes_avec_balise_refusees():
    """Notes : toute balise est refusée (3.2), même celles que l'ancienne liste noire laissait passer"""
    contenu = {"formules": [{"formule_id": FORMULE_A, "quantite_finale": 10}]}
    with pytest.raises(ValidationError):
        CommandeComplete(**{**commande(**contenu), "notes": "<svg onload=alert(1)>"})

def test_commande_complete_notes_texte_accepte():
    """Notes : texte normal accepté, apostrophes comprises"""
    contenu = {"formules": [{"formule_id": FORMULE_A, "quantite_finale": 10}]}
    c = CommandeComplete(**{**commande(**contenu), "notes": "Allergie : pas d'arachide"})
    assert c.notes == "Allergie : pas d'arachide"