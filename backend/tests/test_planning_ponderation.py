# backend/tests/test_planning_ponderation.py
import pytest
from pydantic import ValidationError
from models import CommandeModification
from routes.planning import quantite_produite

# ============================================
# TESTS - Pondération de toutes les commandes (V5.3a)
# ============================================

@pytest.mark.parametrize("type_prestation, coefficient, quantite, attendu", [
    ("brunch", 1.0, 7.5, 7.5),     # pas de pondération : quantité exacte (comme avant)
    ("brunch", 1.1, 50, 55.0),     # 50 × 110 % = 55, et non 56 (piège : 1.1 × 50 = 55.00000000000001)
    ("brunch", 0.9, 15, 14.0),     # 13,5 arrondi à l'unité supérieure
    ("non-brunch", 1.2, 5, 6.0),   # pondération au-dessus de 100 %
    ("mariage", 1.0, 7.5, 8.0),    # mariage : toujours arrondi à l'unité supérieure (comme avant)
    ("mariage", 0.8, 10, 8.0),
])
def test_quantite_produite(type_prestation, coefficient, quantite, attendu):
  commande = {"type_prestation": type_prestation, "coefficient_ponderation": coefficient}
  assert quantite_produite(quantite, commande) == attendu

def test_quantite_produite_sans_coefficient_en_base():
  """Anciennes commandes : coefiicient vide = 100 %"""
  assert quantite_produite(7.5, {"type_prestation": "brunch", "coefficient_ponderation": None}) == 7.5

# ============================================
# TESTS - Apostrophe dans le nom du client (V5.3a)
# ============================================ 

@pytest.mark.parametrize("nom", ["L'Équipe", "Restaurant l'Atelier", "O'Brien & fils"])
def test_nom_client_avec_apostrophe_accepte(nom):
  assert CommandeModification(nom_client=nom).nom_client == nom

@pytest.mark.parametrize("nom", ['Dupont "VIP', "Dupont <b>", "a/b", "a\\b"])
def test_nom_client_caracteres_dangereux_toujours_refuses(nom):
  with pytest.raises(ValidationError):
    CommandeModification(nom_client=nom)
