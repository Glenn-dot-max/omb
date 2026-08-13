import logging
logger = logging.getLogger(__name__)

from fastapi import APIRouter, Depends, HTTPException, status
from database import get_supabase_client
from auth import is_tech_admin, is_catalog_admin
from models import FranchiseCreate, FranchiseUpdate, UserCreate, UserUpdate, PasswordReset
from typing import Optional
from cache import invalidate, get_cached, set_cached
import bcrypt
from datetime import datetime, timezone

router = APIRouter(prefix="/admin", tags=["admin"])
supabase = get_supabase_client()

# ======================================
# FRANCHISE - CRUD
# ======================================
@router.get("/franchises")
async def get_franchises(current_user: dict = Depends(is_catalog_admin)):
    """Liste toutes les franchises (TECH_ADMIN/CATALOG_ADMIN)"""
    response = supabase.table("franchises").select("*").order("nom").execute()
    return response.data

@router.get("/franchises/{franchise_id}")
async def get_franchise(franchise_id: str, current_user: dict = Depends(is_catalog_admin)):
    """Récupère une franchise par son ID (TECH_ADMIN/CATALOG_ADMIN)"""
    response = supabase.table("franchises").select("*").eq("id", franchise_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Franchise introuvable")
    return response.data[0]

@router.post("/franchises")
async def create_franchise(franchise: FranchiseCreate, current_user: dict = Depends(is_tech_admin)):
    """Crée une nouvelle franchise (TECH ADMIN UNIQUEMENT)"""
    franchise_data = franchise.model_dump()
    franchise_data["created_at"] = datetime.now(timezone.utc).isoformat()
    franchise_data["active"] = True

    response = supabase.table("franchises").insert(franchise_data).execute()
    invalidate("franchises_all")
    return response.data[0]

@router.put("/franchises/{franchise_id}")
async def update_franchise(
    franchise_id: str, 
    franchise: FranchiseUpdate, 
    current_user: dict = Depends(is_tech_admin)
): 
    """Met à jour une franchise """
    update_data = {k: v for k, v in franchise.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour")

    response = supabase.table("franchises").update(update_data).eq("id", franchise_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Franchise introuvable")
    invalidate("franchises_all")
    return response.data[0]

@router.delete("/franchises/{franchise_id}")
async def delete_franchise(franchise_id: str, current_user: dict = Depends(is_tech_admin)):
    """Désactive une franchise (TECH ADMIN UNIQUEMENT)"""
    response = supabase.table("franchises").update({"active": False}).eq("id", franchise_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Franchise introuvable")
    invalidate("franchises_all")
    return {"message": "Franchise désactivée avec succès"}

# ======================================
# USER - CRUD
# ======================================

@router.get("/users")
async def get_users(
    franchise_id: Optional[str] = None,
    current_user: dict = Depends(is_tech_admin)
):
    """Liste tous les utilisateurs, avec filtre optionnel par franchise"""
    query = supabase.table("users").select("*, franchises(nom)")

    if franchise_id:
        query = query.eq("franchise_id", franchise_id)
    response = query.order("email").execute()
    return response.data

@router.get("/users/{user_id}")
async def get_user(user_id: str, current_user: dict = Depends(is_tech_admin)):
    """Récupère un utilisateur par son ID (TECH ADMIN UNIQUEMENT)"""
    response = supabase.table("users").select("*, franchises(nom)").eq("id", user_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    return response.data[0]

@router.post("/users")
async def create_user(user: UserCreate, current_user: dict = Depends(is_tech_admin)):
    """Crée un nouvel utilisateur (TECH ADMIN UNIQUEMENT)"""
    # Vérifie que l'email n'existe pas déjà
    existing = supabase.table("users").select("*").eq("email", user.email).execute()
    if existing.data and len(existing.data) > 0:
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    
    # Hash le mot de passe
    hashed_password = bcrypt.hashpw(user.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    allowed_roles = {"USER", "CATALOG_ADMIN", "TECH_ADMIN"}
    role = (user.role or "USER").upper()
    if role not in allowed_roles:
        raise HTTPException(status_code=400, detail="Rôle invalide")

    if role == "USER" and not user.franchise_id:
        raise HTTPException(status_code=400, detail="franchise_id requis pour le rôle USER")

    user_data = {
        "email": user.email,
        "full_name": user.full_name,
        "franchise_id": user.franchise_id,
        "password_hash": hashed_password,
        "role": role,
        "active": True,
        "must_change_password": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    response = supabase.table("users").insert(user_data).execute()

    # Ne pas retourner le password hash
    result = response.data[0]
    result.pop("password_hash", None)

    return result

@router.put("/users/{user_id}")
async def update_user(
    user_id: str, 
    user: UserUpdate, 
    current_user: dict = Depends(is_tech_admin)
):
    """Met à jour un utilisateur"""
    update_data = {k: v for k, v in user.model_dump().items() if v is not None}

    if "role" in update_data:
        update_data["role"] = str(update_data["role"]).upper()
        if update_data["role"] not in {"USER", "CATALOG_ADMIN", "TECH_ADMIN"}:
            raise HTTPException(status_code=400, detail="Rôle invalide")

    if not update_data:
        raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour")
    
    response = supabase.table("users").update(update_data).eq("id", user_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    
    result = response.data[0]
    result.pop("password_hash", None)
    return result

@router.post("/users/{user_id}/reset-password")
async def reset_password(
    user_id: str,
    reset: PasswordReset,
    current_user: dict = Depends(is_tech_admin)
):
    
    """Réinitialise le mot de passe d'un utilisateur"""
    hashed_password = bcrypt.hashpw(reset.new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    response = supabase.table("users").update({
        "password_hash": hashed_password,
        "must_change_password": True,
        "password_changed_at": datetime.now(timezone.utc).isoformat()
    }).eq("id", user_id).execute()

    if not response.data:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    
    return {
        "message": "Mot de passe réinitialisé avec succès",
        "new_password": reset.new_password
    }

@router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(is_tech_admin)):
    """Désactive un utilisateur (TECH ADMIN UNIQUEMENT)"""
    response = supabase.table("users").update({"active": False}).eq("id", user_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    return {"message": "Utilisateur désactivé avec succès"}

# ======================================
# FRANCHISE - PRODUITS
# ======================================

@router.get("/franchises/{franchise_id}/produits")
async def get_franchise_produits(
    franchise_id: str,
    current_user: dict = Depends(is_catalog_admin)
):
    """
    Récupère tous les produits actifs d'une franchise avec leurs catégories et types
    """
    
    try:
        print(f"📍 Récupération produits pour franchise {franchise_id}")
        
        # 1️⃣ Récupérer les liens franchise_produits actifs
        liens_response = supabase.table("franchise_produits")\
            .select("produit_id")\
            .eq("franchise_id", franchise_id)\
            .eq("active", True)\
            .execute()
        
        print(f"✅ {len(liens_response.data)} liens trouvés")
        
        if not liens_response.data:
            return []
        
        produit_ids = [lien["produit_id"] for lien in liens_response.data]
        
        # 2️⃣ Récupérer les produits (TOUT avec *)
        produits_response = supabase.table("produits")\
            .select("*")\
            .in_("id", produit_ids)\
            .execute()
        
        print(f"✅ {len(produits_response.data)} produits récupérés")
        
        if not produits_response.data:
            return []
        
        # 3️⃣ Récupérer toutes les catégories
        cached_categories = get_cached("categories_all")
        if cached_categories is None:
            cat_resp = supabase.table("categories").select("id, name").execute()
            cached_categories = {c["id"]: c["name"] for c in cat_resp.data}
            set_cached("categories_all", cached_categories)
        categories_map = cached_categories


        print(f"✅ {len(categories_map)} catégories chargées")
        
        # 4️⃣ Récupérer tous les types
        cached_types = get_cached("types_all")
        if cached_types is None:
            type_resp = supabase.table("types").select("id, name").execute()
            cached_types = {t["id"]: t["name"] for t in type_resp.data}
            set_cached("types_all", cached_types)
        types_map = cached_types


        print(f"✅ {len(types_map)} types chargés")
        
        # 5️⃣ Formatter les données pour le frontend
        produits = []
        for p in produits_response.data:
            # Gérer les deux noms de colonnes possibles
            cat_id = p.get("categorie_id") or p.get("category_id")
            
            produit_data = {
                "id": p["id"],
                "nom": p["name"],
                "categorie": categories_map.get(cat_id) if cat_id else None,
                "type": types_map.get(p.get("type_id")) if p.get("type_id") else None,
                "active": True
            }
            produits.append(produit_data)
            print(f"  📦 {produit_data['nom']} - {produit_data['categorie']} - {produit_data['type']}")
        
        print(f"✅ {len(produits)} produits formatés pour le frontend")
        return produits
    
    except Exception as e:
        logger.error(f"❌ ERREUR get_franchise_produits: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erreur interne du serveur")
    
# ======================================
# FRANCHISE - FORMULES
# ======================================

@router.get("/franchises/{franchise_id}/formules")
async def get_franchise_formules(
    franchise_id: str,
    current_user: dict = Depends(is_catalog_admin)
):
    """
    Récupère toutes les formules actives d'une franchise
    """
    
    try:
        print(f"📍 Récupération formules pour franchise {franchise_id}")
        
        # 1️⃣ Récupérer les liens franchise_formules actifs
        liens_response = supabase.table("franchise_formules")\
            .select("formule_id")\
            .eq("franchise_id", franchise_id)\
            .eq("active", True)\
            .execute()
        
        print(f"✅ {len(liens_response.data)} liens trouvés")
        
        if not liens_response.data:
            return []
        
        formule_ids = [lien["formule_id"] for lien in liens_response.data]
        
        # 2️⃣ Récupérer les formules
        formules_response = supabase.table("formules")\
            .select("*")\
            .in_("id", formule_ids)\
            .execute()
        
        print(f"✅ {len(formules_response.data)} formules récupérées")
        
        if not formules_response.data:
            return []
        
        # 3️⃣ Formatter les données pour le frontend
        formules = []
        for f in formules_response.data:
            formule_data = {
                "id": f["id"],
                "nom": f["name"],
                "nombre_couverts": f.get("nombre_couverts"),
                "active": True
            }
            formules.append(formule_data)
            print(f"  🍽️ {formule_data['nom']} - {formule_data['nombre_couverts']} couverts")
        
        print(f"✅ {len(formules)} formules formatées pour le frontend")
        return formules
    
    except Exception as e:
        logger.error(f"❌ ERREUR get_franchise_formules: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erreur interne du serveur")
    
# ======================================
# FRANCHISE - COMMANDES
# ======================================

@router.get("/franchises/{franchise_id}/commandes")
async def get_franchise_commandes(
    franchise_id: str,
    archived: bool = False,
    current_user: dict = Depends(is_tech_admin)
):
    """
    Récupère les commandes d'une franchise spécifique (TECH_ADMIN uniquement)
    """
    try:
        from routes.commandes import serialize_commande
        from zoneinfo import ZoneInfo
        from datetime import datetime
        
        print(f"📍 Récupération commandes pour franchise {franchise_id} (archived={archived})")
        
        # Récupérer les commandes de cette franchise
        response = supabase.table("carnet_commande")\
            .select("*")\
            .eq("franchise_id", franchise_id)\
            .eq("archived", archived)\
            .order("delivery_date", desc=(archived))\
            .execute()
        
        print(f"✅ {len(response.data)} commande(s) trouvée(s)")
        
        # Si commandes actives, retourner avec la date de Paris
        if not archived:
            paris_tz = ZoneInfo("Europe/Paris")
            paris_now = datetime.now(paris_tz)
            
            return {
                "commandes": [serialize_commande(cmd) for cmd in response.data],
                "paris_date": paris_now.date().isoformat(),
                "paris_datetime": paris_now.isoformat()
            }
        
        # Sinon, juste les commandes archivées
        return [serialize_commande(cmd) for cmd in response.data]
    
    except Exception as e:
        logger.error(f"❌ ERREUR get_franchise_commandes: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erreur interne du serveur")
    
