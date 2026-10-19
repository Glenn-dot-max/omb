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