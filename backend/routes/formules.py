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

@router.get("/{formule_id}/with-products")
async def get_formule_with_products(formule_id: str):
    """
    Récupère une formule avec la liste complète de ses produits. 
    Utilisé pour permettre la sélection/exclusion de produits.
    """
    # 1. Récupérer la formule
    formule_response = supabase.table("formules")\
        .select("*")\
        .eq("id", formule_id)\
        .single()\
        .execute()
    
    if not formule_response.data:
        raise HTTPException(status_code=404, detail="Formule not found")
    
    # 2. Récupérer tous les produits de cette formule
    produits_response = supabase.table("formule_produits")\
        .select("*, produits(id, name)")\
        .eq("formule_id", formule_id)\
        .execute()
    
    # 3. Formater les données
    produits = []
    for item in produits_response.data:
        produits.append({
            "id": item["id"],
            "produit_id": item["produit_id"],
            "produit_name": item["produits"]["name"],
            "quantite": item.get("quantite", 1),
            "unite": item.get("unite", "unité")
        })

    return {
        "formule": formule_response.data,
        "produits": produits
    }

