# backend/tests/test_commande_historique.py
from unittest.mock import MagicMock, patch
from postgrest.exceptions import APIError
from utils import noter_historique
from tests.test_commande_complete_route import fake_db, payload, TOUS_LIENS_FORMULES, TOUS_LIENS_PRODUITS
from tests.test_commande_modification import fake_db as fake_db_modif, COMMANDE

# ===========================================
# TESTS - Historique des modifications d'une commande (V5.4a)
# ===========================================

UTILISATEUR = {"user_id": "user-123", "email": "user@test.com", "franchise_id": "franchise-abc", "role": "USER"}

# ---------- La fonction qui écrit dans l'historique ----------

def test_noter_historique_enregistre_qui_quoi_et_le_detail():
    base = MagicMock()
    noter_historique(base, "cmd-1", "franchise-abc", UTILISATEUR, "validation", {"a": 1})
    base.table.assert_called_once_with("commande_historique")
    base.table.return_value.insert.assert_called_once_with({
        "commande_id": "cmd-1",
        "franchise_id": "franchise-abc",
        "user_id": "user-123",
        "user_email": "user@test.com",
        "action": "validation",
        "details": {"a": 1},
    })

def test_noter_historique_ne_bloque_pas_la_commande_si_l_ecriture_echoue():
    """Une panne de l'historique ne doit jamais empêcher la cuisine d'enregistrer une commande"""
    base = MagicMock()
    base.table.return_value.insert.return_value.execute.side_effect = APIError({"message": "panne"})
    noter_historique(base, "cmd-1", "franchise-abc", UTILISATEUR, "creation")  # ne lève rien

# ---------- Chaque route note ce qu'elle fait ----------

def test_creation_notee(client, auth_headers):
    table, _ = fake_db(TOUS_LIENS_FORMULES, TOUS_LIENS_PRODUITS)
    with patch("routes.commandes.supabase") as mock_db, patch("routes.commandes.noter_historique") as noter:
        mock_db.table.side_effect = table
        response = client.post("/commandes/complete", headers=auth_headers, json=payload())

    assert response.status_code == 200
    noter.assert_called_once()
    _, commande_id, franchise_id, utilisateur, action, details = noter.call_args[0]
    assert (commande_id, franchise_id, action) == ("cmd-1", "franchise-abc", "creation")
    assert utilisateur["user_id"] == "user-123"
    assert details["nom_client"] == "Martin"
    assert (details["formules"], details["produits"]) == (2, 2)

def test_creation_refusee_rien_n_est_note(client, auth_headers):
    table, _ = fake_db([{"formule_id": "autre"}], TOUS_LIENS_PRODUITS)  # formule non accessible
    with patch("routes.commandes.supabase") as mock_db, patch("routes.commandes.noter_historique") as noter:
        mock_db.table.side_effect = table
        response = client.post("/commandes/complete", headers=auth_headers, json=payload())

    assert response.status_code == 404
    noter.assert_not_called()

def test_modification_notee_avec_les_champs_changes(client, auth_headers):
    table, _ = fake_db_modif()
    with patch("routes.commandes.supabase") as mock_db, patch("routes.commandes.noter_historique") as noter:
        mock_db.table.side_effect = table
        response = client.put(
            f"/commandes/{COMMANDE}/complete", headers=auth_headers, json={"nom_client": "Martin SA"}
        )

    assert response.status_code == 200
    _, commande_id, _, _, action, details = noter.call_args[0]
    assert (commande_id, action) == (COMMANDE, "modification")
    assert details["champs"] == {"nom_client": "Martin SA"}

def test_validation_notee(client, auth_headers):
    with patch("routes.commandes.supabase") as mock_db, patch("routes.commandes.noter_historique") as noter:
        mock_db.table.return_value.update.return_value.eq.return_value.eq.return_value.execute.return_value.data = [
            {"id": "cmd-1", "franchise_id": "franchise-abc", "validated": True}
        ]
        response = client.patch("/commandes/cmd-1/validate", headers=auth_headers)

    assert response.status_code == 200
    _, commande_id, franchise_id, _, action = noter.call_args[0]
    assert (commande_id, franchise_id, action) == ("cmd-1", "franchise-abc", "validation")

def test_suppression_notee_avec_le_client_et_la_date(client, auth_headers):
    """La suppression est notée : l'historique reste même quand la commande n'existe plus"""
    with patch("routes.commandes.supabase") as mock_db, patch("routes.commandes.noter_historique") as noter:
        mock_db.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = [
            {"id": "cmd-1", "nom_client": "Martin", "delivery_date": "2026-11-02", "franchise_id": "franchise-abc"}
        ]
        response = client.delete("/commandes/cmd-1", headers=auth_headers)

    assert response.status_code == 200
    _, commande_id, _, _, action, details = noter.call_args[0]
    assert (commande_id, action) == ("cmd-1", "suppression")
    assert details == {"nom_client": "Martin", "delivery_date": "2026-11-02"}

# ---------- Lire l'historique d'une commande ----------

def test_lire_l_historique_le_plus_recent_d_abord_avec_le_nom_de_l_auteur(client, auth_headers):
    """Chaque ligne affiche le NOM de la personne (table users), à défaut son email"""
    lignes = [
        {"action": "validation", "details": {}, "user_id": "u-1", "user_email": "paris@omb.fr", "created_at": "2026-10-23T11:00:00+00:00"},
        {"action": "creation", "details": {}, "user_id": "u-2", "user_email": "caen@omb.fr", "created_at": "2026-10-23T10:00:00+00:00"},
    ]
    tables = {}
    def table(nom):
        t = tables.setdefault(nom, MagicMock())
        if nom == "commande_historique":
            t.select.return_value.eq.return_value.order.return_value.execute.return_value.data = lignes
        if nom == "users":
            # u-2 n'a pas de nom renseigné : on garde son email
            t.select.return_value.in_.return_value.execute.return_value.data = [
                {"id": "u-1", "full_name": "Marie Durand"},
                {"id": "u-2", "full_name": None},
            ]
        return t

    with patch("routes.commandes.supabase") as mock_db, patch("routes.commandes.verify_commande_ownership") as verifier:
        mock_db.table.side_effect = table
        response = client.get("/commandes/cmd-1/historique", headers=auth_headers)

    assert response.status_code == 200
    assert response.json() == [
        {"action": "validation", "details": {}, "auteur": "Marie Durand", "created_at": "2026-10-23T11:00:00+00:00"},
        {"action": "creation", "details": {}, "auteur": "caen@omb.fr", "created_at": "2026-10-23T10:00:00+00:00"},
    ]
    verifier.assert_called_once()  # la commande doit être de MA franchise
    tables["commande_historique"].select.return_value.eq.return_value.order.assert_called_once_with("created_at", desc=True)
    tables["users"].select.assert_called_once_with("id, full_name")  # jamais password_hash


def test_historique_d_une_commande_d_une_autre_franchise_404(client, auth_headers):
    with patch("routes.commandes.supabase") as mock_db:
        mock_db.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = []
        response = client.get("/commandes/cmd-autre/historique", headers=auth_headers)

    assert response.status_code == 404
