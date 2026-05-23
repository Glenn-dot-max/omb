from fastapi import APIRouter, HTTPException, Depends
from auth import get_current_user, is_catalog_admin
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
async def create_type(type_data: TypeCreate, current_user: dict = Depends(is_catalog_admin)):
    """Create a new type (TECH_ADMIN/CATALOG_ADMIN only)"""

    existing = supabase.table("types")\
        .select("id")\
        .ilike("name", type_data.name)\
        .execute()
    
    if existing.data:
        raise HTTPException(status_code=409, detail="Ce type existe déjà")
    
    response = supabase.table("types")\
        .insert({"name": type_data.name})\
        .execute()
    
    if not response.data:
        raise HTTPException(status_code=500, detail="Erreur lors de la création du type")
    
    return response.data[0]

@router.put("/{type_id}")
async def update_type(type_id: int, type_data: TypeUpdate, current_user: dict = Depends(is_catalog_admin)):
    """Update a type (TECH_ADMIN/CATALOG_ADMIN only)"""

    existing = supabase.table("types")\
        .select("id")\
        .eq("id", type_id)\
        .execute()
    
    if not existing.data:
        raise HTTPException(status_code=404, detail="Type non trouvé")
    
    duplicate = supabase.table("types")\
        .select("id")\
        .ilike("name", type_data.name)\
        .neq("id", type_id)\
        .execute()
    
    if duplicate.data:
        raise HTTPException(status_code=409, detail="Un type avec ce nom existe déjà")
    
    response = supabase.table("types")\
        .update({"name": type_data.name})\
        .eq("id", type_id)\
        .execute()
    
    if not response.data:
        raise HTTPException(status_code=500, detail="Erreur lors de la mise à jour du type")
    
    return response.data[0]

@router.delete("/{type_id}")
async def delete_type(type_id: int, current_user: dict = Depends(is_catalog_admin)):
    """Delete a type (TECH_ADMIN/CATALOG_ADMIN only)"""

    existing = supabase.table("types")\
        .select("id")\
        .eq("id", type_id)\
        .execute()
    
    if not existing.data:
        raise HTTPException(status_code=404, detail="Type non trouvé")
    
    products_using = supabase.table("produits")\
        .select("id")\
        .eq("type_id", type_id)\
        .limit(1)\
        .execute()

    if products_using.data:
        raise HTTPException(status_code=409, detail="Impossible de supprimer ce type car il est utilisé par au moins un produit")
    
    response = supabase.table("types")\
        .delete()\
        .eq("id", type_id)\
        .execute()
    
    if not response.data:
        raise HTTPException(status_code=500, detail="Erreur lors de la suppression du type")
    
    return {"message": "Type supprimé avec succès"}
