from fastapi import APIRouter, HTTPException
from database import get_supabase_client  # ← Utilise la fonction
from models import ProduitCreate, ProduitUpdate
from fastapi.encoders import jsonable_encoder

router = APIRouter(prefix="/produits", tags=["produits"])
supabase = get_supabase_client()  # ← Récupère le client

@router.get("/")  # ← "/" au lieu de ""
async def get_produits():
    """Get all produits"""
    response = supabase.table("produits").select("*").order("name").execute()
    return response.data

@router.get("/{produit_id}")
async def get_produit(produit_id: str):
    """Get a single produit by ID"""
    response = supabase.table("produits").select("*").eq("id", produit_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Produit not found")
    return response.data[0]

@router.post("/")  # ← "/" au lieu de ""
async def create_produit(produit: ProduitCreate):
    """Create a new produit"""
    # Vérifier di un produit avec le même nom existe déjà
    existing = supabase.table("produits").select("*").eq("name", produit.name).execute()
    if existing.data:
        raise HTTPException(status_code=409, detail="Un produit avec ce nom existe déjà")
    response = supabase.table("produits").insert(produit.model_dump()).execute()
    if not response.data:
        raise HTTPException(status_code=400, detail="Failed to create Produit")
    return jsonable_encoder(response.data[0])


@router.delete("/{produit_id}")
async def delete_produit(produit_id: str):
    """Delete a produit"""
    response = supabase.table("produits").delete().eq("id", produit_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Produit not found")
    return {"message": "Produit deleted successfully"}

@router.patch("/{produit_id}")
async def update_produit(produit_id: str, produit: ProduitUpdate):
    """Update an existing produit"""
    response = supabase.table("produits").update(produit.model_dump(exclude_unset=True)).eq("id", produit_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Produit not found")
    return response.data[0]

