from fastapi import APIRouter, HTTPException, Depends
from auth import get_current_user
from fastapi.encoders import jsonable_encoder
from database import get_supabase_client
from models import FormuleProduitCreate, FormuleProduitUpdate

router = APIRouter(prefix="/formule-produits", tags=["formule-produits"])
supabase = get_supabase_client()

@router.get("/formule/{formule_id}")
async def get_produits_by_formule(formule_id: str, current_user: dict = Depends(get_current_user)):
    """Get all produits for a formule"""
    formule_check = supabase.table("formules")\
        .select("id")\
        .eq("id", formule_id)\
        .eq("franchise_id", current_user["franchise_id"])\
        .execute()
    
    if not formule_check.data:
        raise HTTPException(status_code=404, detail="Formule not found")
    
    response = supabase.table("formule_produits").select("*, produits(name)").eq("formule_id", formule_id).execute()

    # Transformer les données pour aplatir la structure
    result = []
    for item in response.data:
        result.append({
            "id": item["id"],
            "formule_id": item["formule_id"],
            "produit_id": item["produit_id"],
            "quantite": item.get("quantite", 1),
            "unite": item.get("unite", "pièces"),
            "produit_name": item["produits"]["name"] if item.get("produits") else "Produit inconnu"
        })
    
    return result

@router.post("/")
async def create_formule_produit(formule_produit: FormuleProduitCreate, current_user: dict = Depends(get_current_user)):
    """Add a produit to a formule"""
    formule_check = supabase.table("formules")\
        .select("id")\
        .eq("id", str(formule_produit.formule_id))\
        .execute()
    
    if not formule_check.data:
        raise HTTPException(status_code=404, detail="Formule not found")

    if current_user.get("role") != "TECH_ADMIN":
        franchise_formule_access = supabase.table("franchise_formules")\
            .select("formule_id")\
            REPRENDRE ICI 

    produit_check = supabase.table("produits")\
        .select("id")\
        .eq("id", str(formule_produit.produit_id))\
        .eq("franchise_id", current_user["franchise_id"])\
        .execute()  
    
    if not produit_check.data:
        raise HTTPException(status_code=404, detail="Produit not found")

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
async def update_formule_produit(formule_produit_id: int, formule_produit: FormuleProduitUpdate, current_user: dict = Depends(get_current_user)):
    """Update formule-produit association"""

    existing = supabase.table("formule_produits")\
        .select("formule_id")\
        .eq("id", formule_produit_id)\
        .execute()
    
    if not existing.data:
        raise HTTPException(status_code=404, detail="Formule-Produit not found")
    
    formule_check = supabase.table("formules")\
        .select("id")\
        .eq("id", existing.data[0]['formule_id'])\
        .eq("franchise_id", current_user["franchise_id"])\
        .execute()
    
    if not formule_check.data:
        raise HTTPException(status_code=404, detail="Formule not found")

    update_data = {k: v for k, v in formule_produit.model_dump().items() if v is not None}
    response = supabase.table("formule_produits").update(update_data).eq("id", formule_produit_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Formule-Produit not found")
    return response.data[0]

@router.delete("/{formule_produit_id}")
async def delete_formule_produit(formule_produit_id: int, current_user: dict = Depends(get_current_user)):
    """Remove a produit from a formule"""
    existing = supabase.table("formule_produits")\
        .select("formule_id")\
        .eq("id", formule_produit_id)\
        .execute()
    
    if not existing.data:
        raise HTTPException(status_code=404, detail="Formule-Produit not found")
    
    formule_check = supabase.table("formules")\
        .select("id")\
        .eq("id", existing.data[0]['formule_id'])\
        .eq("franchise_id", current_user["franchise_id"])\
        .execute()
    
    if not formule_check.data:
        raise HTTPException(status_code=404, detail="Formule not found")
    
    response = supabase.table("formule_produits").delete().eq("id", formule_produit_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Formule-Produit not found")
    return {"message": "Formule-Produit deleted successfully"}