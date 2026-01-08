# auth.py - Système d'authentification
import streamlit as st
import hashlib

def check_password():
  """
  Retourne True si l'urtilisateur a entré le bon mot de passe. 
  Ajoute un système de session pour ne pas redemander à chaque page.
  """

  # Si déjà authentifié, retourner True 
  if st.session_state.get("password_correct", False):
    return True
  
  # Sinon, afficher le formulaire de login
  st.title("🔐 Connexion à l'application de production OMB")
  st.markdown("### Veuillez vous connecter pour accéder à l'application")

  # Créer le formulaire
  with st.form("login_form"):
    username = st.text_input("Nom d'utilisateur", key="username_input")
    password = st.text_input("Mot de passe", type="password", key="password_input")
    submit = st.form_submit_button("Se connecter")

    if submit:
      # Hash du mot de passe pour comparaison sécurisée
      password_hash = hashlib.sha256(password.encode()).hexdigest()

      # Récupérer les identifiants depuis secrets.toml
      try:
        correct_username = st.secrets["auth"]["username"]
        correct_password_hash = st.secrets["auth"]["password_hash"]

        if username == correct_username and password_hash == correct_password_hash:
          st.session_state["password_correct"] = True
          st.success("✅ Connexion réussie !")
          st.rerun()
        else:
          st.error("❌ Nom d'utilisateur ou mot de passe incorrect")
          return False
      except KeyError:
        st.error("⚠️ Configuration d'authentification manquante. Contactez l'administrateur (Glenn quoi).")
        return False

  return False

def logout():
  """Fonction pour se déconnecter"""
  st.session_state["password_correct"] = False
  st.rerun()
  