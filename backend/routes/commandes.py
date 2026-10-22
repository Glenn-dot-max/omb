from zoneinfo import ZoneInfo
from fastapi import APIRouter, HTTPException, Depends, status
from auth import get_current_user
from database import get_supabase_client
from models import CommandeComplete, CommandeModification
from utils import verify_commande_ownership, check_acces_catalogue
from datetime import datetime, date, time, timedelta
from uuid import UUID
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/commandes", tags=["commandes"])
supabase = get_supabase_client()

def serialize_commande(commande):
    """Serialize commande data, converting UUIDs and dates to strings"""
    if isinstance(commande, dict):
        result = {}
        for key, value in commande.items():
            if isinstance(value, (date, datetime, time)):
                result[key] = value.isoformat()
            elif isinstance(value, UUID):
                result[key] = str(value)
            else:
                result[key] = value
        return result
    return commande

def format_delivery_fields(data: dict) -> dict:
    """Convertit delivery_date (date) et delivery_hour (time) en texte pour Supabase.
    Formats : "AAAA-MM-JJ" et "HH:MM:SS"
    """
    if isinstance(data.get("delivery_date"), date):
        data["delivery_date"] = data["delivery_date"].isoformat()
    if isinstance(data.get("delivery_hour"), time):
        data["delivery_hour"] = data["delivery_hour"].isoformat()
    return data

def check_commande_doublon(commande_data: dict):
    """Refuse (409) une commande identique déjà existante et non archivée :
    même franchise, même client, même date et même heure de livraison."""
    existing = supabase.table("carnet_commande")\
        .select("id")\
        .eq("franchise_id", commande_data["franchise_id"])\
        .eq("nom_client", commande_data["nom_client"])\
        .eq("delivery_date", commande_data["delivery_date"])\
        .eq("delivery_hour", commande_data.get("delivery_hour", "10:00"))\
        .eq("archived", False)\
        .execute()

    if existing.data and len(existing.data) > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"❌ Une commande avec le nom \"{commande_data['nom_client']}\" existe déjà pour le {commande_data['delivery_date']} à {commande_data.get('delivery_hour', '10:00')}."
        )



@router.get("/")
def get_commandes(current_user: dict = Depends(get_current_user)):
    """Get all commandes (TECH_ADMIN: all, USER: their franchise)"""
    try:
        query = supabase.table("carnet_commande").select("*")

        if current_user["role"] != "TECH_ADMIN":
            if not current_user.get("franchise_id"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Utilisateur sans franchise associée"
                )
            query = query.eq("franchise_id", current_user["franchise_id"])

        response = query\
            .eq("archived", False)\
            .order("delivery_date", desc=False)\
            .execute()
        
        paris_tz = ZoneInfo("Europe/Paris")
        paris_now = datetime.now(paris_tz)

        return {
            "commandes": response.data,
            "paris_date": paris_now.date().isoformat(),
            "paris_datetime": paris_now.isoformat()
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error loading commandes: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur lors du chargement des commandes"
        )   

@router.get("/archived")
def get_archived_commandes(current_user: dict = Depends(get_current_user)):
    """Get all archived commandes (TECH_ADMIN: all, USER: their franchise)"""
    
    try:
        # ✅ CORRECTION : Ne pas filtrer par franchise pour TECH_ADMIN
        query = supabase.table("carnet_commande").select("*")
        
        # Si l'utilisateur n'est PAS TECH_ADMIN, filtrer par franchise
        if current_user.get("role") != "TECH_ADMIN":
            if not current_user.get("franchise_id"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Utilisateur sans franchise associée"
                )
            query = query.eq("franchise_id", current_user["franchise_id"])
        
        # Ajouter les filtres communs
        response = query\
            .eq("archived", True)\
            .order("delivery_date", desc=True)\
            .execute()
        
        return response.data
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error loading archived commandes: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur lors du chargement des commandes archivées"
        )
    

