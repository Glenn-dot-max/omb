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
CORS_ORIGINS_ENV = os.getenv("CORS_ORIGINS", "*")

# Convertir la chaîne en liste si nécessaire
if isinstance(CORS_ORIGINS_ENV, str):
  if CORS_ORIGINS_ENV == "*":
      CORS_ORIGINS = ["*"]
  else:
      CORS_ORIGINS = [origin.strip() for origin in CORS_ORIGINS_ENV.split(",")]
else:
  CORS_ORIGINS = ["*"]
