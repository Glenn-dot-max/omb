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