import httpx
from supabase import create_client, Client, ClientOptions
from config import SUPABASE_URL, SUPABASE_KEY

# Validate environment variables
if not SUPABASE_URL or not SUPABASE_KEY:
  raise ValueError("" \
      "Missing SUPABASE_URL or SUPABASE_KEY environment variables. " 
      "Please check your .env file."
  )

# Client réseau partagé, en HTTP/1.1 (hotfix H3, tâche 1.9).
# Par défaut, Supabase utilise HTTP/2 : UNE seule connexion partagée par tous les threads,
# ce qui provoque des erreurs "[Errno 11] Resource temporarily unavailable" quand plusieurs
# requêtes arrivent en même temps. En HTTP/1.1, chaque requête simultanée a sa propre connexion.
http_client = httpx.Client(http2=False, timeout=120, follow_redirects=True)

# Initialize Supabase client
supabase: Client = create_client(
    SUPABASE_URL,
    SUPABASE_KEY,
    options=ClientOptions(httpx_client=http_client),
)

def get_supabase_client() -> Client:
    """
    Returns the initialized Supabase client.
    Used for dependency injection if needed.
    """
    return supabase
