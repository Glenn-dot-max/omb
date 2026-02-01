from email.policy import default
from pydantic import BaseModel, EmailStr, field_serializer
from typing import Optional
from uuid import UUID
from datetime import datetime, date, time

# Configuration pour sérialiser les UUIDs
class UUIDModel(BaseModel):
    class Config:
        json_encoders = {
            UUID: lambda v: str(v)
        }

# ================ PRODUIT MODÈLE ================
class ProduitBase(BaseModel):
    name: str
    categorie_id: Optional[int] = None
    type_id: Optional[int] = None

class ProduitCreate(ProduitBase):
    pass

class ProduitUpdate(BaseModel):
    name: Optional[str] = None
    categorie_id: Optional[int] = None
    type_id: Optional[int] = None

# ================ FORMULES MODÈLE ================
class FormuleBase(BaseModel):
    name: str
    nombre_couverts: int = 1
    type_formule: str = "Non-Brunch"

class FormuleCreate(FormuleBase):
    pass

class FormuleUpdate(BaseModel):
    name: Optional[str] = None
    nombre_couverts: Optional[int] = None
    type_formule: Optional[str] = None

# ================ CARNET_COMMANDE MODELS ================

class CarnetCommandeBase(BaseModel):
    nom_client: str
    nombre_couverts: int = 1
    service: bool = False
    delivery_date: date
    delivery_hour: time
    notes: Optional[str] = None
    avec_service: bool = True

class CarnetCommandeCreate(CarnetCommandeBase):
    pass

class CarnetCommandeUpdate(BaseModel):
    nom_client: Optional[str] = None
    nombre_couverts: Optional[int] = None
    service: Optional[bool] = None
    delivery_date: Optional[date] = None
    delivery_hour: Optional[time] = None
    notes: Optional[str] = None
    avec_service: Optional[bool] = None

# ================ COMMANDE_FORMULES MODELS ================

class CommandeFormuleBase(UUIDModel):
    commande_id: UUID
    formule_id: UUID
    quantite_recommandee: float = 0
    quantite_finale: float = 0

class CommandeFormuleCreate(CommandeFormuleBase):
    pass

class CommandeFormuleUpdate(BaseModel):
    quantite_recommandee: Optional[float] = None
    quantite_finale: Optional[float] = None

# ================ COMMANDE_PRODUITS MODELS ================

class CommandeProduitBase(UUIDModel):
    commande_id: UUID
    produit_id: UUID
    quantite: float = 0
    unite_id: Optional[int] = None

class CommandeProduitCreate(CommandeProduitBase):
    pass

class CommandeProduitUpdate(BaseModel):
    quantite: Optional[float] = None
    unite_id: Optional[int] = None

# ================ FORMULE_PRODUITS MODELS ================

class FormuleProduitBase(UUIDModel):
    formule_id: UUID
    produit_id: UUID
    quantite: float = 0
    unite_id: Optional[int] = 11

class FormuleProduitCreate(FormuleProduitBase):
    pass

class FormuleProduitUpdate(BaseModel):
    quantite: Optional[float] = None
    unite_id: Optional[int] = None