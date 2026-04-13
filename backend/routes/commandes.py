from fastapi import APIRouter, HTTPException, Depends
from auth import get_current_user
from database import get_supabase_client
from models import CarnetCommandeCreate, CarnetCommandeUpdate
from datetime import datetime, date, time, timedelta
from uuid import UUID

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
    """Get all commandes"""
    from zoneinfo import ZoneInfo

    response = supabase.table("carnet_commande")\
        .select("*")\
        .eq("franchise_id", current_user["franchise_id"])\
        .eq("archived", False)\
        .order("delivery_date", desc=True)\
        .execute()
    
    paris_tz = ZoneInfo("Europe/Paris")
    paris_now = datetime.now(paris_tz)

    return {
        "commandes": [serialize_commande(commande) for commande in response.data],
        "paris_date": paris_now.date().isoformat(),
        "paris_datetime": paris_now.isoformat()
    }
    

@router.get("/archived")
async def get_archived_commandes(current_user: dict = Depends(get_current_user)):
    """Get all archived commandes"""
    response = supabase.table("carnet_commande")\
        .select("*")\
        .eq("franchise_id", current_user["franchise_id"])\
        .eq("archived", True)\
        .order("delivery_date", desc=True)\
        .execute()
    return [serialize_commande(commande) for commande in response.data]

@router.get("/archived/{commande_id}")
async def get_archived_commande(commande_id: str, current_user: dict = Depends(get_current_user)):
    """Get a single archived commande by ID"""
    response = supabase.table("carnet_commande")\
        .select("*")\
        .eq("id", commande_id)\
        .eq("franchise_id", current_user["franchise_id"])\
        .eq("archived", True)\
        .execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Archived commande not found")
    return serialize_commande(response.data[0])


@router.get("/{commande_id}")
async def get_commande(commande_id: str, current_user: dict = Depends(get_current_user)):
    """Get a single Non-archived commande by ID"""
    response = supabase.table("carnet_commande")\
        .select("*")\
        .eq("id", commande_id)\
        .eq("franchise_id", current_user["franchise_id"])\
        .eq("archived", False)\
        .execute()
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
        delivery_date_str = commande_data['delivery_date']
        delivery_hour_str = commande_data.get('delivery_hour', '10:00')

        paris_tz = ZoneInfo("Europe/Paris")

        date_parts = delivery_date_str.split("-")
        hour_parts = delivery_hour_str.split(":")

        delivery_datetime_paris = datetime(
            year=int(date_parts[0]),
            month=int(date_parts[1]),
            day=int(date_parts[2]),
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
    """Archive automatiquement les commandes dont la date de livraison est dépassée depuis 2 jours"""
    from zoneinfo import ZoneInfo

    paris_tz = ZoneInfo("Europe/Paris")
    today_paris = datetime.now(paris_tz).date()
    cutoff_date = (today_paris - timedelta(days=2)).isoformat()

    # Archiver toutes les commandes concernées
    response = supabase.table("carnet_commande").update({
        "archived": True,
        "archived_at": datetime.now(paris_tz).isoformat()
    }).eq("franchise_id", current_user["franchise_id"])\
    .lt("delivery_date", cutoff_date)\
    .eq("archived", False)\
    .execute()

    # Compter le nombre de commandes archivées
    count = len(response.data) if response.data else 0

    return {
        "message": f"{count} commande(s) archivée(s) automatiquement",
        "count": count,
        "cutoff_date": cutoff_date
    }

@router.patch("/{commande_id}/archive")
async def archive_commande(commande_id: str, current_user: dict = Depends(get_current_user)):
    """Archive une commande manuellement"""
    response = supabase.table("carnet_commande").update({
        "archived": True,
        "archived_at": datetime.utcnow().isoformat()
    }).eq("id", commande_id)\
    .eq("franchise_id", current_user["franchise_id"])\
    .execute()

    if not response.data:
        raise HTTPException(status_code=404, detail="Commande not found")
    return serialize_commande(response.data[0])

@router.put("/{commande_id}")
async def update_commande(commande_id: str, commande: CarnetCommandeUpdate, current_user: dict = Depends(get_current_user)):
    """Update an existing commande"""
    from zoneinfo import ZoneInfo

    update_data = {k: v for k, v in commande.model_dump().items() if v is not None}

    if 'delivery_date' in update_data:
        delivery_date_str = update_data['delivery_date']
        delivery_hour_str = update_data.get('delivery_hour', '10:00')

        paris_tz = ZoneInfo("Europe/Paris")

        date_parts = delivery_date_str.split("-")
        hour_parts = delivery_hour_str.split(":")

        delivery_datetime_paris = datetime(
            year=int(date_parts[0]),
            month=int(date_parts[1]),
            day=int(date_parts[2]),
            hour=int(hour_parts[0]),
            minute=int(hour_parts[1]),
            tzinfo=paris_tz
        )
    
        update_data['delivery_date'] = delivery_datetime_paris.date().isoformat()

    update_data = serialize_commande(update_data)

    response = supabase.table("carnet_commande")\
        .update(update_data)\
        .eq("id", commande_id)\
        .eq("franchise_id", current_user["franchise_id"])\
        .execute()

    if not response.data:
        raise HTTPException(status_code=404, detail="Commande not found")
    return serialize_commande(response.data[0])

@router.delete("/{commande_id}")
async def delete_commande(commande_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a commande"""
    response = supabase.table("carnet_commande").delete()\
        .eq("id", commande_id)\
        .eq("franchise_id", current_user["franchise_id"])\
        .execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Commande not found")
    return {"message": "Commande deleted successfully"}

@router.patch("/{commande_id}/validate")
async def validate_commande(commande_id: str):
    """
    Valider une commande (passe validated à True)
    """
    try:
        response = supabase.table("carnet_commande")\
            .update({"validated": True})\
            .eq("id", commande_id)\
            .execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Commande not found")
        
        return {"message": "Commande validée avec succès", "commande": response.data[0]}
    
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Erreur lors de la validation de la commande: {str(e)}"
        )


