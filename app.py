# app.py
import streamlit as st
from datetime import date, timedelta
from database import (
    get_commandes,
    init_db_if_needed
)

# ========================================
# 🔐 PROTECTION PAR MOT DE PASSE
# ========================================
from auth import check_password

if not check_password():
    st.stop()  # Arrête l'exécution si pas authentifié


##### Voir pour faire une page d'import excel des formules, produits et catégories déjà existantes 

# Configuration
st.set_page_config(
  page_title="Oh My Brunch! - Gestion prod",
  page_icon="🍽️",
  layout="wide"
)

# Initialiser la base de données
init_db_if_needed()

# Page d'accueil
st.title("🍽️ OMG - Gestion production")
st.write("Bienvenue dans le système de gestion de commandes")

st.divider()

col1, col2 = st.columns(2)

with col1:
  st.subheader("📦 Produits")
  st.write("Gérer votre catalogue de produits")

  st.subheader("📋 Formules")
  st.write("Créer et modifier vos formules")

with col2:
  st.subheader("📝 Commandes")
  st.write("Carnet de commandes actif")

  st.subheader("📚 Archives")
  st.write("Historique des commandes")

st.info("👈 Utilisez le menu latéral pour naviguer")





