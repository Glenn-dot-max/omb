# backend/tests/test_auth.py
import pytest
from unittest.mock import patch, MagicMock
from auth import hash_password, verify_password, create_access_token

# ===============================================
# TEST UNITAIRES - fonctions auth.py
# ===============================================

def test_hash_and_verify_password():
    """Le hash d'un mot de passe doit être vérifiable"""
    password = "MonMotDePasse123!"
    hashed = hash_password(password)
    assert verify_password(password, hashed) is True

def test_verify_wrong_password():
    """Un mauvais mot de passe doit être rejeté"""
    hashed = hash_password("correct")
    assert verify_password("incorrect", hashed) is False

def test_create_access_token():
    """Le token JWT doit contenir les bonnes données"""
    from jose import jwt
    import os
    data = {"user_id": "123", "role": "USER", "franchise_id": "abc"}
    token = create_access_token(data)
    payload = jwt.decode(token, os.getenv("SECRET_KEY"), algorithms=["HS256"])
    assert payload["user_id"] == "123"
    assert payload["role"] == "USER"

# ===============================================
# TESTS D'INTÉGRATION - route /auth/login
# ===============================================

def test_login_success(client):
    """Login avec bons identifiants -> token retourné"""
    fake_user = [{
        "id": "user-123",
        "email": "test@omb.fr",
        "password_hash": hash_password("password123"),
        "franchise_id": "franchise-abc",
        "role": "USER",
        "franchises": {"nom": "Paris"},
        "is_active": True,
    }]

    mock_response = MagicMock()
    mock_response.data = fake_user

    with patch("routes.auth.supabase") as mock_db:
        mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_response
        response = client.post("/auth/login", json={
            "email": "test@omb.fr",
            "password": "password123"
        })

    assert response.status_code == 200
    assert "access_token" in response.json()

def test_login_wrong_password(client):
    """Login avec mauvais mot de passe -> 401 """
    fake_user = [{
        "id": "user-123",
        "email": "test@omb.fr",
        "password_hash": hash_password("correct"),
        "franchise_id": "franchise-abc",
        "role": "USER",
        "franchises": None,
    }]

    mock_response = MagicMock()
    mock_response.data = fake_user

    with patch("routes.auth.supabase") as mock_db:
        mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_response
        response = client.post("/auth/login", json={
            "email": "test@omb.fr",
            "password": "mauvais"
        })

    assert response.status_code == 401

def test_login_unkown_email(client):
    """Login avec email inconnu -> 401 """
    mock_response = MagicMock()
    mock_response.data = []

    with patch("routes.auth.supabase") as mock_db:
        mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_response
        response = client.post("/auth/login", json={
            "email": "inconnu@omb.fr",
            "password": "test"
        })

    assert response.status_code == 401

def test_protected_route_without_token(client):
    """Accéder à une route protégée sans token -> 403"""
    response = client.get("/produits/")
    assert response.status_code in (401, 403)

# ============================================================
# TESTS - Réinitialisation du mot de passe (mot de passe oublié)
# ============================================================

def test_reset_password_invalid_token(client):
    """Token inconnu -> 400 (et pas 500)"""
    mock_response = MagicMock()
    mock_response.data = []

    with patch("routes.auth.supabase") as mock_db:
        mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_response
        response = client.post("/auth/reset-password", json={
            "token": "token-inconnu-1234567890",
            "new_password": "NouveauMdp1"
        })

    assert response.status_code == 400

def test_reset_password_weak_password(client):
    """Mot de passe sans majuscule ni chiffre -> 422 (refusé par la validation)"""
    response = client.post("/auth/reset-password", json={
        "token": "token-valide-1234567890",
        "new_password": "motdepassefaible"
    })

    assert response.status_code == 422

def test_reset_password_success(client):
    """Token valide et non expiré -> 200 et le mot de passe est mis à jour"""
    from datetime import datetime, timedelta, timezone

    mock_response = MagicMock()
    mock_response.data = [{
        "id": "user-123",
        "reset_token_expires_at": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
    }]

    with patch("routes.auth.supabase") as mock_db:
        mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_response
        response = client.post("/auth/reset-password", json={
            "token": "token-valide-1234567890",
            "new_password": "NouveauMdp1"
        })

    assert response.status_code == 200
    mock_db.table.return_value.update.assert_called_once()

# =========================================================
# TESTS - get_current_user lit l'utilisateur en base
# =========================================================

def test_role_is_read_from_database_not_token(client):
    """Token qui prétend être TECH_ADMIN mais l'utilisateur en base est USER -> 403"""
    token = create_access_token({
        "user_id": "user-123",
        "email": "user@test.com",
        "franchise_id": "franchise-abc",
        "role": "TECH_ADMIN"
    })

    with patch("routes.admin.supabase"):
        response = client.get("/admin/users", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 403

def test_disables_account_is_rejected(client):
    """Compte désactivé en base -> 401"""
    token = create_access_token({
        "user_id": "disabled-999",
        "email": "disabled@test.com",
        "franchise_id": "franchise-abc",
        "role": "USER"
    })

    response = client.get("/produits/", headers={"Authorization": f"Bearer {token}"})
    
    assert response.status_code == 401

def test_unknown_user_is_rejected(client):
    """Token valide mais utilisateur supprimé de la base -> 401"""
    token = create_access_token({
        "user_id": "supprime-000",
        "email": "supprime@test.com",
        "franchise_id": "franchise-abc",
        "role": "USER"
    })

    response = client.get("/produits/", headers={"Authorization": f"Bearer {token}"})
    
    assert response.status_code == 401