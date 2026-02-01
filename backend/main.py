from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.encoders import jsonable_encoder
from uuid import UUID
import json
from config import CORS_ORIGINS
from routes import produits, commandes, formules, formule_produits, commande_formules, commande_produits, categories, types

class UUIDEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, UUID):
            return str(obj)
        return json.JSONEncoder.default(self, obj)

# Créer l'application FastAPI
app = FastAPI(
    title="Oh My Brunch API",
    description="API pour gérer les produits, formules et commandes d'Oh My Brunch",
    version="1.0.0"
)

# Configurer les middleware CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inclure les routeurs pour les différentes entités
app.include_router(formules.router)
app.include_router(produits.router)
app.include_router(commandes.router)
app.include_router(formule_produits.router)
app.include_router(commande_formules.router)
app.include_router(commande_produits.router)
app.include_router(categories.router)
app.include_router(types.router)

# Route de test
@app.get("/")
async def root():
    return {
        "message": "Bienvenue sur l'API Oh My Brunch!",
        "version": "1.0.0",
        "endpoints": [
            "/produits",
            "/formules",
            "/commandes",
            "/formule-produits",  # ← Tiret, pas underscore
            "/commande-formules",  # ← Tiret, pas underscore
            "/commande-produits"   # ← Tiret, pas underscore
        ]
    }

if __name__ == "__main__":
    import uvicorn
    from config import API_HOST, API_PORT, API_RELOAD
    
    uvicorn.run("main:app", host=API_HOST, port=API_PORT, reload=API_RELOAD)
