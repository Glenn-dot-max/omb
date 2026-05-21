from fastapi import APIRouter, HTTPException, Depends
from auth import get_current_user, check_permission
from database import get_supabase_client
from pydantic import BaseModel

router = APIRouter(prefix="/types", tags=["types"])
supabase = get_supabase_client()

# Modèle Pydantic
class TypeCreate(BaseModel):
    name: str

class TypeUpdate(BaseModel):
    name: str

@router.get("/")
async def get_types(current_user: dict = Depends(get_current_user)):
    """Get all types (shared across all franchises)"""
    response = supabase.table("types")\
        .select("*")\
        .order("name")\
        .execute()
    return response.data

@router.post("/")
async def create_type(type_data: TypeCreate, current_user: dict = Depends(get_current_user)):
    """Create a new type (all authenticated users)"""
    # ✅ Tous les utilisateurs peuvent créer
    
    # Vérifier si le type existe déjà
    existing = supabase.table("types")\
        .select("id")\
        .ilike("name", type_data.name)\
        .execute()
    
    if existing.data:
        raise HTTPException(status_code=409, detail="Ce type existe déjà")
    
    # Créer le type
    response = supabase.table("types")\
        .insert({"name": type_data.name})\
        .execute()
    
    if not response.data:
        raise HTTPException(status_code=500, detail="Erreur lors de la création du type")
    
    return response.data[0]

@router.put("/{type_id}")
async def update_type(type_id: int, type_data: TypeUpdate, current_user: dict = Depends(get_current_user)):
    """Update a type (requires manage_types permission)"""
    
    # ✅ Vérifier la permission
    has_permission = await check_permission("manage_types", current_user)
    
    if not has_permission:
        raise HTTPException(
            status_code=403,
            detail="❌ Vous n'avez pas les droits pour modifier les types.\n\n"
                   "Contactez l'administrateur technique (TECH_ADMIN) pour obtenir cette permission."
        )
    
    # Vérifier que le type existe
    existing = supabase.table("types")\
        .select("id")\
        .eq("id", type_id)\
        .execute()
    
    if not existing.data:
        raise HTTPException(status_code=404, detail="Type non trouvé")
    
    # Vérifier les doublons
    duplicate = supabase.table("types")\
        .select("id")\
        .ilike("name", type_data.name)\
        .neq("id", type_id)\
        .execute()
    
    if duplicate.data:
        raise HTTPException(status_code=409, detail="Un type avec ce nom existe déjà")
    
    # Mettre à jour
    response = supabase.table("types")\
        .update({"name": type_data.name})\
        .eq("id", type_id)\
        .execute()
    
    if not response.data:
        raise HTTPException(status_code=500, detail="Erreur lors de la mise à jour")
    
    return response.data[0]

@router.delete("/{type_id}")
async def delete_type(type_id: int, current_user: dict = Depends(get_current_user)):
    """Delete a type (requires manage_types permission)"""
    
    # ✅ Vérifier la permission
    has_permission = await check_permission("manage_types", current_user)
    
    if not has_permission:
        raise HTTPException(
            status_code=403,
            detail="❌ Vous n'avez pas les droits pour supprimer les types.\n\n"
                   "Contactez l'administrateur technique (TECH_ADMIN) pour obtenir cette permission."
        )
    
    # Vérifier que le type existe
    existing = supabase.table("types")\
        .select("id")\
        .eq("id", type_id)\
        .execute()
    
    if not existing.data:
        raise HTTPException(status_code=404, detail="Type non trouvé")
    
    # Vérifier si des produits utilisent ce type
    products_using = supabase.table("produits")\
        .select("id")\
        .eq("type_id", type_id)\
        .limit(1)\
        .execute()
    
    if products_using.data:
        raise HTTPException(
            status_code=409, 
            detail="Impossible de supprimer ce type : des produits l'utilisent encore"
        )
    
    # Supprimer le type
    response = supabase.table("types")\
        .delete()\
        .eq("id", type_id)\
        .execute()
    
    if not response.data:
        raise HTTPException(status_code=500, detail="Erreur lors de la suppression")
    
    return {"message": "Type supprimé avec succès"}