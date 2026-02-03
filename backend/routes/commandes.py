from fastapi import APIRouter, HTTPException
from database import get_supabase_client
from models import CarnetCommandeCreate, CarnetCommandeUpdate
from datetime import datetime, date
from uuid import UUID

router = APIRouter(prefix="/commandes", tags=["commandes"])
supabase = get_supabase_client()

def serialize_commande(commande):
    """Serialize commande data, converting UUIDs and dates to strings"""
    if isinstance(commande, dict):
        result = {}
        for key, value in commande.items():
            if isinstance(value, (date, datetime)):
                result[key] = value.isoformat()
            elif isinstance(value, UUID):
                result[key] = str(value)
            else:
                result[key] = value
        return result
    return commande

@router.get("/")
async def get_commandes():
    """Get all commandes"""
    response = supabase.table("carnet_commande").select("*").order("delivery_date", desc=True).execute()
    return [serialize_commande(commande) for commande in response.data]

@router.get("/{commande_id}")
async def get_commande(commande_id: str):
    """Get a single commande by ID"""
    response = supabase.table("carnet_commande").select("*").eq("id", commande_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Commande not found")
    return serialize_commande(response.data[0])

@router.post("/")
async def create_commande(commande: CarnetCommandeCreate):
    """Create a new commande"""
    response = supabase.table("carnet_commande").insert(commande.model_dump()).execute()
    return serialize_commande(response.data[0])

@router.put("/{commande_id}")
async def update_commande(commande_id: str, commande: CarnetCommandeUpdate):
    """Update an existing commande"""
    update_data = {k: v for k, v in commande.model_dump().items() if v is not None}
    response = supabase.table("carnet_commande").update(update_data).eq("id", commande_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Commande not found")
    return serialize_commande(response.data[0])

@router.delete("/{commande_id}")
async def delete_commande(commande_id: str):
    """Delete a commande"""
    response = supabase.table("carnet_commande").delete().eq("id", commande_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Commande not found")
    return {"message": "Commande deleted successfully"}