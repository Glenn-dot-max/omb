# backend/tests/test_admin.py
from unittest.mock import patch, MagicMock

# ================================================
# TESTS - Routes /admin/users
# ================================================

def test_get_users_does_not_select_password_hash(client, admin_headers):
    """La liste des utilisateurs ne doit jamais demander password_hash à la base"""
    mock_response = MagicMock()
    mock_response.data = [{"id": "user-1", "email": "a@omb.fr"}]

    with patch("routes.admin.supabase") as mock_db:
        mock_db.table.return_value.select.return_value.order.return_value.execute.return_value = mock_response
        response = client.get("/admin/users", headers=admin_headers)
        selected_columns = mock_db.table.return_value.select.call_args[0][0]

    assert response.status_code == 200
    assert "password_hash" not in selected_columns
    assert not selected_columns.startswith("*")

def test_get_user_does_not_select_password_hash(client, admin_headers):
    """Le détail d'un utilisateur ne doit jamais demander password_hash à la base"""
    mock_response = MagicMock()
    mock_response.data = [{"id": "user-1", "email": "a@omb.fr"}]

    with patch("routes.admin.supabase") as mock_db:
        mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_response
        response = client.get("/admin/users/user-1", headers=admin_headers)
        selected_columns = mock_db.table.return_value.select.call_args[0][0]

    assert response.status_code == 200
    assert "password_hash" not in selected_columns
    assert not selected_columns.startswith("*")

def test_admin_reset_password_does_not_return_password(client, admin_headers):
    """Le reste admin ne doit jamais renvoyer le mot de passe dans la réponse"""
    mock_response = MagicMock()
    mock_response.data = [{"id": "user-1"}]

    with patch("routes.admin.supabase") as mock_db:
        mock_db.table.return_value.update.return_value.eq.return_value.execute.return_value = mock_response
        response = client.post(
            "/admin/users/user-1/reset-password",
            json={"new_password": "MotDePasseSecret1"},
            headers=admin_headers,
        )

    assert response.status_code == 200
    assert "new_password" not in response.json()
    assert "MotDePasseSecret1" not in response.text

def test_admin_reset_password_unkown_user(client, admin_headers):
    """Utilisateur inexistant -> 404"""
    mock_response = MagicMock()
    mock_response.data = []

    with patch("routes.admin.supabase") as mock_db:
        mock_db.table.return_value.update.return_value.eq.return_value.execute.return_value = mock_response
        response = client.post(
            "/admin/users/inconnu/reset-password",
            json={"new_password": "MotDePasseSecret1"},
            headers=admin_headers,
        )

    assert response.status_code == 404

# ===============================================================
# TESTS - Pas de balise dans les textes de l'admin (3.4)
# ===============================================================
import pytest
from pydantic import ValidationError
from models import FranchiseCreate, FranchiseUpdate, UserCreate, UserUpdate

USER_VALIDE = {"email": "jean.dupont@example.fr", "full_name": "Jean Dupont", "password": "motdepasse123"}

@pytest.mark.parametrize("modele, champs", [
    (FranchiseCreate, {"nom": "<b>OMB Caen</b>"}),
    (FranchiseCreate, {"nom": "   "}),
    (FranchiseCreate, {"nom": "OMB Caen", "city": "<img src=x onerror=alert(1)>"}),
    (FranchiseCreate, {"nom": "OMB Caen", "address": "1 rue <b>"}),
    (FranchiseCreate, {"nom": "OMB Caen", "phone": "<svg onload=alert(1)>"}),
    (FranchiseUpdate, {"nom": "<b>x</b>"}),
    (FranchiseUpdate, {"city": "<b>x</b>"}),
    (UserCreate, {**USER_VALIDE, "full_name": "<b>Jean</b>"}),
    (UserUpdate, {"full_name": "<script>x</script>"}),    
])
def test_admin_texte_avec_balise_refuse(modele, champs):
    with pytest.raises(ValidationError):
        modele(**champs)

