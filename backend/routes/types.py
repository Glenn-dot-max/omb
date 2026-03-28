from fastapi import APIRouter, HTTPException, Depends
from auth import get_current_user
from database import get_supabase_client

router = APIRouter(prefix="/types", tags=["types"])
supabase = get_supabase_client()

@router.get("/")
async def get_types(current_user: dict = Depends(get_current_user)):
    response = supabase.table("types")\
        .select("*")\
        .eq("franchise_id", current_user["franchise_id"])\
        .order("name")\
        .execute()
    return response.data