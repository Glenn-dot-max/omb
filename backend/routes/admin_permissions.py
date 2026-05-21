from fastapi import APIRouter, Depends, HTTPException
from auth import get_current_user
from database import get_supabase_client
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter(prefix="/admin/permissions", tags=["admin_permissions"])
supabase = get_supabase_client()

# Liste des permissions disponibles
AVAILABLE_PERMISSIONS = [
  {
    "key": "manage_categories",
    "name": "Gérer les catégories",
    "description": "Créer, modifier et supprimer des catégories de produits",
    "icon": "📂"
  },
  {
    "key": "manage_types",
    "name": "Gérer les types",
    "description": "Créer, modifier et supprimer des types de prorduits",
    "icon": "🏷️"
  },
  {
    "key": "manage_global_products",
    "name": "Gérer les produits globaux",
    "description": "Modifier des produits partagés entre plusieurs franchisés",
    "icon": "🌐"
  },
  {
    "key": "manage_global_franchises",
    "name": "Gérer les franchises globales",
    "description": "Modifier des formules partagées entre plusieurs franchises",
    "icon": "🏢"
  },
  {
    "key": "view_all_franchises",
    "name": "Voir toutes les franchises",
    "description": "Accéder aux données de toutes les franchises (lecture seule)",
    "icon": "👁️"
  },
]

class PermissionUpdate(BaseModel):
    permission_key: str
    enabled: bool

def require_tech_admin(current_user: dict = Depends(get_current_user)):
    """Dependency to require TECH_ADMIN role"""
    if current_user["role"] != "TECH_ADMIN":
        raise HTTPException(status_code=403, detail="Forbidden: Requires TECH_ADMIN role")
    return current_user

@router.get("/available")
async def get_available_permissions(current_user: dict = Depends(require_tech_admin)):
    """Get the list of available permissions"""
    return AVAILABLE_PERMISSIONS

@router.get("/franchise/{franchise_id}")
async def get_franchise_permissions(franchise_id: str, current_user: dict = Depends(require_tech_admin)):
    """Get all permissions for a specific franchise"""
    franchise = supabase.table("franchises").select("id, nom").eq("id", franchise_id).execute()
    if not franchise.data:
        raise HTTPException(status_code=404, detail="Franchise not found")
    
    # Récupérer les permissions
    permissions = supabase.table("franchise_permissions")\
        .select("permission_key, enabled, granted_at, updated_at")\
        .eq("franchise_id", franchise_id).execute()
    
    # Créer un dictionnaire des permissions avec les détails
    existing_perms = {p["permission_key"]: p for p in permissions.data}

    # Retourner toutes les permissions avec leur état
    result = []
    for perm in AVAILABLE_PERMISSIONS:
        if perm["key"] in existing_perms:
            result.append({
                **perm,
                "enabled": existing_perms[perm["key"]]["enabled"],
                "granted_at": existing_perms[perm["key"]].get("granted_at"),
                "updated_at": existing_perms[perm["key"]].get("updated_at"),
            })
        else:
            result.append({
                **perm,
                "enabled": False,
                "granted_at": None,
                "updated_at": None,
            })

    return {
        "franchise": franchise.data[0],
        "permissions": result
    }

@router.post("/franchise/{franchise_id}")
async def update_franchise_permission(franchise_id: str, permission: PermissionUpdate, current_user: dict = Depends(require_tech_admin)):
    """Enable or disable a permission for a franchise"""
    # Vérifier que la franchise existe
    franchise = supabase.table("franchises").select("id").eq("id", franchise_id).execute()
    if not franchise.data:
        raise HTTPException(status_code=404, detail="Franchise not found")
    
    # Vérifier que la permission est valide
    if permission.permission_key not in [p["key"] for p in AVAILABLE_PERMISSIONS]:
        raise HTTPException(status_code=400, detail="Invalid permission key")

    # Mettre à jour ou insérer la permission
    existing = supabase.table("franchise_permissions")\
        .select("id").eq("franchise_id", franchise_id).eq("permission_key", permission.permission_key).execute()
    
    if existing.data:
        response = supabase.table("franchise_permissions")\
            .update({
                "enabled": permission.enabled,
                "granted_by": current_user["id"],
            })\
            .eq("franchise_id", franchise_id)\
            .eq("permission_key", permission.permission_key).execute()
    else:
        response = supabase.table("franchise_permissions")\
            .insert({
                "franchise_id": franchise_id,
                "permission_key": permission.permission_key,
                "enabled": permission.enabled,
                "granted_by": current_user["id"],
            }).execute()
        
    return {
        "message": f"Permission {'activée' if permission.enabled else 'désactivée'} avec succès",
        "permission": permission.permission_key,
        "enabled": permission.enabled
    }

@router.get("/")
async def get_all_franchise_permissions(current_user: dict = Depends(require_tech_admin)):
    """Get permissions for all franchises"""
    franchises = supabase.table("franchises").select("id, nom").order("nom").execute()
    all_permissions = supabase.table("franchise_permissions").select("franchise_id, permission_key, enabled").eq("enabled", True).execute()

    perms_by_franchise = {}
    for perm in all_permissions.data:
        if perm["franchise_id"] not in perms_by_franchise:
            perms_by_franchise[perm["franchise_id"]] = []
        perms_by_franchise[perm["franchise_id"]].append(perm["permission_key"])

    result = []
    for franchise in franchises.data:
        result.append({
            "id": franchise["id"],
            "nom": franchise["nom"],
            "permissions": perms_by_franchise.get(franchise["id"], []),
            "permissions_count": len(perms_by_franchise.get(franchise["id"], []))
        })
    return result

    