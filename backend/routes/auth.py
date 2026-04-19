# backend/routes/auth.py

from fastapi import APIRouter, HTTPException, Depends
from database import get_supabase_client
from models import LoginRequest, LoginResponse, UserInfo, ChangePasswordRequest
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
            "role": user.get("role", "USER"),
            "must_change_password": user.get("must_change_password", False)
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

# ===============================================
# CHANGE PASSWORD
# ===============================================

@router.post("/change-password")
async def change_password(
    request: ChangePasswordRequest,
    current_user: dict = Depends(get_current_user)
):
    """Permet à l'utilisateur de changer son mot de passe"""

    # 1. Récupérer l'utilisateur depuis la DB
    response = supabase.table("users")\
        .select("*")\
        .eq("id", current_user["user_id"])\
        .execute()
    
    if not response.data:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    
    user = response.data[0]

    # 2. Vérifier l'ancien mot de passe
    if not verify_password(request.old_password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Ancien mot de passe incorrect")
    
    # 3. Vérifier que le nouveau mot de passe est différent de l'ancien
    if request.old_password == request.new_password:
        raise HTTPException(status_code=400, detail="Le nouveau mot de passe doit être différent de l'ancien")

    # 4. Hasher le nouveau mot de passe
    from auth import hash_password
    new_password_hash = hash_password(request.new_password)

    # 5. Mettre à jour dans la DB
    from datetime import datetime
    supabase.table("users").update({
        "password_hash": new_password_hash,
        "must_change_password": False,
        "password_changed_at": datetime.utcnow().isoformat()
    }).eq("id", current_user["user_id"]).execute()

    return {"message": "Mot de passe changé avec succès"}