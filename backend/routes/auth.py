# backend/routes/auth.py

from fastapi import APIRouter, HTTPException, Depends
from database import get_supabase_client
from models import LoginRequest, LoginResponse, UserInfo
from auth import verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])
supabase = get_supabase_client()

# ===============================================
# LOGIN
# ===============================================

@router.post("/login", response_model=LoginResponse)
async def login(credentials: LoginRequest):
    """Connexion utilisateur"""
    
    # 1. Récupérer l'utilisateur par email
    response = supabase.table("users")\
        .select("*, franchises(nom)")\
        .eq("email", credentials.email)\
        .execute()
    
    if not response.data or len(response.data) == 0:
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    
    user = response.data[0]
    
    # 2. Vérifier le mot de passe
    if not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    
    # 3. Créer le token JWT
    token_data = {
        "user_id": user["id"],
        "email": user["email"],
        "franchise_id": user["franchise_id"],
        "role": user.get("role", "USER")
    }
    
    access_token = create_access_token(token_data)
    
    # 4. Retourner le token et les infos utilisateur
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "franchise_id": user["franchise_id"],
            "franchise_nom": user["franchises"]["nom"],
            "role": user.get("role", "USER")
        }
    }

# ===============================================
# GET CURRENT USER INFO
# ===============================================

@router.get("/me", response_model=UserInfo)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Récupère les infos de l'utilisateur connecté"""
    
    # Récupérer les détails complets depuis la DB
    response = supabase.table("users")\
        .select("*, franchises(nom)")\
        .eq("id", current_user["user_id"])\
        .execute()
    
    if not response.data or len(response.data) == 0:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    
    user = response.data[0]
    
    return {
        "id": user["id"],
        "email": user["email"],
        "franchise_id": user["franchise_id"],
        "franchise_nom": user["franchises"]["nom"],
        "role": user.get("role", "USER")
    }