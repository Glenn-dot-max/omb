from fastapi import APIRouter, HTTPException
from database import get_supabase_client
from models import CommandeFormuleCreate, CommandeFormuleUpdate

router = APIRouter(prefix="/commande-formules", tags=["commande-formules"])
supabase = get_supabase_client()

@router.get("/commande/{commande_id}")
async def get_formules_by_commande(commande_id: str):
    """Get all formules for a commande"""
    response = supabase.table("commande_formules").select("*").eq("commande_id", commande_id).execute()
    return response.data

@router.post("/")
async def create_commande_formule(commande_formule: CommandeFormuleCreate):
    """Add a formule to a commande"""
    response = supabase.table("commande_formules").insert(commande_formule.model_dump()).execute()
    return response.data[0]

@router.put("/{commande_formule_id}")
async def update_commande_formule(commande_formule_id: int, commande_formule: CommandeFormuleUpdate):
    """Update commande-formule association"""
    update_data = {k: v for k, v in commande_formule.model_dump().items() if v is not None}
    response = supabase.table("commande_formules").update(update_data).eq("id", commande_formule_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Commande-Formule not found")
    return response.data[0]

@router.delete("/{commande_formule_id}")
async def delete_commande_formule(commande_formule_id: int):
    """Remove a formule from a commande"""
    response = supabase.table("commande_formules").delete().eq("id", commande_formule_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Commande-Formule not found")
    return {"message": "Commande-Formule deleted successfully"}