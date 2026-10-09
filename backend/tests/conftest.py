# backend/tests/conftest.py
import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
import sys
import os 

# Ajouter le répertoire backend au path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Variables d'env minimales pour les tests 
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-tests-only")
os.environ.setdefault("SUPABASE_URL", "https://fake.supabase.co")
os.environ.setdefault("SUPABASE_KEY", "fake-key")

from main import app

# Fausse table "users" utilisée par get_current_user (auth.py)
# Les clés sont les user_id des tokens de tests définis plus bas.
FAKE_USERS = {
    "user-123": {"active": True, "role": "USER", "franchise_id": "franchise-abc"},
    "admin-456": {"active": True, "role": "TECH_ADMIN", "franchise_id": None},
    "catalog-admin-789": {"active": True, "role": "CATALOG_ADMIN", "franchise_id": None},
    "disabled-999": {"active": False, "role": "USER", "franchise_id": "franchise-abc"},
}

@pytest.fixture(autouse=True)
def mock_supabase_auth():
    """Mock le client Supabase dans auth.py : répons selon le user_id demandé"""
    def fake_eq(column, user_id):
        query = MagicMock()
        user = FAKE_USERS.get(user_id)
        query.execute.return_value.data = [user] if user else []
        return query

    mock_client = MagicMock()
    mock_client.table.return_value.select.return_value.eq.side_effect = fake_eq

    with patch("auth.get_supabase_client", return_value=mock_client):
        yield

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c

@pytest.fixture
def mock_supabase():
    with patch("database.get_supabase_client") as mock:
        yield mock.return_value

@pytest.fixture
def user_token():
    """Token JWT valide pour un USER classique"""
    from auth import create_access_token
    return create_access_token({
        "user_id": "user-123",
        "email": "user@test.com",
        "franchise_id": "franchise-abc",
        "role": "USER"
    })

@pytest.fixture
def admin_token():
    """Token JWT valide pour un TECH_ADMIN"""
    from auth import create_access_token
    return create_access_token({
        "user_id": "admin-456",
        "email": "admin@test.com",
        "franchise_id": None,
        "role": "TECH_ADMIN"
    })

@pytest.fixture
def auth_headers(user_token):
    return {"Authorization": f"Bearer {user_token}"}

@pytest.fixture
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}

@pytest.fixture
def catalog_admin_token():
    """Token JWT valide pour un CATALOG_ADMIN"""
    from auth import create_access_token
    return create_access_token({
        "user_id": "catalog-admin-789",
        "email": "catalogadmin@test.com",
        "franchise_id": None,
        "role": "CATALOG_ADMIN"
    })

@pytest.fixture
def catalog_admin_headers(catalog_admin_token):
    return {"Authorization": f"Bearer {catalog_admin_token}"}