def test_admin_textes_valides_acceptes():
    """Textes normaux acceptés (apostrophes comprises), espaces autour retirés, champs vides laissés vides"""
    f = FranchiseCreate(nom="  OMB Caen  ", city=" Caen ", address="12 rue de l'Église", phone="02 31 00 00 00")
    assert (f.nom, f.city, f.address) == ("OMB Caen", "Caen", "12 rue de l'Église")
    assert UserUpdate(full_name="  Jean Dupont  ").full_name == "Jean Dupont"
    assert FranchiseUpdate(active=False).nom is None


# ===============================================================
# TESTS - Garde-fous de l'admin sur son propre compte (V3.1)
# ===============================================================

def test_admin_ne_peut_pas_se_desactiver(client, admin_headers):
    """DELETE sur son propre compte -> 400, et rien n'est écrit en base"""
    with patch("routes.admin.supabase") as mock_db:
        response = client.delete("/admin/users/admin-456", headers=admin_headers)
        mock_db.table.return_value.update.assert_not_called()

    assert response.status_code == 400

def test_admin_peut_desactiver_un_autre_compte(client, admin_headers):
    """Cas de réussite : désactiver un autre utilisateur fonctionne"""
    mock_response = MagicMock()
    mock_response.data = [{"id": "user-1", "active": False}]

    with patch("routes.admin.supabase") as mock_db:
        mock_db.table.return_value.update.return_value.eq.return_value.execute.return_value = mock_response
        response = client.delete("/admin/users/user-1", headers=admin_headers)
        mock_db.table.return_value.update.assert_called_once_with({"active": False})

    assert response.status_code == 200

@pytest.mark.parametrize("changement", [
    {"active": False},
    {"role": "USER"},
    {"role": "catalog_admin"},
])

def test_admin_ne_peut_pas_se_retrograder_ni_se_desactiver(client, admin_headers, changement):
    """PUT sur son propre compte qui change son rôle ou le désactive -> 400, rien n'est écrit"""
    with patch("routes.admin.supabase") as mock_db:
        response = client.put("/admin/users/admin-456", json=changement, headers=admin_headers)
        mock_db.table.return_value.update.assert_not_called()

    assert response.status_code == 400

def test_admin_peut_modifier_son_nom(client, admin_headers):
    """Cas de réussite : modifier son propre nom (et renvoyer le même rôle) reste possible"""
    mock_response = MagicMock()
    mock_response.data = [{"id": "admin-456", "full_name": "Glenn", "role": "TECH_ADMIN", "password_hash": "secret"}]

    with patch("routes.admin.supabase") as mock_db:
        mock_db.table.return_value.update.return_value.eq.return_value.execute.return_value = mock_response
        response = client.put(
            "/admin/users/admin-456",
            json={"full_name": "Glenn", "role": "tech_admin", "active": True},
            headers=admin_headers,
        )

    assert response.status_code == 200
    assert response.json()["full_name"] == "Glenn"

def test_reponses_utilisateur_en_liste_blanche(client, admin_headers):
    """Création et modification ne renvoient que les colonnes publiques (jamais password_hash ni reset_token_hash)"""
    ligne_en_base = {
        "id": "user-1", "email": "a@omb.fr", "full_name": "Jean Dupont", "role": "USER",
        "franchise_id": "f-1", "active": True, "must_change_password": True, "created_at": "2026-10-21",
        "password_hash": "secret", "reset_token_hash": "secret2", "password_changed_at": "2026-10-21",
    }
    vide = MagicMock()
    vide.data = []
    cree = MagicMock()
    cree.data = [dict(ligne_en_base)]

    with patch("routes.admin.supabase") as mock_db:
        mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = vide
        mock_db.table.return_value.insert.return_value.execute.return_value = cree
        mock_db.table.return_value.update.return_value.eq.return_value.execute.return_value = cree
        creation = client.post(
            "/admin/users",
            json={"email": "a@omb.fr", "full_name": "Jean Dupont", "password": "motdepasse123", "franchise_id": "f-1"},
            headers=admin_headers,
        )
        modification = client.put("/admin/users/user-1", json={"full_name": "Jean Dupont"}, headers=admin_headers)

    for response in (creation, modification):
        assert response.status_code == 200
        assert set(response.json()) == {"id", "email", "full_name", "role", "franchise_id", "active", "must_change_password", "created_at"}
