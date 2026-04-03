from fastapi import APIRouter, HTTPException, Depends
from auth import get_current_user
from database import get_supabase_client 
from models import ProduitCreate, ProduitUpdate
from fastapi.encoders import jsonable_encoder

router = APIRouter(prefix="/produits", tags=["produits"])
supabase = get_supabase_client()

@router.get("/")  # ✅ Avec slash
async def get_produits(current_user: dict = Depends(get_current_user)):
    """Get all produits"""
    response = supabase.table("produits")\
        .select("*")\
        .eq("franchise_id", current_user["franchise_id"])\
        .order("name")\
        .execute()
    
    return response.data

@router.get("/{produit_id}")
async def get_produit(produit_id: str, current_user: dict = Depends(get_current_user)):
    """Get a single produit by ID"""
    response = supabase.table("produits")\
        .select("*")\
        .eq("id", produit_id)\
        .eq("franchise_id", current_user["franchise_id"])\
        .execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Produit not found")
    return response.data[0]

@router.post("/")  # ✅ Avec slash
async def create_produit(produit: ProduitCreate, current_user: dict = Depends(get_current_user)):
    """Create a new produit"""
    existing = supabase.table("produits")\
        .select("*")\
        .eq("name", produit.name)\
        .eq("franchise_id", current_user["franchise_id"])\
        .execute()
    if existing.data:
        raise HTTPException(status_code=409, detail="Un produit avec ce nom existe déjà")
    produit_data = produit.model_dump()
    produit_data["franchise_id"] = current_user["franchise_id"]

    response = supabase.table("produits").insert(produit_data).execute()
    if not response.data:
        raise HTTPException(status_code=400, detail="Failed to create Produit")
    return jsonable_encoder(response.data[0])


@router.delete("/{produit_id}")
async def delete_produit(produit_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a produit"""
    print(f"🗑️ DELETE REQUEST - Produit ID: {produit_id}, Franchise ID: {current_user['franchise_id']}")
    
    existing = supabase.table("produits")\
        .select("*")\
        .eq("id", produit_id)\
        .eq("franchise_id", current_user["franchise_id"])\
        .execute()
    
    print(f"📦 Existing Produit: {existing.data}")
    
    if not existing.data:
        print(f"❌ Produit not found for deletion - Produit ID: {produit_id}, Franchise ID: {current_user['franchise_id']}")
        raise HTTPException(status_code=404, detail="Produit not found")

    try:    
        response = supabase.table("produits")\
            .delete()\
            .eq("id", produit_id)\
            .eq("franchise_id", current_user["franchise_id"])\
            .execute()
        
        print(f"✅ Delete Response: {response.data}")

        return {
            "success": True,
            "message": "Produit deleted successfully",
            "deleted_id": produit_id
        }
    
    except Exception as e:
        print(f"❌ Delete error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

@router.patch("/{produit_id}")
async def update_produit(produit_id: str, produit: ProduitUpdate, current_user: dict = Depends(get_current_user)):
    """Update an existing produit"""
    existing = supabase.table("produits")\
        .select("*")\
        .eq("id", produit_id)\
        .eq("franchise_id", current_user["franchise_id"])\
        .execute()
    
    if not existing.data:
        raise HTTPException(status_code=404, detail="Produit not found")
    
    response = supabase.table("produits").update(produit.model_dump(exclude_unset=True)).eq("id", produit_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Produit not found")
    return response.data[0]