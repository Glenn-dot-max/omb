# backend/tests/test_planning_route.py
from datetime import date, timedelta
from types import SimpleNamespace
from unittest.mock import patch

# ===========================================
# TESTS - Route GET /planning/production, de bout en bout (fausse base)
# ===========================================

DEMAIN = (date.today() + timedelta(days=1)).isoformat()

class FausseRequete:
    """Une requête Supabase factice : select/eq/in_/order… renvoient la requête elle-même,
    et execute() renvoie les lignes prévues pour la table."""
    def __init__(self, lignes):
        self.lignes = lignes
    def __getattr__(self, nom):
        return lambda *args, **kwargs: self
    def execute(self):
        return SimpleNamespace(data=self.lignes)

FAUSSE_BASE = {
    "carnet_commande": [{
        "id": "cmd-1", "nom_client": "Martin", "delivery_date": DEMAIN, "delivery_hour": "10:00:00",
        "nombre_couverts": 10, "validated": True, "type_prestation": "brunch",
        "coefficient_ponderation": 0.9, "notes": "", "avec_service": False,
    }],
    "commande_formules": [{"id": 1, "commande_id": "cmd-1", "formule_id": "f1", "quantite_finale": 10}],
    "commande_formule_exclusions": [],
    "formules": [{"id": "f1", "name": "Brunch"}],
    "commande_produits": [{"commande_id": "cmd-1", "produit_id": "p2", "quantite": 15, "unite": "unité"}],
    "formule_produits": [{"formule_id": "f1", "produit_id": "p1", "quantite": 1.5, "unite": "pièce"}],
    "produits": [
        {"id": "p1", "name": "Mini croissant", "categorie_id": 1, "type_id": 1},
        {"id": "p2", "name": "Café", "categorie_id": 1, "type_id": 1},
    ],
    "categories": [{"id": 1, "name": "Viennoiseries"}],
    "types": [{"id": 1, "name": "Sucré"}],
}

def test_planning_production_avec_ponderation(client, auth_headers):
    """Une commande pondérée à 90 % avec une formule ET un produit ajouté :
    le planning répond, et les quantités sont pondérées puis arrondies au-dessus"""
    with patch("routes.planning.supabase") as mock_db, patch("routes.planning.get_cached", return_value=None):
        mock_db.table.side_effect = lambda nom: FausseRequete(FAUSSE_BASE[nom])
        response = client.get(
            f"/planning/production?date_debut={DEMAIN}&date_fin={DEMAIN}", headers=auth_headers
        )

    assert response.status_code == 200
    produits = response.json()["planning"][DEMAIN]["commandes"][0]["produits"]
    assert produits["p1"]["quantite"] == 14.0  # formule : 10 couverts × 1,5 = 15, × 90 % = 13,5 → 14
    assert produits["p2"]["quantite"] == 14.0  # produit ajouté : 15 × 90 % = 13,5 → 14
