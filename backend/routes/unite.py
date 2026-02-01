from fastapi import APIRouter
from database import get_supabase_client

router = APIRouter(prefix="/unite", tags=["unite"])
supabase = get_supabase_client()

@router.get("/")
async def get_unite():
    """Get all unite"""
    response = supabase.table("unite").select("*").order("nom").execute()
    return response.data