@router.get("/{commande_id}")
def get_commande(commande_id: str, current_user: dict = Depends(get_current_user)):
    """Get a single Non-archived commande by ID"""

    query = supabase.table("carnet_commande").select("*").eq("id", commande_id).eq("archived", False)

    if current_user["role"] != "TECH_ADMIN":
        if not current_user.get("franchise_id"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Utilisateur sans franchise associée"
            )
        query = query.eq("franchise_id", current_user["franchise_id"])

    response = query.execute()

    if not response.data:
        raise HTTPException(status_code=404, detail="Commande not found")
    return response.data[0]

@router.post("/complete")
def create_commande_complete(commande: CommandeComplete, current_user: dict = Depends(get_current_user)):
    """Crée une commande AVEC ses formules (et leurs exclusions) et ses produits, en un seul appel.
    Les droits sont vérifiés une seule fois, puis tout est inséré par lots (une insertion par table).
    Si une insertion échoue après la création de la commande, la commande est supprimée :
    ses formules, exclusions et produits partent avec (ON DELETE CASCADE en base)."""
    franchise_id = current_user.get("franchise_id")
    if not franchise_id:
        raise HTTPException(status_code=400, detail="Un compte sans franchise ne peut pas créer de commande")

    # 1. Préparer la commande et vérifier qu'elle n'existe pas déjà
    commande_data = format_delivery_fields(commande.model_dump(exclude={"formules", "produits"}))
    commande_data["franchise_id"] = franchise_id
    check_commande_doublon(commande_data)

    # 2. Vérifier les droits sur TOUTES les formules et TOUS les produits (1 requête chacun)
    formule_ids = [str(f.formule_id) for f in commande.formules]
    produit_ids = list({str(p.produit_id) for p in commande.produits})
    check_acces_catalogue(supabase, "franchise_formules", "formule_id", formule_ids, franchise_id, "Formule")
    check_acces_catalogue(supabase, "franchise_produits", "produit_id", produit_ids, franchise_id, "Produit")

    # 3. Créer la commande
    nouvelle_commande = supabase.table("carnet_commande").insert(commande_data).execute().data[0]
    commande_id = nouvelle_commande["id"]

    # 4. Créer son contenu par lots ; en cas d'échec, annuler la commande
    try:
        if commande.formules:
            lignes_formules = [
                {
                    "commande_id": commande_id,
                    "formule_id": str(f.formule_id),
                    "quantite_recommandee": f.quantite_finale,
                    "quantite_finale": f.quantite_finale,
                }
                for f in commande.formules
            ]
            formules_creees = supabase.table("commande_formules").insert(lignes_formules).execute().data

            # Retrouver l'id de chaque commande_formule créée à partir de sa formule
            id_par_formule = {ligne["formule_id"]: ligne["id"] for ligne in formules_creees}
            exclusions = [
                {"commande_formule_id": id_par_formule[str(f.formule_id)], "produit_id": str(produit_id)}
                for f in commande.formules
                for produit_id in f.produits_exclus
            ]
            if exclusions:
                supabase.table("commande_formule_exclusions").insert(exclusions).execute()

        if commande.produits:
            lignes_produits = [
                {
                    "commande_id": commande_id,
                    "produit_id": str(p.produit_id),
                    "quantite": p.quantite,
                    "unite": p.unite,
                }
                for p in commande.produits
            ]
            supabase.table("commande_produits").insert(lignes_produits).execute()

    except Exception:
        logger.error(f"Échec de création du contenu de la commande {commande_id} : annulation", exc_info=True)
        supabase.table("carnet_commande").delete().eq("id", commande_id).execute()
        raise

    return nouvelle_commande

