from fastapi import APIRouter, HTTPException, Depends
from auth import get_current_user
from database import get_supabase_client
from models import CategorieCreate, CategorieUpdate

router = APIRouter(prefix="/categories", tags=["categories"])
supabase = get_supabase_client()

@router.get("/")
async def get_categories(current_user: dict = Depends(get_current_user)):
    """Get all categories (shared across all franchises)"""
    response = supabase.table("categories")\
        .select("*")\
        .order("name")\
        .execute()
    return response.data

@router.post("/")
async def create_categorie(categorie: CategorieCreate, current_user: dict = Depends(get_current_user)):
    """Create a new category (all authenticated users)"""
    # ✅ Tous les utilisateurs peuvent créer
    
    existing = supabase.table("categories")\
        .select("id")\
        .ilike("name", categorie.name)\
        .execute()
    
    if existing.data:
        raise HTTPException(status_code=409, detail="Cette catégorie existe déjà")
    
    response = supabase.table("categories")\
        .insert({"name": categorie.name})\
        .execute()
    
    if not response.data:
        raise HTTPException(status_code=500, detail="Erreur lors de la création de la catégorie")
    
    return response.data[0]

@router.put("/{categorie_id}")
async def update_categorie(categorie_id: int, categorie: CategorieUpdate, current_user: dict = Depends(get_current_user)):
    """Update a category (TECH_ADMIN only)"""
    # ⚠️ Seul TECH_ADMIN peut modifier
    if current_user.get("role") != "TECH_ADMIN":
        raise HTTPException(status_code=403, detail="Seul TECH_ADMIN peut modifier des catégories")
    
    existing = supabase.table("categories")\
        .select("id")\
        .eq("id", categorie_id)\
        .execute()
    
    if not existing.data:
        raise HTTPException(status_code=404, detail="Catégorie non trouvée")
    
    duplicate = supabase.table("categories")\
        .select("id")\
        .ilike("name", categorie.name)\
        .neq("id", categorie_id)\
        .execute()
    
    if duplicate.data:
        raise HTTPException(status_code=409, detail="Une catégorie avec ce nom existe déjà")
    
    response = supabase.table("categories")\
        .update({"name": categorie.name})\
        .eq("id", categorie_id)\
        .execute()
    
    if not response.data:
        raise HTTPException(status_code=500, detail="Erreur lors de la mise à jour")
    
    return response.data[0]

@router.delete("/{categorie_id}")
async def delete_categorie(categorie_id: int, current_user: dict = Depends(get_current_user)):
    """Delete a category (TECH_ADMIN only)"""
    # ⚠️ Seul TECH_ADMIN peut supprimer
    if current_user.get("role") != "TECH_ADMIN":
        raise HTTPException(status_code=403, detail="Seul TECH_ADMIN peut supprimer des catégories")
    
    existing = supabase.table("categories")\
        .select("id")\
        .eq("id", categorie_id)\
        .execute()
    
    if not existing.data:
        raise HTTPException(status_code=404, detail="Catégorie non trouvée")
    
    products_using = supabase.table("produits")\
        .select("id")\
        .eq("categorie_id", categorie_id)\
        .limit(1)\
        .execute()
    
    if products_using.data:
        raise HTTPException(
            status_code=409, 
            detail="Impossible de supprimer cette catégorie : des produits l'utilisent encore"
        )
    
    response = supabase.table("categories")\
        .delete()\
        .eq("id", categorie_id)\
        .execute()
    
    if not response.data:
        raise HTTPException(status_code=500, detail="Erreur lors de la suppression")
    
    return {"message": "Catégorie supprimée avec succès"}