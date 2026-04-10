import os
from dotenv import load_dotenv

# Load environment variables from a .env file
load_dotenv()

# Supabase Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# API Configuration
API_HOST = "127.0.0.1"
API_PORT = 8000
API_RELOAD = True

# CORS Configuration
# Détection automatique de l'environnement
IS_PRODUCTION = os.getenv("RENDER_SERVICE_NAME") is not None

if IS_PRODUCTION:
    # En production : autoriser uniquement le frontend déployé
    CORS_ORIGINS = ["https://omb-frontend.onrender.com"]
else:
    # En développement : autoriser le frontend local
    CORS_ORIGINS = [
        "http://localhost:5173",  # Vite (défaut)
        "http://localhost:8080",  # Ancien serveur
        "http://127.0.0.1:5173"
    ]