@router.post("/auto-archive")
def auto_archive_old_commandes(current_user: dict = Depends(get_current_user)):
    """Archive automatiquement les commandes dont la date de livraison est passée"""
    
    try:
        paris_tz = ZoneInfo("Europe/Paris")
        today_paris = datetime.now(paris_tz).date()
        cutoff_date = today_paris.isoformat()
        
        # Une seule requête : archiver directement toutes les commandes validées, 
        # non archivées, dont la date de livraison est passée (avant aujourd'hui, heure de Paris).
        query = supabase.table("carnet_commande")\
            .update({
                "archived": True,
                "archived_at": datetime.now(paris_tz).isoformat()
            })\
            .eq("archived", False)\
            .eq("validated", True)\
            .lt("delivery_date", cutoff_date)

        # Si l'utilisateur n'est PAS TECH_ADMIN, n'archiver que les commandes de sa franchise
        if current_user.get("role") != "TECH_ADMIN":
            if not current_user.get("franchise_id"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Utilisateur sans franchise associée"
                )
            query = query.eq("franchise_id", current_user["franchise_id"])

        response = query.execute()
        count = len(response.data)

        if count == 0:
            return {"count": 0, "message": "Aucune commande à archiver"}

        return {
            "count": count,
            "message": f"{count} commande(s) archivée(s)",
            "cutoff_date": cutoff_date
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur auto-archive: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur lors de l'archivage automatique des commandes"
        )

@router.put("/{commande_id}/complete")
def update_commande_complete(commande_id: str, modif: CommandeModification, current_user: dict = Depends(get_current_user)):
    """Enregistre en un seul appel toute la modification d'une commande :
    ses informations, les couverts/exclusions de ses formules existantes,
    et les formules/produits ajoutés. Tout est vérifié AVANT d'écrire."""
    franchise_id = current_user.get("franchise_id")
    if not franchise_id:
        raise HTTPException(status_code=400, detail="Un compte sans franchise ne peut pas modifier de commande")

    # ---------- 1. VÉRIFICATIONS (aucune écriture) ----------

    # La commande existe et appartient à la franchise
    verify_commande_ownership(supabase, commande_id, current_user)

    # Les formules modifiées appartiennent bien à CETTE commande
    ids_modifies = [f.commande_formule_id for f in modif.formules_modifiees]
    if ids_modifies:
        lignes = supabase.table("commande_formules")\
            .select("id")\
            .eq("commande_id", commande_id)\
            .in_("id", ids_modifies)\
            .execute()
        if set(ids_modifies) - {ligne["id"] for ligne in lignes.data}:
            raise HTTPException(status_code=404, detail="Formule de commande introuvable")

    # Les formules et produits ajoutés sont disponibles pour la franchise
    check_acces_catalogue(supabase, "franchise_formules", "formule_id",
                          [str(f.formule_id) for f in modif.formules_ajoutees], franchise_id, "Formule")
    check_acces_catalogue(supabase, "franchise_produits", "produit_id",
                          list({str(p.produit_id) for p in modif.produits_ajoutes}), franchise_id, "Produit")

    # ---------- 2. ÉCRITURES ----------

    # Informations de la commande (seulement les champs envoyés)
    champs = {
        k: v for k, v in modif.model_dump(
            exclude={"formules_modifiees", "formules_ajoutees", "produits_ajoutes"}
        ).items() if v is not None
    }
    # Les champs non envoyés ne sont pas modifiés : il faut donc effacer EXPLICITEMENT
    # ce qui n'a plus de sens (adultes/enfants d'une commande qui n'est plus un mariage,
    # nombre de repas quand il n'y a plus de repas du personnel)
    if champs.get("type_prestation", "mariage") != "mariage":
        champs.update(nb_adultes=None, nb_enfants=None, taux_enfant=None)
    if champs.get("repas_personnel") is False:
        champs["nb_repas_personnel"] = None
    if champs:
        supabase.table("carnet_commande").update(format_delivery_fields(champs)).eq("id", commande_id).execute()

    exclusions = []

    # Formules existantes : couverts, puis exclusions remplacées
    for f in modif.formules_modifiees:
        supabase.table("commande_formules")\
            .update({"quantite_finale": f.quantite_finale})\
            .eq("id", f.commande_formule_id)\
            .execute()
        exclusions += [
            {"commande_formule_id": f.commande_formule_id, "produit_id": str(produit_id)}
            for produit_id in f.produits_exclus
        ]
    if ids_modifies:
        supabase.table("commande_formule_exclusions")\
            .delete()\
            .in_("commande_formule_id", ids_modifies)\
            .execute()

    # Formules ajoutées (une insertion pour toutes)
    if modif.formules_ajoutees:
        formules_creees = supabase.table("commande_formules").insert([
            {
                "commande_id": commande_id,
                "formule_id": str(f.formule_id),
                "quantite_recommandee": f.quantite_finale,
                "quantite_finale": f.quantite_finale,
            }
            for f in modif.formules_ajoutees
        ]).execute().data
        id_par_formule = {ligne["formule_id"]: ligne["id"] for ligne in formules_creees}
        exclusions += [
            {"commande_formule_id": id_par_formule[str(f.formule_id)], "produit_id": str(produit_id)}
            for f in modif.formules_ajoutees
            for produit_id in f.produits_exclus
        ]

    # Toutes les exclusions (formules existantes + ajoutées) en une insertion
    if exclusions:
        supabase.table("commande_formule_exclusions").insert(exclusions).execute()

    # Produits ajoutés (une insertion pour tous)
    if modif.produits_ajoutes:
        supabase.table("commande_produits").insert([
            {
                "commande_id": commande_id,
                "produit_id": str(p.produit_id),
                "quantite": p.quantite,
                "unite": p.unite,
            }
            for p in modif.produits_ajoutes
        ]).execute()

    return {"message": "Commande mise à jour", "id": commande_id}

