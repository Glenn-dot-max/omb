from zoneinfo import ZoneInfo
from fastapi import APIRouter, HTTPException, Depends, status
from auth import get_current_user
from database import get_supabase_client
from models import CarnetCommandeCreate, CarnetCommandeUpdate, CommandeComplete
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

def check_acces_catalogue(table: str, colonne: str, ids: list, franchise_id: str, libelle: str):
    """Vérifie EN UNE REQUÊTE que tous les ids (formules ou produits) sont actifs pour la franchise.
    Lève une 404 s'il en manque un seul."""
    if not ids:
        return
    liens = supabase.table(table)\
        .select(colonne)\
        .eq("franchise_id", franchise_id)\
        .eq("active", True)\
        .in_(colonne, ids)\
        .execute()
    trouves = {lien[colonne] for lien in liens.data}
    if set(ids) - trouves:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{libelle} introuvable ou non disponible pour votre franchise"
        )

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
    return response.data[0]

@router.post("/")
async def create_commande(commande: CarnetCommandeCreate, current_user: dict = Depends(get_current_user)):
    """Create a new commande"""

    commande_data = format_delivery_fields(commande.model_dump())
    commande_data["franchise_id"] = current_user["franchise_id"]

    check_commande_doublon(commande_data)

    response = supabase.table("carnet_commande").insert(commande_data).execute()
    return response.data[0]

@router.post("/complete")
async def create_commande_complete(commande: CommandeComplete, current_user: dict = Depends(get_current_user)):
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
    check_acces_catalogue("franchise_formules", "formule_id", formule_ids, franchise_id, "Formule")
    check_acces_catalogue("franchise_produits", "produit_id", produit_ids, franchise_id, "Produit")

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
async def auto_archive_old_commandes(current_user: dict = Depends(get_current_user)):
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


@router.put("/{commande_id}")
async def update_commande(commande_id: str, commande: CarnetCommandeUpdate, current_user: dict = Depends(get_current_user)):
    """Update an existing commande"""
    update_data = {k: v for k, v in commande.model_dump().items() if v is not None}
    update_data = format_delivery_fields(update_data)

    query = supabase.table("carnet_commande").update(update_data).eq("id", commande_id)

    if current_user["role"] != "TECH_ADMIN":
        if not current_user.get("franchise_id"):
            raise HTTPException(status_code=400, detail="Utilisateur sans franchise associée")
        query = query.eq("franchise_id", current_user["franchise_id"])

    response = query.execute()

    if not response.data:
        raise HTTPException(status_code=404, detail="Commande not found")
    return response.data[0]

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
    
    except HTTPException:
        raise
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
    return new_commande