from supabase import create_client, Client
from config import SUPABASE_URL, SUPABASE_KEY

# Validate environment variables
if not SUPABASE_URL or not SUPABASE_KEY:
  raise ValueError("" \
      "Missing SUPABASE_URL or SUPABASE_KEY environment variables. " 
      "Please check your .env file."
  )

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def get_supabase_client() -> Client:
    """
    Returns the initialized Supabase client.
    Used for dependency injection if needed.
    """
    return supabase
