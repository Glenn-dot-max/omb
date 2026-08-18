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