@router.delete("/{commande_id}")
def delete_commande(commande_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a commande"""

    if current_user["role"] != "TECH_ADMIN":
        if not current_user.get("franchise_id"):
            raise HTTPException(status_code=400, detail="Utilisateur sans franchise associée")

    ownership_query = supabase.table("carnet_commande").select("id")\
        .eq("id", commande_id)
    if current_user["role"] != "TECH_ADMIN":
        ownership_query = ownership_query.eq("franchise_id", current_user["franchise_id"])

    ownership = ownership_query.execute()
    if not ownership.data:
        raise HTTPException(status_code=404, detail="Commande not found")

    commande_formules = supabase.table("commande_formules")\
        .select("id")\
        .eq("commande_id", commande_id)\
        .execute()

    commande_formule_ids = [row["id"] for row in (commande_formules.data or []) if row.get("id")]
    if commande_formule_ids:
        supabase.table("commande_formule_exclusions")\
            .delete()\
            .in_("commande_formule_id", commande_formule_ids)\
            .execute()

        supabase.table("commande_formules")\
            .delete()\
            .in_("id", commande_formule_ids)\
            .execute()

    supabase.table("commande_produits")\
        .delete()\
        .eq("commande_id", commande_id)\
        .execute()

    supabase.table("carnet_commande")\
        .delete()\
        .eq("id", commande_id)\
        .execute()

    return {"message": "Commande deleted successfully"}


@router.patch("/{commande_id}/validate")
def validate_commande(commande_id: str, current_user: dict = Depends(get_current_user)):
    """
    Valider une commande (passe validated à True)
    """
    try:
        query = supabase.table("carnet_commande").update({"validated": True}).eq("id", commande_id)

        if current_user.get("role") != "TECH_ADMIN":
            if not current_user.get("franchise_id"):
                raise HTTPException(status_code=400, detail="Utilisateur sans franchise associée")
            query = query.eq("franchise_id", current_user["franchise_id"])

        response = query.execute()

        if not response.data:
            raise HTTPException(status_code=404, detail="Commande not found")
        
        return {"message": "Commande validée avec succès", "commande": serialize_commande(response.data[0])}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur validation commande {commande_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail="Erreur lors de la validation de la commande"
        )
