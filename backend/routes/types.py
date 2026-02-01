from fastapi import APIRouter, HTTPException
from database import get_supabase_client

router = APIRouter(prefix="/types", tags=["types"])
supabase = get_supabase_client()

@router.get("/")
async def get_types():
    response = supabase.table("types").select("*").order("name").execute()
    return response.data