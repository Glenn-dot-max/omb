from fastapi import APIRouter, HTTPException, Depends
from auth import get_current_user
from database import get_supabase_client
from utils import get_or_404, verify_commande_ownership
from models import CommandeFormuleCreate, CommandeFormuleUpdate, CommandeFormuleExclusionsUpdate
from datetime import date, datetime, time
from uuid import UUID
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/commande-formules", tags=["commande-formules"])
supabase = get_supabase_client()


@router.get("/commande/{commande_id}")
async def get_formules_by_commande(commande_id: str, current_user: dict = Depends(get_current_user)):
    """Get all formules for a commande"""
    verify_commande_ownership(supabase, commande_id, current_user)
        
    response = supabase.table("commande_formules").select("*").eq("commande_id", commande_id).execute()
    return response.data

@router.post("/")
async def create_commande_formule(commande_formule: CommandeFormuleCreate, current_user: dict = Depends(get_current_user)):
    """Add a formule to a commande"""
    # Vérifier la commande
    verify_commande_ownership(supabase, str(commande_formule.commande_id), current_user)
    
    # Vérifier la formule
    if current_user.get("role") == "TECH_ADMIN":
        # Tech admin peut utiliser n'importe quelle formule
        formule_check = supabase.table("formules").select("id").eq("id", str(commande_formule.formule_id)).execute()
    else:
        # User ne peut utiliser que les formules activées pour sa franchise
        formule_check = supabase.table("franchise_formules")\
            .select("id")\
            .eq("franchise_id", current_user["franchise_id"])\
            .eq("formule_id", str(commande_formule.formule_id))\
            .eq("active", True)\
            .execute()
    
    if not formule_check.data:
        raise HTTPException(status_code=404, detail="Formule not found or not accessible for this franchise")
    
    produits_exclus = commande_formule.produits_exclus
    formule_data = commande_formule.model_dump(mode="json", exclude={'produits_exclus'})

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

    return commande_formule_data

@router.delete("/{commande_formule_id}")
async def delete_commande_formule(commande_formule_id: int, current_user: dict = Depends(get_current_user)):
    """Remove a formule from a commande"""
    existing = get_or_404(supabase, "commande_formules", commande_formule_id, select="commande_id", detail="Commande-Formule not found")
    verify_commande_ownership(supabase, existing['commande_id'], current_user)

    response = supabase.table("commande_formules").delete().eq("id", commande_formule_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Commande-Formule not found")
    return {"message": "Commande-Formule deleted successfully"}

@router.get("/{commande_formule_id}/exclusions")
async def get_formule_exclusions(commande_formule_id: int, current_user: dict = Depends(get_current_user)):
    """Get excluded products for a commande-formule"""
    existing = get_or_404(supabase, "commande_formules", commande_formule_id, select="commande_id", detail="Commande-Formule not found")
    verify_commande_ownership(supabase, existing['commande_id'], current_user)
    
    response = supabase.table("commande_formule_exclusions")\
        .select("produit_id")\
        .eq("commande_formule_id", commande_formule_id)\
        .execute()
    
    # Retourner uniquement la liste des IDs des produits exclus
    return [row["produit_id"] for row in response.data]

@router.patch("/{commande_formule_id}")
async def update_commande_formule_exclusions(
    commande_formule_id: int,
    update_data: CommandeFormuleExclusionsUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update exclusions for a commande-formule"""
    existing = get_or_404(supabase, "commande_formules", commande_formule_id, select="commande_id", detail="Commande-Formule not found")
    verify_commande_ownership(supabase, existing['commande_id'], current_user)
    
    produits_exclus = update_data.produits_exclus
    quantite_finale = update_data.quantite_finale
    
    logger.info(f"📝 Mise à jour exclusions pour commande_formule {commande_formule_id}")
    logger.info(f"🚫 Nouveaux produits exclus : {produits_exclus}")
    if quantite_finale is not None:
        logger.info(f"🔢 Nouvelle quantité finale : {quantite_finale}")
    
    # 1. Mettre à jour quantite_finale si fournie
    if quantite_finale is not None:
        supabase.table("commande_formules")\
            .update({"quantite_finale": quantite_finale})\
            .eq("id", commande_formule_id)\
            .execute()
    
    # 2. Supprimer toutes les exclusions existantes
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
        logger.info(f"✅ {len(produits_exclus)} exclusion(s) ajoutée(s)")
    else:
        logger.info("✅ Toutes les exclusions ont été supprimées")
    
    return {
        "message": "Exclusions mises à jour avec succès", 
        "produits_exclus": produits_exclus,
        "quantite_finale": quantite_finale
    }