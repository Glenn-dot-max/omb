import bcrypt
from supabase import create_client
import os
from dotenv import load_dotenv

load_dotenv()

supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY")
)

# Hash le password
password = "Paris1234"
hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

print("🔐 Hash généré...")

# Créer l'utilisateur
try:
    result = supabase.table("users").insert({
        "email": "paris@test.com",
        "password": hashed,
        "franchise_id": "22222222-2222-2222-2222-222222222222"
    }).execute()
    
    print("\n✅ Utilisateur créé avec succès !")
    print(f"📧 Email: paris@test.com")
    print(f"🔑 Password: Paris1234")
    print(f"🏢 Franchise: PARIS")
    print(f"🆔 User ID: {result.data[0]['id']}")
    
except Exception as e:
    print(f"❌ Erreur lors de la création de l'utilisateur: {e}")