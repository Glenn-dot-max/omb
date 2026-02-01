from fastapi import APIRouter, HTTPException
from database import get_supabase_client

router = APIRouter(prefix="/categories", tags=["categories"])
supabase = get_supabase_client()

@router.get("/")
async def get_categories():
    response = supabase.table("categories").select("*").order("name").execute()
    return response.data
