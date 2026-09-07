from zoneinfo import ZoneInfo

from fastapi import APIRouter, HTTPException, Depends, status
from auth import get_current_user
from database import get_supabase_client
from models import CarnetCommandeCreate, CarnetCommandeUpdate
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

@router.get("/")
async def get_commandes(current_user: dict = Depends(get_current_user)):
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
            "commandes": [serialize_commande(commande) for commande in response.data],
            "paris_date": paris_now.date().isoformat(),
            "paris_datetime": paris_now.isoformat()
        }
    
    except Exception as e:
        logger.error(f"Error loading commandes: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur lors du chargement des commandes"
        )   

@router.get("/archived")
async def get_archived_commandes(current_user: dict = Depends(get_current_user)):
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
        
        return [serialize_commande(commande) for commande in response.data]
    except Exception as e:
        logger.error(f"Error loading archived commandes: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur lors du chargement des commandes archivées"
        )
    

@router.get("/{commande_id}")
async def get_commande(commande_id: str, current_user: dict = Depends(get_current_user)):
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
    return serialize_commande(response.data[0])

@router.post("/")
async def create_commande(commande: CarnetCommandeCreate, current_user: dict = Depends(get_current_user)):
    """Create a new commande"""

    commande_data = commande.model_dump()

    # Forcer l'interprétation en heure de Paris
    if 'delivery_date' in commande_data:
        delivery_date_value = commande_data['delivery_date']
        delivery_hour_value = commande_data.get('delivery_hour', '10:00')

        if isinstance(delivery_hour_value, time):
            delivery_hour_str = delivery_hour_value.strftime("%H:%M")
        else:
            delivery_hour_str = str(delivery_hour_value)

        paris_tz = ZoneInfo("Europe/Paris")

        if isinstance(delivery_date_value, str):
            date_parts = delivery_date_value.split("-")
            year, month, day = int(date_parts[0]), int(date_parts[1]), int(date_parts[2])
        else:
            year, month, day = delivery_date_value.year, delivery_date_value.month, delivery_date_value.day

        hour_parts = delivery_hour_str.split(":")

        delivery_datetime_paris = datetime(
            year=year,
            month=month,
            day=day,
            hour=int(hour_parts[0]),
            minute=int(hour_parts[1]),
            tzinfo=paris_tz
        )
    
        commande_data['delivery_date'] = delivery_datetime_paris.date().isoformat()
    
    commande_data = serialize_commande(commande_data)
    commande_data["franchise_id"] = current_user["franchise_id"]

    # ==========================================
    # VÉRIFICATION DE DOUBLON
    # ==========================================
    # Vérifier s'il existe déjà une commande avec :
    # - même nom_client
    # - même delivery_date
    # - même delivery_hour
    # - même franchise
    # - non archivée
    # ==========================================
    
    existing = supabase.table("carnet_commande")\
        .select("id")\
        .eq("franchise_id", current_user["franchise_id"])\
        .eq("nom_client", commande_data["nom_client"])\
        .eq("delivery_date", commande_data["delivery_date"])\
        .eq("delivery_hour", commande_data.get("delivery_hour", "10:00"))\
        .eq("archived", False)\
        .execute()
    
    if existing.data and len(existing.data) > 0:
        delivery_date_display = commande_data["delivery_date"]
        delivery_hour_display = commande_data.get("delivery_hour", "10:00")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"❌ Une commande avec le nom \"{commande_data['nom_client']}\" existe déjà pour le {delivery_date_display} à {delivery_hour_display}."
        )

    response = supabase.table("carnet_commande").insert(commande_data).execute()
    return serialize_commande(response.data[0])

