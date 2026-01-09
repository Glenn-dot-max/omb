# pages/06_bug_report.py
import streamlit as st 
import sys
from pathlib import Path

# Protection par mot de passe
sys.path.append(str(Path(__file__).parent.parent))
from auth import check_password

if not check_password():
    st.error("Accès refusé. Mot de passe incorrect.")
    st.stop()

from database import save_bug_report

# Configuration
st.set_page_config(page_title="Signaler un bug", page_icon="🐛", layout="centered")

st.title("🐛 Signaler un bug")

st.info("💡 **Rapide et simple** : Dévrivez le problème en quelques mots")

# Formulaire de signalement de bug
with st.form(key='bug_report_form', clear_on_submit=True):

    # Description - CHAMP PRINCIPAL
    description = st.text_area(
        "Que s'est-il passé ? *",
        placeholder="Ex: Erreur quand je clique sur 'Créer une commande' \nEx: Les totaux du planning ne s'affichent pas",
        height=120,
        help="Décrivez le problème rencontré de manière claire et concise."
    )

    st.divider()

    # Options supplémentaires
    with st.expander("➕ Informations supplémentaires (optionnel)"):
        col1, col2 = st.columns(2)

        with col1:
            page_concernee = st.selectbox(
                "Page concernée",
                ["Je ne sais pas", "App", "Produits", "Formules", "Commandes", "Production", "Calendrier"],
                help="Si vous savez sur quelle page le bug est survenu, sélectionnez-la ici."
            )
        
        with col2:
            bug_type = st.selectbox(
                "Type de bug",
                ["Je ne sais pas", "Affichage", "Fonctionnalité", "Performance", "Autre"],
                help="Sélectionnez le type de bug rencontré."
            )
    
    st.divider()

    # Bouton de soumission
    submitted = st.form_submit_button(
        "Envoyer le rapport de bug 🐛",
        type="primary",
        use_container_width=True
    )

    if submitted:
        if not description or len(description.strip()) < 10:
            st.error("Veuillez fournir une description détaillée du bug (au moins 10 caractères).")
        else:
            try:
                # Déterminer la page concernée
                if page_concernee == "Je ne sais pas":
                    page_concernee = "Non spécifiée"
                
                # Sauvegarder
                bug_id = save_bug_report(
                    bug_type=bug_type,
                    page_concernee=page_concernee,
                    description=description.strip(),
                    etapes=None, 
                    screenshot_url=None
                )

                if bug_id:
                    st.success(f"Merci ! Votre rapport de bug a été envoyé avec succès. (ID: {bug_id})")
                    st.balloons()
                else:
                    st.error("Une erreur est survenue lors de l'enregistrement de votre rapport de bug. Veuillez réessayer plus tard.")
            except Exception as e:
                st.error(f"Une erreur est survenue : {e}")   

st.divider()

# Aide rapide
col1, col2 = st.columns(2)

with col1:
    st.markdown("""
    ### 💡 Exemples 
    - "La page se bloque"
    - "Erreur en créant une commande"
    - " Les chiffres sont érronés dans le planning"
    - " Impossible d'ajouter un produit"
    """)

with col2:
    st.markdown("""
    ### 🛠️ Capture d'écran ?
    ** Windows :** `Alt + Impr écran`
    ** Mac :** `Cmd + Shift + 4`
    """)