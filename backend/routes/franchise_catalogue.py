from fastapi import APIRouter, Depends, HTTPException
from typing import List
from uuid import UUID
from database import get_supabase_client
from models import FranchiseProduitResponse, FranchiseFormuleResponse
from routes.auth import get_current_user

router = APIRouter(prefix="/admin/franchises", tags=["Franchise Catalogue"])

# ===========================================
# PRODUITS PAR FRANCHISE
# ===========================================

@router.get("/{franchise_id}/produits", response_model=List[FranchiseProduitResponse])
async def get_franchise_produits(
    franchise_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Récupère tous les produits avec leur status (actif/inactif)
    pour une franchise donnée.
    """
    supabase = get_supabase_client()

    try:
        # Vérifier que la franchise existe
        franchise_check = supabase.table("franchises").select("id").eq("id", franchise_id).execute()
        if not franchise_check.data:
            raise HTTPException(status_code=404, detail="Franchise non trouvée")
        
        # Récupérer TOUS les produits avec catégorie et type
        all_produits = supabase.table("produits").select("*").execute()
        

        # Récupérer les produits actifs pour cette franchise
        franchise_produits = supabase.table("franchise_produits").select(
            "produit_id, active"
        ).eq("franchise_id", franchise_id).eq("active", True).execute()

        # Créer un set des IDs actifs 
        active_ids = {p["produit_id"] for p in franchise_produits.data}

        # Construite la réponse
        result = []
        for produit in all_produits.data:
            result.append({
                "id": produit["id"],
                "nom": produit["name"],
                "categorie": produit["categorie"]["name"] if produit.get("categorie") else "Sans catégorie",
                "type": produit["type"]["name"] if produit.get("type") else "Sans type",
                "active": produit["id"] in active_ids
            })
        
        return result
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des produits: {str(e)}")
    
# ===========================================
# FORMULES PAR FRANCHISE
# ===========================================

@router.get("/{franchise_id}/formules", response_model=List[FranchiseFormuleResponse])
async def get_franchise_formules(
    franchise_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Récupère toutes les formules avec leur status (actif/inactif)
    pour une franchise donnée.
    """
    supabase = get_supabase_client()

    try:
        # Vérifier que la franchise existe
        franchise_check = supabase.table("franchises").select("id").eq("id", franchise_id).execute()
        if not franchise_check.data:
            raise HTTPException(status_code=404, detail="Franchise non trouvée")
        
        # Récupérer TOUS les formules
        all_formules = supabase.table("formules").select("*").execute()

        # Récupérer les formules actifs pour cette franchise
        franchise_formules = supabase.table("franchise_formules").select(
            "formule_id, active"
        ).eq("franchise_id", franchise_id).eq("active", True).execute()

        # Créer un set des IDs actifs
        active_ids = {f["formule_id"] for f in franchise_formules.data}

        # Construite la réponse
        result = []
        for formule in all_formules.data:
            # Compter les produits de la formule
            produits_count_data = supabase.table("formule_produits").select(
                "id", count="exact"
            ).eq("formule_id", formule["id"]).execute()

            produits_count = produits_count_data.count if produits_count_data.count else 0

            result.append({
                "id": formule["id"],
                "nom": formule["name"],
                "description": formule.get("description"),
                "nombre_couverts": formule["nombre_couverts"],
                "type_formule": formule.get("type_formule", "Non-Brunch"),
                "active": formule["id"] in active_ids,
                "produits_count": produits_count
            })

        return result
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des formules: {str(e)}")
    