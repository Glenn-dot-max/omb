from fastapi import APIRouter, HTTPException
from database import get_supabase_client
from models import CommandeProduitCreate, CommandeProduitUpdate

router = APIRouter(prefix="/commande-produits", tags=["commande-produits"])
supabase = get_supabase_client()

@router.get("/commande/{commande_id}")
async def get_produits_by_commande(commande_id: str):
    """Get all produits for a commande"""
    response = supabase.table("commande_produits").select("*").eq("commande_id", commande_id).execute()
    return response.data

@router.post("/")
async def create_commande_produit(commande_produit: CommandeProduitCreate):
    """Add a produit to a commande"""
    response = supabase.table("commande_produits").insert(commande_produit.model_dump()).execute()
    return response.data[0]

@router.put("/{commande_produit_id}")
async def update_commande_produit(commande_produit_id: int, commande_produit: CommandeProduitUpdate):
    """Update commande-produit association"""
    update_data = {k: v for k, v in commande_produit.model_dump().items() if v is not None}
    response = supabase.table("commande_produits").update(update_data).eq("id", commande_produit_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Commande-Produit not found")
    return response.data[0]

@router.delete("/{commande_produit_id}")
async def delete_commande_produit(commande_produit_id: int):
    """Remove a produit from a commande"""
    response = supabase.table("commande_produits").delete().eq("id", commande_produit_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Commande-Produit not found")
    return {"message": "Commande-Produit deleted successfully"}