@router.post("/auto-archive")
async def auto_archive_old_commandes(current_user: dict = Depends(get_current_user)):
    """Archive automatiquement les commandes dont la date de livraison est passée"""
    
    try:
        paris_tz = ZoneInfo("Europe/Paris")
        today_paris = datetime.now(paris_tz).date()
        cutoff_date = today_paris.isoformat()
        
        # ✅ CORRECTION : Ne pas filtrer par franchise pour TECH_ADMIN
        query = supabase.table("carnet_commande").select("id, delivery_date")
        
        # Si l'utilisateur n'est PAS TECH_ADMIN, filtrer par franchise
        if current_user.get("role") != "TECH_ADMIN":
            if not current_user.get("franchise_id"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Utilisateur sans franchise associée"
                )
            query = query.eq("franchise_id", current_user["franchise_id"])
        
        # Récupérer les commandes actives
        response = query\
            .eq("archived", False)\
            .eq("validated", True)\
            .execute()
        
        if not response.data:
            return {"count": 0, "message": "Aucune commande à archiver"}
        
        commandes_a_archiver = []
        
        for commande in response.data:
            delivery_date_str = commande["delivery_date"]
            delivery_date_only = delivery_date_str.split("T")[0]
            year, month, day = map(int, delivery_date_only.split("-"))
            delivery_date = date(year, month, day)
            
            if delivery_date < today_paris:
                commandes_a_archiver.append(commande["id"])
        
        if not commandes_a_archiver:
            return {"count": 0, "message": "Aucune commande de J-1 à archiver"}
        
        # Archiver les commandes
        for commande_id in commandes_a_archiver:
            supabase.table("carnet_commande")\
                .update({
                    "archived": True,
                    "archived_at": datetime.now(paris_tz).isoformat()
                })\
                .eq("id", commande_id)\
                .execute()
        
        return {
            "count": len(commandes_a_archiver),
            "message": f"{len(commandes_a_archiver)} commande(s) archivée(s)",
            "cutoff_date": cutoff_date
        }
    
    except Exception as e:
        logger.error(f"Erreur auto-archive: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur lors de l'archivage automatique des commandes"
        )
    

@router.patch("/{commande_id}/archive")
async def archive_commande(commande_id: str, current_user: dict = Depends(get_current_user)):
    """Archive une commande manuellement"""
    if current_user["role"] != "TECH_ADMIN":
        if not current_user.get("franchise_id"):
            raise HTTPException(status_code=400, detail="Utilisateur sans franchise associée")

        response = supabase.table("carnet_commande")\
            .delete()\
            .eq("id", commande_id)\
            .eq("franchise_id", current_user["franchise_id"])\
            .execute()

        if not response.data:
            raise HTTPException(status_code=404, detail="Commande not found")

        return {"message": "Commande supprimée définitivement"}

    response = supabase.table("carnet_commande").update({
        "archived": True,
        "archived_at": datetime.now(ZoneInfo("Europe/Paris")).isoformat()
    }).eq("id", commande_id).execute()

    if not response.data:
        raise HTTPException(status_code=404, detail="Commande not found")
    return serialize_commande(response.data[0])

@router.put("/{commande_id}")
async def update_commande(commande_id: str, commande: CarnetCommandeUpdate, current_user: dict = Depends(get_current_user)):
    """Update an existing commande"""
    update_data = {k: v for k, v in commande.model_dump().items() if v is not None}

    if 'delivery_date' in update_data:
        delivery_date_value = update_data['delivery_date']
        delivery_hour_value = update_data.get('delivery_hour', '10:00')

        if isinstance(delivery_hour_value, time):
            delivery_hour_str = delivery_hour_value.strftime("%H:%M")
        else:
            delivery_hour_str = str(delivery_hour_value)

        paris_tz = ZoneInfo("Europe/Paris")

        if isinstance(delivery_date_value, str):
            date_parts = delivery_date_value.split("-")
            year, month, day = int(date_parts[0]), int(date_parts[1]), int(date_parts[2])
        else:
            year, month, day = delivery_date_value.year, delivery_date_value.month, delivery_date_value.day

        hour_parts = delivery_hour_str.split(":")

        delivery_datetime_paris = datetime(
            year=year,
            month=month,
            day=day,
            hour=int(hour_parts[0]),
            minute=int(hour_parts[1]),
            tzinfo=paris_tz
        )
    
        update_data['delivery_date'] = delivery_datetime_paris.date().isoformat()

    update_data = serialize_commande(update_data)

    query = supabase.table("carnet_commande").update(update_data).eq("id", commande_id)

    if current_user["role"] != "TECH_ADMIN":
        if not current_user.get("franchise_id"):
            raise HTTPException(status_code=400, detail="Utilisateur sans franchise associée")
        query = query.eq("franchise_id", current_user["franchise_id"])

    response = query.execute()

    if not response.data:
        raise HTTPException(status_code=404, detail="Commande not found")
    return serialize_commande(response.data[0])

