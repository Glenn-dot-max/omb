from fastapi import APIRouter, HTTPException, Depends
from auth import get_current_user
from database import get_supabase_client
from utils import get_or_404, verify_commande_ownership, noter_historique

router = APIRouter(prefix="/commande-formules", tags=["commande-formules"])
supabase = get_supabase_client()


@router.get("/commande/{commande_id}")
def get_formules_by_commande(commande_id: str, current_user: dict = Depends(get_current_user)):
    """Formules d'une commande, AVEC leurs exclusions, en une seule requête (P5a-3)"""
    verify_commande_ownership(supabase, commande_id, current_user)

    # Jointure : Supabase renvoie, pour chaque formule, la liste de ses exclusions
    response = supabase.table("commande_formules")\
        .select("*, commande_formule_exclusions(produit_id)")\
        .eq("commande_id", commande_id)\
        .execute()

    # On aplatit au format attendu par le frontend : produits_exclus =["id1", "id2", ...]
    for ligne in response.data:
        exclusions = ligne.pop("commande_formule_exclusions", None) or []
        ligne["produits_exclus"] = [e["produit_id"] for e in exclusions]

    return response.data


@router.delete("/{commande_formule_id}")
def delete_commande_formule(commande_formule_id: int, current_user: dict = Depends(get_current_user)):
    """Remove a formule from a commande"""
    existing = get_or_404(supabase, "commande_formules", commande_formule_id, select="commande_id", detail="Commande-Formule not found")
    verify_commande_ownership(supabase, existing['commande_id'], current_user)

    response = supabase.table("commande_formules").delete().eq("id", commande_formule_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Commande-Formule not found")

    # Ancien frontend (retrait immédiat) : noté dans l'historique comme une modification
    noter_historique(supabase, existing["commande_id"], current_user.get("franchise_id"), current_user,
                     "modification", {"formules_retirees": 1})

    return {"message": "Commande-Formule deleted successfully"}
