# backend/cache.py
# Cache mémoire partagé pour les données de référence quasi-statiques
# TTL = 300 secondes (5 minutes) - rafraîchissement automatique

from cachetools import TTLCache
from threading import Lock

# Cache principal - max 128 entrées, expiration 5 minutes
_cache = TTLCache(maxsize=128, ttl=300)
_lock = Lock()

def get_cached(key: str):
    """Récupère une valeur du cache. Retourne None si absente ou expirée."""
    with _lock:
        return _cache.get(key)

def set_cached(key: str, value):
    """Stocke une valeur dans le cache."""
    with _lock:
        _cache[key] = value

def invalidate(key: str):
    """Supprime une valeur du cache."""
    with _lock:
        _cache.pop(key, None)

def invalidate_prefix(prefix: str):
    """Supprime toutes les entrées dont la clé commence par un préfixe."""
    with _lock:
        keys_to_delete = [k for k in list(_cache.keys()) if str(k).startswith(prefix)]
        for k in keys_to_delete:
            _cache.pop(k, None)