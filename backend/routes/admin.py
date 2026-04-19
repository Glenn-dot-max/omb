from fastapi import APIRouter, Depends, HTTPException, status
from database import get_supabase_client
from auth import is_tech_admin
from pydantic import BaseModel, EmailStr
from typing import Optional
import bcrypt
from datetime import datetime

router = APIRouter(prefix="/admin", tags=["admin"])
supabase = get_supabase_client()

# ============================
# MODELS
# ============================

class FranchiseCreate(BaseModel):
    nom: str
    city: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None

class FranchiseUpdate(BaseModel):
    nom: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    active: Optional[bool] = None

class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    franchise_id: str
    password: str

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    franchise_id: Optional[str] = None
    active: Optional[bool] = None

class PasswordReset(BaseModel):
    new_password: str

# ======================================
# FRANCHISE - CRUD
# ======================================
@router.get("/franchises")
async def get_franchises(current_user: dict = Depends(is_tech_admin)):
    """Liste toutes les franchises (TECH ADMIN UNIQUEMENT)"""
    response = supabase.table("franchises").select("*").order("nom").execute()
    return response.data

@router.get("/franchises/{franchise_id}")
async def get_franchise(franchise_id: str, current_user: dict = Depends(is_tech_admin)):
    """Récupère une franchise par son ID (TECH ADMIN UNIQUEMENT)"""
    response = supabase.table("franchises").select("*").eq("id", franchise_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Franchise introuvable")
    return response.data[0]

@router.post("/franchises")
async def create_franchise(franchise: FranchiseCreate, current_user: dict = Depends(is_tech_admin)):
    """Crée une nouvelle franchise (TECH ADMIN UNIQUEMENT)"""
    franchise_data = franchise.model_dump()
    franchise_data["created_at"] = datetime.utcnow().isoformat()
    franchise_data["active"] = True

    response = supabase.table("franchises").insert(franchise_data).execute()
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
    return response.data[0]

@router.delete("/franchises/{franchise_id}")
async def delete_franchise(franchise_id: str, current_user: dict = Depends(is_tech_admin)):
    """Désactive une franchise (TECH ADMIN UNIQUEMENT)"""
    response = supabase.table("franchises").update({"active": False}).eq("id", franchise_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Franchise introuvable")
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

    user_data = {
        "email": user.email,
        "full_name": user.full_name,
        "franchise_id": user.franchise_id,
        "password_hash": hashed_password,
        "role": "USER",
        "active": True,
        "created_at": datetime.utcnow().isoformat()
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

    response = supabase.table("users").update({"password_hash": hashed_password}).eq("id", user_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    
    return {"message": "Mot de passe réinitialisé avec succès"}

@router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(is_tech_admin)):
    """Désactive un utilisateur (TECH ADMIN UNIQUEMENT)"""
    response = supabase.table("users").update({"active": False}).eq("id", user_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    return {"message": "Utilisateur désactivé avec succès"}