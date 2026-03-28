from fastapi import APIRouter, HTTPException, Depends
from auth import get_current_user
from database import get_supabase_client

router = APIRouter(prefix="/unite", tags=["unite"])
supabase = get_supabase_client()

@router.get("/")
async def get_unite(current_user: dict = Depends(get_current_user)):
    """Get all unite"""
    response = supabase.table("unite")\
        .select("*")\
        .eq("franchise_id", current_user["franchise_id"])\
        .order("nom")\
        .execute()
    return response.data



