# backend/routes/auth.py

from fastapi import APIRouter, HTTPException, Depends, Request
from datetime import datetime, timezone, timedelta
from limiter import limiter
from database import get_supabase_client
from models import (
    LoginRequest, LoginResponse, UserInfo, ChangePasswordRequest,
    ForgotPasswordRequest, ResetPasswordRequest
)
from auth import (
    verify_password, create_access_token, get_current_user,
    hash_password, generate_reset_token, hash_reset_token
)
from email_service import send_password_reset_email
from config import FRONTEND_URL

router = APIRouter(prefix="/auth", tags=["auth"])
supabase = get_supabase_client()

# ===============================================
# LOGIN
# ===============================================

@router.post("/login", response_model=LoginResponse)
@limiter.limit("5/minute")
async def login(request: Request, credentials: LoginRequest):
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
    
    franchise_nom = None
    if user.get("franchises"):
        franchise_nom = user["franchises"]["nom"]
    
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
            "franchise_nom": franchise_nom,
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

    franchise_nom = None
    if user.get("franchises"):
        franchise_nom = user["franchises"]["nom"]
    
    return {
        "id": user["id"],
        "email": user["email"],
        "franchise_id": user["franchise_id"],
        "franchise_nom": franchise_nom,
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
    from datetime import datetime, timezone
    supabase.table("users").update({
        "password_hash": new_password_hash,
        "must_change_password": False,
        "password_changed_at": datetime.now(timezone.utc).isoformat()
    }).eq("id", current_user["user_id"]).execute()

    return {"message": "Mot de passe changé avec succès"}

# ===============================================
# FORGOT PASSWORD - DEMANDE ET RÉINITIALISATION
# ===============================================

@router.post("/forgot-password")
@limiter.limit("3/minute")
async def forgot_password(request: Request, payload: ForgotPasswordRequest):
    """
    Envoie un email de réinitialisation si un compte actif existe pour cet email.
    Renvoie toujours le même message générique, que le compte existe ou non,
    pour ne pas permettre à un attaquant de devenir quels emails sont enregistrés.
    """
    generic_response = {
        "message": "Si un compte existe avec cet email, un lien de réinitialisation vient de vous être envoyé."
    }

    response = supabase.table("users")\
        .select("id, email, active")\
        .eq("email", payload.email)\
        .execute()

    if not response.data or not response.data[0].get("active", False):
        return generic_response

    user = response.data[0]

    raw_token = generate_reset_token()
    token_hash = hash_reset_token(raw_token)
    expries_at = datetime.now(timezone.utc) + timedelta(hours=1)

    supabase.table("users").update({
        "reset_token_hash": token_hash,
        "reset_token_expires_at": expries_at.isoformat()
    }).eq("id", user["id"]).execute()

    reset_link = f"{FRONTEND_URL}/pages/reset-password.html?token={raw_token}"
    send_password_reset_email(user["email"], reset_link)

    return generic_response

# ===============================================
# RESET PASSWORD - APPLICATION DU NOUVEAU MOT DE PASSE
# ===============================================

@router.post("/reset-password")
@limiter.limit("5/minute")
async def reset_password(request: Request, payload: ResetPasswordRequest):
    """Réinitialise le mot de passe à partir du token reçu par email"""

    token_hash = hash_reset_token(payload.token)

    response = supabase.table("users")\
        .select("id, reset_token_expires_at")\
        .eq("reset_token_hash", token_hash)\
        .execute()

    if not response.data:
        raise HTTPException(status_code=400, detail="Lien invalide ou expiré")

    user = response.data[0]

    expires_at = datetime.fromisoformat(user["reset_token_expires_at"])
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="Lien invalide ou expiré")

    new_password_hash = hash_password(payload.new_password)

    supabase.table("users").update({
        "password_hash": new_password_hash,
        "must_change_password": False,
        "password_changed_at": datetime.now(timezone.utc).isoformat(),
        "reset_token_hash": None,
        "reset_token_expires_at": None
    }).eq("id", user["id"]).execute()

    return {"message": "Mot de passe réinitialisé avec succès."}