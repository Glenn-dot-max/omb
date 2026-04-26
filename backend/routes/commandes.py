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
        logger.error(f"Error loading commandes: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
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
        logger.error(f"Error loading archived commandes: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
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
    from zoneinfo import ZoneInfo

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
        logger.error(f"Erreur auto-archive: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    

@router.patch("/{commande_id}/archive")
async def archive_commande(commande_id: str, current_user: dict = Depends(get_current_user)):
    """Archive une commande manuellement"""

    query = supabase.table("carnet_commande").update({
        "archived": True,
        "archived_at": datetime.now(ZoneInfo("Europe/Paris")).isoformat()
    }).eq("id", commande_id)

    if current_user["role"] != "TECH_ADMIN":
        if not current_user.get("franchise_id"):
            raise HTTPException(status_code=400, detail="Utilisateur sans franchise associée")
        query = query.eq("franchise_id", current_user["franchise_id"])

    response = query.execute()

    if not response.data:
        raise HTTPException(status_code=404, detail="Commande not found")
    return serialize_commande(response.data[0])

@router.put("/{commande_id}")
async def update_commande(commande_id: str, commande: CarnetCommandeUpdate, current_user: dict = Depends(get_current_user)):
    """Update an existing commande"""
    from zoneinfo import ZoneInfo

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

    query = supabase.table("carnet_commande").delete().eq("id", commande_id)

    if current_user["role"] != "TECH_ADMIN":
        if not current_user.get("franchise_id"):
            raise HTTPException(status_code=400, detail="Utilisateur sans franchise associée")
        query = query.eq("franchise_id", current_user["franchise_id"])

    response = query.execute()

    if not response.data:
        raise HTTPException(status_code=404, detail="Commande not found")
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
        raise HTTPException(
            status_code=500, 
            detail=f"Erreur lors de la validation de la commande: {str(e)}"
        )



