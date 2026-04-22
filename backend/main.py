from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from uuid import UUID
import json
import os
import logging
from config import CORS_ORIGINS
from routes import produits, commandes, formules, formule_produits, commande_formules, commande_produits, categories, types, unite, planning, auth, admin, franchise_catalogue
from datetime import date, datetime


# ============================================
# CONFIGURATION LOGGING
# ============================================

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("omb")

# Mode debug
DEBUG = os.getenv("DEBUG", "False").lower() == "true"

# ============================================
# ENCODERS CUSTOM
# ============================================

class UUIDEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, UUID):
            return str(obj)
        if isinstance(obj, (date, datetime)):
            return obj.isoformat()
        return json.JSONEncoder.default(self, obj)
    
class CustomJSONResponse(JSONResponse):
    def render(self, content) -> bytes:
        return json.dumps(
            jsonable_encoder(content),
            cls=UUIDEncoder,
            ensure_ascii=False,
        ).encode("utf-8")

# ============================================
# APPLICATION FASTAPI
# ============================================

app = FastAPI(
    title="Oh My Brunch API",
    description="API pour gérer les produits, formules et commandes d'Oh My Brunch",
    version="1.0.0",
    default_response_class=CustomJSONResponse,
    redirect_slashes=False,
)

# ============================================
# MIDDLEWARE CORS
# ============================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# GESTIONNAIRES D'ERREURS
# ============================================

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Gestion des erreurs de validation Pydantic"""
    errors = exc.errors()
    logger.warning(f"Validation error on {request.url}: {exc.errors()}")
    
    formatted_errors = []
    for error in errors:
        formatted_error = {
            "loc": list(error.get("loc", [])),
            "msg": error.get("msg", ""),
            "type": error.get("type", "")
        }
        if "ctx" in error and "error" in error["ctx"]:
            ctx_error = error["ctx"]["error"]
            formatted_error["msg"] = str(ctx_error)

        formatted_errors.append(formatted_error)


    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": "Données invalides",
            "errors": formatted_errors,
        }
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Gestion des erreurs non gérées"""
    logger.error(f"Unexpected error on {request.url}: {str(exc)}", exc_info=True)
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "Une erreur est survenue",
            "message": str(exc) if DEBUG else "Erreur interne du serveur",
        }
    )

# ============================================
# ROUTERS
# ============================================

app.include_router(formules.router)
app.include_router(produits.router)
app.include_router(commandes.router)
app.include_router(formule_produits.router)
app.include_router(commande_formules.router)
app.include_router(commande_produits.router)
app.include_router(categories.router)
app.include_router(types.router)
app.include_router(unite.router)
app.include_router(planning.router)
app.include_router(admin.router)
app.include_router(auth.router)
app.include_router(franchise_catalogue.router)


# ============================================
# ROUTES
# ============================================

@app.get("/")
async def root():
    return {
        "message": "Bienvenue sur l'API Oh My Brunch!",
        "version": "1.0.0",
        "status": "operational",
        "endpoints": [
            "/produits",
            "/formules",
            "/commandes",
            "/formule-produits",
            "/commande-formules",
            "/commande-produits",
            "/categories",
            "/types",
            "/unite",
            "/planning"
        ]
    }

@app.get("/health")
async def health_check():
    """Endpoint de santé pour monitoring"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat()
    }

# ============================================
# LANCEMENT
# ============================================

if __name__ == "__main__":
    import uvicorn
    from config import API_HOST, API_PORT, API_RELOAD
    
    logger.info(f"🚀 Starting OMB API on {API_HOST}:{API_PORT}")
    logger.info(f"📝 Debug mode: {DEBUG}")
    
    uvicorn.run("main:app", host=API_HOST, port=API_PORT, reload=API_RELOAD)