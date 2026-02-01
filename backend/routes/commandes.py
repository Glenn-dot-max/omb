from fastapi import APIRouter, HTTPException
from database import get_supabase_client
from models import CarnetCommandeCreate, CarnetCommandeUpdate

router = APIRouter(prefix="/commandes", tags=["commandes"])
supabase = get_supabase_client()

@router.get("/")
async def get_commandes():
    """Get all commandes"""
    response = supabase.table("carnet_commande").select("*").order("delivery_date", desc=True).execute()
    return response.data

@router.get("/{commande_id}")
async def get_commande(commande_id: str):
    """Get a single commande by ID"""
    response = supabase.table("carnet_commande").select("*").eq("id", commande_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Commande not found")
    return response.data[0]

@router.post("/")
async def create_commande(commande: CarnetCommandeCreate):
    """Create a new commande"""
    response = supabase.table("carnet_commande").insert(commande.model_dump()).execute()
    return response.data[0]

@router.put("/{commande_id}")
async def update_commande(commande_id: str, commande: CarnetCommandeUpdate):
    """Update an existing commande"""
    update_data = {k: v for k, v in commande.model_dump().items() if v is not None}
    response = supabase.table("carnet_commande").update(update_data).eq("id", commande_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Commande not found")
    return response.data[0]

@router.delete("/{commande_id}")
async def delete_commande(commande_id: str):
    """Delete a commande"""
    response = supabase.table("carnet_commande").delete().eq("id", commande_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Commande not found")
    return {"message": "Commande deleted successfully"}