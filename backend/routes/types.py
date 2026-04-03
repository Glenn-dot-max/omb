from fastapi import APIRouter, HTTPException, Depends
from auth import get_current_user
from database import get_supabase_client

router = APIRouter(prefix="/types", tags=["types"])
supabase = get_supabase_client()

@router.get("/")
async def get_types(current_user: dict = Depends(get_current_user)):
    """Get all types (shared across all franchises)"""
    response = supabase.table("types")\
        .select("*")\
        .order("name")\
        .execute()
    return response.data