# backend/tests/test_connexion_supabase.py
import httpx
from unittest.mock import patch

# ==============================================
# TESTS - Connexion à Supabase (hotfix H3, tâche 1.9)
# ==============================================

def test_client_supabase_en_http1():
    """Le client Supabase utilise notre client réseau, en HTTP/1.1 (pas HTTP/2).
    HTTP/2 partage une seule connexion entre les threads -> erreurs [Errno 11]."""
    import database
    assert database.supabase.postgrest.session is database.http_client
    # Attribut interne de httpcore : à revoir si la bibliothèque change
    assert database.http_client._transport._pool._http2 is False

def test_erreur_reseau_supabase_renvoie_503_avec_cors(client, auth_headers):
    """Coupure réseau vers Supabase -> 503 propre, avec l'en-tête CORS, sans détail technique"""
    origin = "https://omb-frontend.onrender.com"
    with patch("routes.unite.supabase") as mock_db:
        mock_db.table.side_effect = httpx.ReadError("[Errno 11] Resource temporarily unavailable")
        response = client.get("/unite/", headers={**auth_headers, "Origin": origin})

    assert response.status_code == 503
    assert response.headers.get("access-control-allow-origin") == origin
    assert "Errno" not in response.text


# ==============================================
# TESTS - CORS : origines autorisées (Sprint V)
# ==============================================
import pytest

@pytest.mark.parametrize("origin", ["http://localhost:5173", "https://omb-frontend.onrender.com"])
def test_cors_origine_autorisee(client, origin):
    """Leserveur de développement Vue (5173) et la production peuvent appeler l'API"""
    response = client.options("/auth/me", headers={"Origin": origin, "Access-Control-Request-Method": "GET"})
    assert response.headers.get("access-control-allow-origin") == origin

def test_cors_origine_inconnue_refusee(client):
    response = client.options("/auth/me", headers={"Origin": "https://site-pirate.example", "Access-Control-Request-Method": "GET"})
    assert "access-control-allow-origin" not in response.headers