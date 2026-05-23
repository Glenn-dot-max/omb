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
# Toujours garder les origines locales pour le dev, même si une variable d'env de prod est présente.
default_local_origins = [
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://localhost:5500",
    "http://127.0.0.1:5500",
]

production_origins = ["https://omb-frontend.onrender.com"]

env_origins = os.getenv("CORS_ORIGINS", "").strip()
if env_origins:
    parsed_env_origins = [o.strip() for o in env_origins.split(",") if o.strip()]
    CORS_ORIGINS = list(dict.fromkeys(default_local_origins + production_origins + parsed_env_origins))
else:
    CORS_ORIGINS = list(dict.fromkeys(default_local_origins + production_origins))