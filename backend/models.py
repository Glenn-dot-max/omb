from pydantic import BaseModel, EmailStr, validator, Field, constr
from typing import Optional, List
from uuid import UUID
from datetime import datetime, date, time
import re

# Configuration pour sérialiser les UUIDs
class UUIDModel(BaseModel):
    class Config:
        json_encoders = {
            UUID: lambda v: str(v)
        }
        extra = 'forbid'


# ================ PRODUIT MODÈLE ================

class ProduitBase(BaseModel):
    name: constr(min_length=1, max_length=200, strip_whitespace=True)
    categorie_id: Optional[int] = None
    type_id: Optional[int] = None
    
    @validator('name')
    def validate_name(cls, v):
        if not v or not v.strip():
            raise ValueError('Le nom ne peut pas être vide')
        if re.search(r'[<>"\']', v):
            raise ValueError('Caractères non autorisés dans le nom')
        return v.strip()
    
    @validator('categorie_id', 'type_id')
    def validate_ids(cls, v):
        if v is not None and v < 1:
            raise ValueError('ID doit être positif')
        return v

class ProduitCreate(ProduitBase):
    pass

class ProduitUpdate(BaseModel):
    name: Optional[constr(min_length=1, max_length=200, strip_whitespace=True)] = None
    categorie_id: Optional[int] = None
    type_id: Optional[int] = None
    
    class Config:
        extra = 'forbid'


# ================ FORMULES MODÈLE ================

class FormuleBase(BaseModel):
    name: constr(min_length=1, max_length=200, strip_whitespace=True)
    nombre_couverts: int = Field(default=1, ge=1, le=10000)
    type_formule: str = Field(default="Non-Brunch", max_length=100)
    
    @validator('name')
    def validate_name(cls, v):
        if not v or not v.strip():
            raise ValueError('Le nom ne peut pas être vide')
        if re.search(r'[<>"\']', v):
            raise ValueError('Caractères non autorisés')
        return v.strip()

class FormuleCreate(FormuleBase):
    pass

class FormuleUpdate(BaseModel):
    name: Optional[constr(min_length=1, max_length=200)] = None
    nombre_couverts: Optional[int] = Field(None, ge=1, le=10000)
    type_formule: Optional[str] = Field(None, max_length=100)
    
    class Config:
        extra = 'forbid'


# ================ CARNET_COMMANDE MODELS ================

class CarnetCommandeBase(BaseModel):
    nom_client: constr(min_length=2, max_length=200, strip_whitespace=True)
    nombre_couverts: int = Field(default=1, ge=1, le=10000)
    service: bool = False
    delivery_date: date
    delivery_hour: time
    notes: Optional[constr(max_length=5000)] = None
    avec_service: bool = True
    validated: bool = True
    
    @validator('nom_client')
    def validate_nom_client(cls, v):
        if not v or not v.strip():
            raise ValueError('Le nom du client ne peut pas être vide')
        if re.search(r'[<>"\'\\/]', v):
            raise ValueError('Caractères non autorisés dans le nom du client')
        return v.strip()
    
    @validator('delivery_date')
    def validate_delivery_date(cls, v):
        if v < date.today():
            raise ValueError('La date de livraison ne peut pas être dans le passé')
        
        from datetime import timedelta
        max_future = date.today() + timedelta(days=365)
        if v > max_future:
            raise ValueError('La date de livraison est trop éloignée (max 1 an)')
        
        return v
    
    @validator('notes')
    def validate_notes(cls, v):
        if v:
            v = v.strip()
            if len(v) > 5000:
                raise ValueError('Les notes ne peuvent pas dépasser 5000 caractères')
            if re.search(r'<script|javascript:|onerror=|onclick=', v, re.IGNORECASE):
                raise ValueError('Contenu non autorisé dans les notes')
        return v

class CarnetCommandeCreate(CarnetCommandeBase):
    class Config:
        extra = 'forbid'

class CarnetCommandeUpdate(BaseModel):
    nom_client: Optional[constr(min_length=2, max_length=200)] = None
    nombre_couverts: Optional[int] = Field(None, ge=1, le=10000)
    service: Optional[bool] = None
    delivery_date: Optional[date] = None
    delivery_hour: Optional[time] = None
    notes: Optional[constr(max_length=5000)] = None
    avec_service: Optional[bool] = None
    validated: Optional[bool] = None
    class Config:
        extra = 'forbid'


# ================ COMMANDE_FORMULES MODELS ================

class CommandeFormuleBase(UUIDModel):
    commande_id: UUID
    formule_id: UUID
    quantite_recommandee: float = Field(default=0, ge=0, le=10000)
    quantite_finale: float = Field(default=0, ge=0, le=10000)
    produits_exclus: list[str] = Field(default_factory=list)
    
    @validator('quantite_recommandee', 'quantite_finale')
    def validate_quantites(cls, v):
        if v < 0:
            raise ValueError('La quantité ne peut pas être négative')
        if v > 10000:
            raise ValueError('Quantité trop élevée (max 10000)')
        return round(v, 2)

class CommandeFormuleCreate(CommandeFormuleBase):
    class Config:
        extra = 'forbid'

class CommandeFormuleUpdate(BaseModel):
    quantite_recommandee: Optional[float] = Field(None, ge=0, le=10000)
    quantite_finale: Optional[float] = Field(None, ge=0, le=10000)
    
    class Config:
        extra = 'forbid'


# ================ COMMANDE_PRODUITS MODELS ================

class CommandeProduitBase(UUIDModel):
    commande_id: UUID
    produit_id: UUID
    quantite: float = Field(default=0, ge=0, le=10000)
    unite: Optional[constr(max_length=50)] = None
    
    @validator('quantite')
    def validate_quantite(cls, v):
        if v < 0:
            raise ValueError('La quantité ne peut pas être négative')
        if v > 10000:
            raise ValueError('Quantité trop élevée')
        return round(v, 2)

class CommandeProduitCreate(CommandeProduitBase):
    class Config:
        extra = 'forbid'

class CommandeProduitUpdate(BaseModel):
    quantite: Optional[float] = Field(None, ge=0, le=10000)
    unite: Optional[constr(max_length=50)] = None
    
    class Config:
        extra = 'forbid'


# ================ FORMULE_PRODUITS MODELS ================

class FormuleProduitBase(UUIDModel):
    formule_id: UUID
    produit_id: UUID
    quantite: float = Field(default=0, ge=0, le=10000)
    unite: Optional[constr(max_length=50)] = None
    
    @validator('quantite')
    def validate_quantite(cls, v):
        if v < 0:
            raise ValueError('La quantité ne peut pas être négative')
        return round(v, 2)

class FormuleProduitCreate(FormuleProduitBase):
    class Config:
        extra = 'forbid'

class FormuleProduitUpdate(BaseModel):
    quantite: Optional[float] = Field(None, ge=0, le=10000)
    unite: Optional[constr(max_length=50)] = None
    
    class Config:
        extra = 'forbid'
