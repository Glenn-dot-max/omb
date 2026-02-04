from fastapi import APIRouter, HTTPException
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
async def get_produits_by_commande(commande_id: str):
    """Get all produits for a commande"""
    response = supabase.table("commande_produits").select("*").eq("commande_id", commande_id).execute()
    return [serialize_date(commande_produit) for commande_produit in response.data]

@router.post("/")
async def create_commande_produit(commande_produit: CommandeProduitCreate):
    """Add a produit to a commande"""
    produit_data = serialize_date(commande_produit.model_dump())
    response = supabase.table("commande_produits").insert(produit_data).execute()
    return serialize_date(response.data[0])

@router.put("/{commande_produit_id}")
async def update_commande_produit(commande_produit_id: int, commande_produit: CommandeProduitUpdate):
    """Update commande-produit association"""
    update_data = {k: v for k, v in commande_produit.model_dump().items() if v is not None}
    response = supabase.table("commande_produits").update(update_data).eq("id", commande_produit_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Commande-Produit not found")
    return serialize_date(response.data[0])

@router.delete("/{commande_produit_id}")
async def delete_commande_produit(commande_produit_id: int):
    """Remove a produit from a commande"""
    response = supabase.table("commande_produits").delete().eq("id", commande_produit_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Commande-Produit not found")
    return {"message": "Commande-Produit deleted successfully"}