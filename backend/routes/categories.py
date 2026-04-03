from fastapi import APIRouter, HTTPException, Depends
from auth import get_current_user
from database import get_supabase_client

router = APIRouter(prefix="/categories", tags=["categories"])
supabase = get_supabase_client()

@router.get("/")
async def get_categories(current_user: dict = Depends(get_current_user)):
    """Get all categories (shared across all franchises)"""
    response = supabase.table("categories")\
        .select("*")\
        .order("name")\
        .execute()
    return response.data