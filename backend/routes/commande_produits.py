from fastapi import APIRouter, HTTPException, Depends
from auth import get_current_user
from database import get_supabase_client
from utils import get_or_404, verify_commande_ownership
from models import CommandeProduitCreate, CommandeProduitUpdate
from datetime import date, datetime, time
from uuid import UUID

router = APIRouter(prefix="/commande-produits", tags=["commande-produits"])
supabase = get_supabase_client()

@router.get("/commande/{commande_id}")
async def get_produits_by_commande(commande_id: str, current_user: dict = Depends(get_current_user)):
    """Get all produits for a commande"""
    verify_commande_ownership(supabase, commande_id, current_user)

    response = supabase.table("commande_produits").select("*").eq("commande_id", commande_id).execute()
    return response.data

@router.post("/")
async def create_commande_produit(commande_produit: CommandeProduitCreate, current_user: dict = Depends(get_current_user)):
    """Add a produit to a commande"""
    # Vérifier ma commande
    verify_commande_ownership(supabase, str(commande_produit.commande_id), current_user)
    
    # Vérifier le produit
    if current_user.get("role") != "TECH_ADMIN":
        franchise_produit_check = supabase.table("franchise_produits")\
            .select("produit_id")\
            .eq("produit_id", str(commande_produit.produit_id))\
            .eq("franchise_id", current_user["franchise_id"])\
            .eq("active", True)\
            .execute()
        
        if not franchise_produit_check.data:
            raise HTTPException(status_code=404, detail="Produit not found in your franchise")
        
    else:  
        produit_check = supabase.table("produits")\
            .select("id")\
            .eq("id", str(commande_produit.produit_id))\
            .execute()
        
        if not produit_check.data:
            raise HTTPException(status_code=404, detail="Produit not found")
    
    produit_data = commande_produit.model_dump(mode="json")
    response = supabase.table("commande_produits").insert(produit_data).execute()
    return response.data[0]

@router.put("/{commande_produit_id}")
async def update_commande_produit(commande_produit_id: int, commande_produit: CommandeProduitUpdate, current_user: dict = Depends(get_current_user)):
    """Update commande-produit association"""
    existing = get_or_404(supabase, "commande_produits", commande_produit_id, select="commande_id", detail="Commande-Produit not found")
    verify_commande_ownership(supabase, existing["commande_id"], current_user)

    update_data = {k: v for k, v in commande_produit.model_dump().items() if v is not None}
    response = supabase.table("commande_produits").update(update_data).eq("id", commande_produit_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Commande-Produit not found")

    return response.data[0]

@router.delete("/{commande_produit_id}")
async def delete_commande_produit(commande_produit_id: int, current_user: dict = Depends(get_current_user)):
    """Remove a produit from a commande"""
    existing = get_or_404(supabase, "commande_produits", commande_produit_id, select="commande_id", detail="Commande-Produit not found")
    verify_commande_ownership(supabase, existing["commande_id"], current_user)

    response = supabase.table("commande_produits").delete().eq("id", commande_produit_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Commande-Produit not found")
    return {"message": "Commande-Produit deleted successfully"}