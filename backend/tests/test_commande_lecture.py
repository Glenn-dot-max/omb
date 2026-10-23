# backend/tests/test_commande_lecture.py
from unittest.mock import MagicMock, patch

# ===========================================
# TESTS - GET /commandes/{id} : lire une commande (modification, duplication)
# ===========================================

COMMANDES = [
    {"id": "active", "franchise_id": "franchise-abc", "archived": False},
    {"id": "archivee", "franchise_id": "franchise-abc", "archived": True},
    {"id": "autre-franchise", "franchise_id": "franchise-xyz", "archived": True},
]

class FausseTable:
    """Applique vraiment les filtres .eq() sur COMMANDES (un MagicMock les ignorerait)"""
    def __init__(self):
        self.filtres = []
    def select(self, *args):
        return self
    def eq(self, colonne, valeur):
        self.filtres.append((colonne, valeur))
        return self
    def execute(self):
        lignes = [c for c in COMMANDES if all(c.get(col) == val for col, val in self.filtres)]
        return MagicMock(data=lignes)

def lire(client, headers, commande_id):
    with patch("routes.commandes.supabase") as mock_db:
        mock_db.table.side_effect = lambda nom: FausseTable()
        return client.get(f"/commandes/{commande_id}", headers=headers)

def test_lit_une_commande_active(client, auth_headers):
    response = lire(client, auth_headers, "active")
    assert response.status_code == 200
    assert response.json()["id"] == "active"

def test_lit_aussi_une_commande_archivee_pour_la_dupliquer(client, auth_headers):
    response = lire(client, auth_headers, "archivee")
    assert response.status_code == 200
    assert response.json()["id"] == "archivee"

def test_refuse_la_commande_d_une_autre_franchise(client, auth_headers):
    assert lire(client, auth_headers, "autre-franchise").status_code == 404
