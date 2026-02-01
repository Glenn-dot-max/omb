from uuid import UUID
from fastapi import APIRouter, HTTPException
from database import get_supabase_client
from models import FormuleCreate, FormuleUpdate
from fastapi.encoders import jsonable_encoder

router = APIRouter(prefix="/formules", tags=["formules"])
supabase = get_supabase_client()

@router.get("/")
async def get_formules():
    """Get all formules"""
    response = supabase.table("formules").select("*").order("name").execute()
    return response.data

@router.get("/{formule_id}")
async def get_formule(formule_id: str):
    """Get a single formule by ID"""
    response = supabase.table("formules").select("*").eq("id", formule_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Formule not found")
    return response.data[0]

@router.post("/")
async def create_formule(formule: FormuleCreate):
    """Create a new formule"""
    # Convertir les données en dict sérialisable
    data = formule.model_dump()

    # Convertir les UUIDs en string si présents
    for key, value in data.items():
        if isinstance(value, UUID):
            data[key] = str(value)

    response = supabase.table("formules").insert(data).execute()

    if not response.data:
        raise HTTPException(status_code=400, detail="Failed to create Formule")
    return jsonable_encoder(response.data[0])

@router.put("/{formule_id}")
async def update_formule(formule_id: str, formule: FormuleUpdate):
    """Update an existing formule"""
    update_data = {k: v for k, v in formule.model_dump().items() if v is not None}
    response = supabase.table("formules").update(update_data).eq("id", formule_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Formule not found")
    return response.data[0]

@router.delete("/{formule_id}")
async def delete_formule(formule_id: str):
    """Delete a formule"""
    response = supabase.table("formules").delete().eq("id", formule_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Formule not found")
    return {"message": "Formule deleted successfully"}