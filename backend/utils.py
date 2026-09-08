import re
from fastapi import HTTPException

def get_or_404(supabase, table: str, id_value, select: str = "id", id_column: str = "id", detail: str = "Introuvable"):
    """Récupère la première ligne correspondante, ou lève une 404."""
    result = supabase.table(table).select(select).eq(id_column, id_value).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail=detail)
    return result.data[0]

def verify_commande_ownership(supabase, commande_id, current_user: dict, detail: str = "Commande not found"):
    """Vérifie qu'une commande existe et appartient à la franchise de l'utilisateur (sauf TECH_ADMIN)"""
    query = supabase.table("carnet_commande").select("id").eq("id", commande_id)
    if current_user.get("role") != "TECH_ADMIN":
        query = query.eq("franchise_id", current_user["franchise_id"])
    result = query.execute()
    if not result.data:
        raise HTTPException(status_code=404, detail=detail)
    return result.data[0]

def normalize_name(name: str) -> str:
    """Retire le suffixe UUID ajouté aux noms dupliqués/désactivés, ex: 'Croissant (a1b2c3)' -> 'Croissant'"""
    if not name:
        return ""
    return re.sub(
        r"\s*\(([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\)\s*$",
        "",
        name,
        flags=re.IGNORECASE,
    ).strip()

def fetch_all_paginated(supabase, table: str, select: str, filters: dict = None, page_size: int = 1000) ->list:
    """Récupère toutes les lignes d'une table en paginant par blocs (contourne la limite PostgREST de 1000 lignes)."""
    all_data = []
    offset = 0
    while True:
        query = supabase.table(table).select(select)
        if filters:
            for key, value in filters.items():
                query = query.eq(key, value)
        page = query.range(offset, offset + page_size - 1).execute()
        if not page.data:
            break
        all_data.extend(page.data)
        if len(page.data) < page_size:
            break
        offset += page_size
    return all_data