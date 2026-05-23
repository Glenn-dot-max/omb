import os
import bcrypt
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("SUPABASE_URL et SUPABASE_KEY sont requis dans .env")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# -------------------------------------------------
# À ADAPTER
# -------------------------------------------------
EMAIL = "catalog.admin@ohmybrunch.com"
FULL_NAME = "Catalog Admin"
PASSWORD = "ChangeMe123!"

# Pour CATALOG_ADMIN, franchise_id peut être None
FRANCHISE_ID = None

hashed_password = bcrypt.hashpw(PASSWORD.encode("utf-8"), bcrypt.gensalt()).decode(
    "utf-8"
)

try:
    existing = supabase.table("users").select("id, email").eq("email", EMAIL).execute()
    if existing.data:
        user_id = existing.data[0]["id"]
        supabase.table("users").update(
            {
                "full_name": FULL_NAME,
                "password_hash": hashed_password,
                "role": "CATALOG_ADMIN",
                "franchise_id": FRANCHISE_ID,
                "active": True,
                "must_change_password": True,
            }
        ).eq("id", user_id).execute()
        print("✅ Utilisateur existant mis à jour en CATALOG_ADMIN")
        print(f"📧 Email: {EMAIL}")
        print(f"🆔 User ID: {user_id}")
    else:
        result = supabase.table("users").insert(
            {
                "email": EMAIL,
                "full_name": FULL_NAME,
                "password_hash": hashed_password,
                "role": "CATALOG_ADMIN",
                "franchise_id": FRANCHISE_ID,
                "active": True,
                "must_change_password": True,
            }
        ).execute()

        print("✅ CATALOG_ADMIN créé")
        print(f"📧 Email: {EMAIL}")
        print(f"🆔 User ID: {result.data[0]['id']}")

    print(f"🔑 Mot de passe temporaire: {PASSWORD}")
    print("⚠️ Pensez à changer le mot de passe à la première connexion")

except Exception as e:
    print(f"❌ Erreur: {e}")