@router.delete("/{commande_id}")
async def delete_commande(commande_id: str, current_user: dict = Depends(get_current_user)):
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
async def validate_commande(commande_id: str, current_user: dict = Depends(get_current_user)):
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
    
    except Exception as e:
        logger.error(f"Erreur validation commande {commande_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail="Erreur lors de la validation de la commande"
        )

@router.post("/{commande_id}/duplicate")
async def duplicate_commande(commande_id: str, current_user: dict = Depends(get_current_user)):
    """Duplique une commande avec ses formules, exclusions et produits directs"""

    #1. Récupérer la commande source (scoping franchise)
    query = supabase.table("carnet_commande").select("*").eq("id", commande_id)

    if current_user["role"] != "TECH_ADMIN":
        if not current_user.get("franchise_id"):
            raise HTTPException(status_code=400, detail="Utilisateur sans franchise associée")
        query = query.eq("franchise_id", current_user["franchise_id"])

    source_response = query.execute()
    if not source_response.data:
        raise HTTPException(status_code=404, detail="Commande introuvable")
    
    source = source_response.data[0]

    # 2. Créer la nouvelle commande (copie sans id/archived_at/create_at)
    new_commande_data = {
        k: v for k, v in source.items()
        if k not in ("id", "archived", "archived_at", "created_at")
    }
    new_commande_data["archived"] = False
    new_commande_data["archived_at"] = None

    new_commande_response = supabase.table("carnet_commande").insert(new_commande_data).execute()
    if not new_commande_response.data:
        raise HTTPException(status_code=500, detail="Erreur lors de la duplication de la commande")
    
    new_commande = new_commande_response.data[0]
    new_commande_id = new_commande["id"]

    # 3. Copier les commande_formules + leurs exclusions
    cf_response = supabase.table("commande_formules").select("*").eq("commande_id", commande_id).execute()

    for cf in cf_response.data:
        new_cf_data = {
            k: v for k, v in cf.items()
            if k not in ("id", "created_at")
        }
        new_cf_data["commande_id"] = new_commande_id

        new_cf_response = supabase.table("commande_formules").insert(new_cf_data).execute()
        if not new_cf_response.data:
            continue

        new_cf_id = new_cf_response.data[0]["id"]

        excl_response = supabase.table("commande_formule_exclusions")\
            .select("produit_id")\
            .eq("commande_formule_id", cf["id"])\
            .execute()
        
        for excl in excl_response.data:
            supabase.table("commande_formule_exclusions").insert({
                "commande_formule_id": new_cf_id,
                "produit_id": excl["produit_id"]
            }).execute()

    # 4. Copier les produits directs
    cp_response = supabase.table("commande_produits").select("*").eq("commande_id", commande_id).execute()

    for cp in cp_response.data:
        new_cp_data = {
            k: v for k, v in cp.items()
            if k not in ("id", "created_at")
        }
        new_cp_data["commande_id"] = new_commande_id
        supabase.table("commande_produits").insert(new_cp_data).execute()

    logger.info(f"[COMMANDES] Duplication: {commande_id} → {new_commande_id}")
    return serialize_commande(new_commande)