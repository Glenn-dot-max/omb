from fastapi import APIRouter, HTTPException, Depends
from auth import get_current_user
from database import get_supabase_client
from models import CommandeProduitCreate, CommandeProduitUpdate
from datetime import date, datetime, time
from uuid import UUID

router = APIRouter(prefix="/commande-produits", tags=["commande-produits"])
supabase = get_supabase_client()

def serialize_date(data):
    """Serialize date, converting UUIDs and dates to strings"""
    if isinstance(data, dict):
        result = {}
        for key, value in data.items():
            if isinstance(value, (date, datetime, time)):
                result[key] = value.isoformat()
            elif isinstance(value, UUID):
                result[key] = str(value)
            else:
                result[key] = value
        return result
    return data


@router.get("/commande/{commande_id}")
async def get_produits_by_commande(commande_id: str, current_user: dict = Depends(get_current_user)):
    """Get all produits for a commande"""
    commande_check = supabase.table("carnet_commande")\
        .select("id")\
        .eq("id", commande_id)\
        .eq("franchise_id", current_user["franchise_id"])\
        .execute()
    
    if not commande_check.data:
        raise HTTPException(status_code=404, detail="Commande not found")
    
    response = supabase.table("commande_produits").select("*").eq("commande_id", commande_id).execute()
    return [serialize_date(commande_produit) for commande_produit in response.data]

@router.post("/")
async def create_commande_produit(commande_produit: CommandeProduitCreate, current_user: dict = Depends(get_current_user)):
    """Add a produit to a commande"""
    commande_check = supabase.table("carnet_commande")\
        .select("id")\
        .eq("id", str(commande_produit.commande_id))\
        .eq("franchise_id", current_user["franchise_id"])\
        .execute()
    
    if not commande_check.data:
        raise HTTPException(status_code=404, detail="Commande not found")
    
    produit_check = supabase.table("produits")\
        .select("id")\
        .eq("id", str(commande_produit.produit_id))\
        .eq("franchise_id", current_user["franchise_id"])\
        .execute()
    
    if not produit_check.data:
        raise HTTPException(status_code=404, detail="Produit not found")
    
    produit_data = serialize_date(commande_produit.model_dump())
    response = supabase.table("commande_produits").insert(produit_data).execute()
    return serialize_date(response.data[0])

@router.put("/{commande_produit_id}")
async def update_commande_produit(commande_produit_id: int, commande_produit: CommandeProduitUpdate, current_user: dict = Depends(get_current_user)):
    """Update commande-produit association"""
    existing = supabase.table("commande_produits")\
        .select("commande_id")\
        .eq("id", commande_produit_id)\
        .execute()
    
    if not existing.data:
        raise HTTPException(status_code=404, detail="Commande-Produit not found")
    
    commande_check = supabase.table("carnet_commande")\
        .select("id")\
        .eq("id", existing.data[0]['commande_id'])\
        .eq("franchise_id", current_user["franchise_id"])\
        .execute()
    
    if not commande_check.data:
        raise HTTPException(status_code=404, detail="Commande not found")
    
    update_data = {k: v for k, v in commande_produit.model_dump().items() if v is not None}
    response = supabase.table("commande_produits").update(update_data).eq("id", commande_produit_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Commande-Produit not found")
    return serialize_date(response.data[0])

@router.delete("/{commande_produit_id}")
async def delete_commande_produit(commande_produit_id: int, current_user: dict = Depends(get_current_user)):
    """Remove a produit from a commande"""
    existing = supabase.table("commande_produits")\
        .select("commande_id")\
        .eq("id", commande_produit_id)\
        .execute()
    
    if not existing.data:
        raise HTTPException(status_code=404, detail="Commande-Produit not found")
    
    commande_check = supabase.table("carnet_commande")\
        .select("id")\
        .eq("id", existing.data[0]['commande_id'])\
        .eq("franchise_id", current_user["franchise_id"])\
        .execute()
    
    if not commande_check.data:
        raise HTTPException(status_code=404, detail="Commande not found")
    
    response = supabase.table("commande_produits").delete().eq("id", commande_produit_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Commande-Produit not found")
    return {"message": "Commande-Produit deleted successfully"}