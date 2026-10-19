from fastapi import APIRouter, HTTPException, Depends
from auth import get_current_user
from database import get_supabase_client
from utils import get_or_404, verify_commande_ownership

router = APIRouter(prefix="/commande-produits", tags=["commande-produits"])
supabase = get_supabase_client()

@router.get("/commande/{commande_id}")
def get_produits_by_commande(commande_id: str, current_user: dict = Depends(get_current_user)):
    """Get all produits for a commande"""
    verify_commande_ownership(supabase, commande_id, current_user)

    response = supabase.table("commande_produits").select("*").eq("commande_id", commande_id).execute()
    return response.data

@router.delete("/{commande_produit_id}")
def delete_commande_produit(commande_produit_id: int, current_user: dict = Depends(get_current_user)):
    """Remove a produit from a commande"""
    existing = get_or_404(supabase, "commande_produits", commande_produit_id, select="commande_id", detail="Commande-Produit not found")
    verify_commande_ownership(supabase, existing["commande_id"], current_user)

    response = supabase.table("commande_produits").delete().eq("id", commande_produit_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Commande-Produit not found")
    return {"message": "Commande-Produit deleted successfully"}