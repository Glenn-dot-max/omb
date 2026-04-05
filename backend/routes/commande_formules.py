from fastapi import APIRouter, HTTPException
from database import get_supabase_client
from models import CommandeFormuleCreate, CommandeFormuleUpdate
from datetime import date, datetime, time
from uuid import UUID

router = APIRouter(prefix="/commande-formules", tags=["commande-formules"])
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
async def get_formules_by_commande(commande_id: str):
    """Get all formules for a commande"""
    response = supabase.table("commande_formules").select("*").eq("commande_id", commande_id).execute()
    return [serialize_date(commande_formule) for commande_formule in response.data]

@router.post("/")
async def create_commande_formule(commande_formule: CommandeFormuleCreate):
    """Add a formule to a commande"""
    produits_exclus = commande_formule.produits_exclus

    formule_data = serialize_date(commande_formule.model_dump(exclude={'produits_exclus'}))

    # Insérer la commande_formule
    response = supabase.table("commande_formules").insert(formule_data).execute()
    commande_formule_data = response.data[0]
    commande_formule_id = commande_formule_data['id']

    # Sauvegarder les produits exclus dans une table dédiée
    if produits_exclus:
        exclusions_data = [
            {
                "commande_formule_id": commande_formule_id,
                "produit_id": produit_id
            }
            for produit_id in produits_exclus
        ]
        supabase.table("commande_formule_exclusions").insert(exclusions_data).execute()

        return serialize_date(commande_formule_data)


@router.put("/{commande_formule_id}")
async def update_commande_formule(commande_formule_id: int, commande_formule: CommandeFormuleUpdate):
    """Update commande-formule association"""
    update_data = {k: v for k, v in commande_formule.model_dump().items() if v is not None}
    response = supabase.table("commande_formules").update(update_data).eq("id", commande_formule_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Commande-Formule not found")
    return serialize_date(response.data[0])

@router.delete("/{commande_formule_id}")
async def delete_commande_formule(commande_formule_id: int):
    """Remove a formule from a commande"""
    response = supabase.table("commande_formules").delete().eq("id", commande_formule_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Commande-Formule not found")
    return {"message": "Commande-Formule deleted successfully"}

@router.get("/{commande_formule_id}/exclusions")
async def get_formule_exclusions(commande_formule_id: int):
    """Get excluded products for a commande-formule"""
    response = supabase.table("commande_formule_exclusions")\
        .select("produit_id")\
        .eq("commande_formule_id", commande_formule_id)\
        .execute()
    
    # Retourner uniquement la liste des IDs des produits exclus
    return [row["produit_id"] for row in response.data]

@router.patch("/{commande_formule_id}")
async def update_commande_formule_exclusions(commande_formule_id: int, update_data: dict):
    """Update exclusions for a commande-formule"""
    produits_exclus = update_data.get("produits_exclus", [])
    
    print(f"📝 Mise à jour exclusions pour commande_formule {commande_formule_id}")
    print(f"🚫 Nouveaux produits exclus : {produits_exclus}")
    
    # 1. Supprimer toutes les exclusions existantes
    supabase.table("commande_formule_exclusions")\
        .delete()\
        .eq("commande_formule_id", commande_formule_id)\
        .execute()
    
    # 2. Insérer les nouvelles exclusions
    if produits_exclus:
        exclusions_data = [
            {
                "commande_formule_id": commande_formule_id,
                "produit_id": produit_id
            }
            for produit_id in produits_exclus
        ]
        supabase.table("commande_formule_exclusions").insert(exclusions_data).execute()
        print(f"✅ {len(produits_exclus)} exclusion(s) ajoutée(s)")
    else:
        print("✅ Toutes les exclusions ont été supprimées")
    
    return {
        "message": "Exclusions mises à jour avec succès", 
        "produits_exclus": produits_exclus
    }