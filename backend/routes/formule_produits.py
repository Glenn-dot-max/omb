from fastapi import APIRouter, HTTPException
from fastapi.encoders import jsonable_encoder
from database import get_supabase_client
from models import FormuleProduitCreate, FormuleProduitUpdate

router = APIRouter(prefix="/formule-produits", tags=["formule-produits"])
supabase = get_supabase_client()

@router.get("/formule/{formule_id}")
async def get_produits_by_formule(formule_id: str):
    """Get all produits for a formule"""
    response = supabase.table("formule_produits").select("*").eq("formule_id", formule_id).execute()
    return response.data

@router.post("/")
async def create_formule_produit(formule_produit: FormuleProduitCreate):
    """Add a produit to a formule"""
    
    # Convertir les UUIDs en string
    data = formule_produit.model_dump()
    if "formule_id" in data:
        data["formule_id"] = str(data["formule_id"])
    if "produit_id" in data:
        data["produit_id"] = str(data["produit_id"])
    
    response = supabase.table("formule_produits").insert(data).execute()
    
    if not response.data:
        raise HTTPException(status_code=400, detail="Failed to create Formule-Produit")
    
    return jsonable_encoder(response.data[0])

@router.put("/{formule_produit_id}")
async def update_formule_produit(formule_produit_id: int, formule_produit: FormuleProduitUpdate):
    """Update formule-produit association"""
    update_data = {k: v for k, v in formule_produit.model_dump().items() if v is not None}
    response = supabase.table("formule_produits").update(update_data).eq("id", formule_produit_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Formule-Produit not found")
    return response.data[0]

@router.delete("/{formule_produit_id}")
async def delete_formule_produit(formule_produit_id: int):
    """Remove a produit from a formule"""
    response = supabase.table("formule_produits").delete().eq("id", formule_produit_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Formule-Produit not found")
    return {"message": "Formule-Produit deleted successfully"}