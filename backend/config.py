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
CORS_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "null"
]

