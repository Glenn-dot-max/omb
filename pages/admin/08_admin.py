# pages/ 07_admin_bugs.py
import streamlit as st
import sys
from pathlib import Path
from datetime import datetime

# Protection par mot de passe
sys.path.append(str(Path(__file__).parent.parent))
from auth import check_password

if not check_password():
  st.stop()

from database import get_all_bug_reports, update_bug_status, delete_bug_report, add_admin_notes, get_bug_stats
# Configuration 
st.set_page_config(page_title="Administration des Bugs", page_icon="🔧", layout="wide")

st.title("🔧 Administration des Bugs")

# Filtres 
col1, col2, col3 = st.columns(3)

with col1:
  filtre_status = st.selectbox(
    "Statut",
    ["Tous", "Nouveau", "En cours", "Résolu", "Fermé"],
    key="filtre_status"
  )

with col2:
  filtre_type = st.selectbox(
    "Type de bug",
    ["Tous", "UI", "Fonctionnalité", "Performance", "Sécurité", "Autre"],
    key="filtre_type"
  )

with col3:
  tri = st.selectbox(
    "Trier par",
    ["Plus récent", "Plus ancien", "Priorité"],
    key="tri_bugs"
  )

st.divider()

# Récupération des bugs
try:
  bugs = get_all_bug_reports()

  # Appliquer les filtres 
  if filtre_status != "Tous":
    bugs = [b for b in bugs if b.get('status', 'nouveau').lower() == filtre_status.lower()]

  if filtre_type != "Tous":
    bugs = [b for b in bugs if b.get('bug_type') == filtre_type]

  # Trier
  if tri == "Plus récent":
    bugs = sorted(bugs, key=lambda x: x.get('created_at', ''), reverse=True)
  elif tri == "Plus ancien":
    bugs = sorted(bugs, key=lambda x: x.get('created_at', ''))
  
  # Statistiques 
  col1, col2, col3 = st.columns(3)
  with col1:
    st.metric("Total des bugs", len(bugs))
  with col2:
    nouveau = len([b for b in bugs if b.get('status', 'nouveau').lower() == 'nouveau'])
    st.metric("Nouveaux", nouveau)
  with col3:
    resolu = len([b for b in bugs if b.get('status', '').lower() == 'résolu'])
    st.metric("Résolus", resolu)
  
  st.divider()

  # Affichage des bugs
  if bugs:
    for bug in bugs:
      # Badge de statut
      status = bug.get('status', 'nouveau')
      if status.lower() == 'nouveau':
        badge_color = '#ff4b4b'
        badge_icon = '🆕'
      elif status.lower() == 'en cours':
        badge_color = '#ffa500'
        badge_icon = '⏳'
      elif status.lower() == 'résolu':
        badge_color = '#00c853'
        badge_icon = '✅'
      elif status.lower() == 'fermé':
        badge_color = '#808080'
        badge_icon = '📋'
      else:
        # Valeur par défaut si statut inconnu
        badge_color = '#cccccc'
        badge_icon = '❓'

      # Date formatée
      created_at = bug.get('created_at')
      if created_at:
        try:
          dt = datetime.fromisoformat(str(created_at).replace('Z', '+00:00'))
          date_str = dt.strftime("%d/%m/%Y à %H:%M")
        except:
          date_str = str(created_at)
      else:
        date_str = "Date inconnue"
      
      with st.expander(
        f"{badge_icon} BUG-{bug.get('id')} | {bug.get('bug_type')} | {bug.get('page_concernee')} | {date_str}",
        expanded=False
      ):
        # Badge de statut
        st.markdown(f"""
        <div style='display: inline-block; background-color: {badge_color}; color: white; padding: 5px 10px; border-radius: 15px; margin-bottom: 10px;'>
            <strong>{badge_icon} {status.upper()}</strong>
        </div>
        """, unsafe_allow_html=True)

        # Informations principales
        col1, col2, col3 = st.columns(3)
        with col1:
          st.metric("Type", bug.get('bug_type'))
        with col2:
          st.metric("Page concernée", bug.get('page_concernee'))
        with col3:
          st.metric("Référence", f"BUG-{bug.get('id')}")
        
        st.divider()

        # Description
        st.markdown("### 📝 Description")
        st.markdown(bug.get('description', 'Aucune description disponible'))

        # Étapes
        if bug.get('etapes'):
          st.markdown("### 🚶‍♂️ Étapes pour reproduire")
          st.markdown(bug.get('etapes', 'Aucune étape fournie'))
        
        # Contact
        if bug.get('contact_email'):
          st.markdown("### 📧 Contact")
          st.markdown(bug.get('contact', 'Aucun contact fourni'))
        
        # Screenshots
        if bug.get('screenshot_url'):
          st.markdown("### 📸 Screenshots")
          st.info(f"Fichier : {bug.get('screenshot_url')}")

        st.divider()

        # Notes admin
        st.markdown("### 🗒️ Notes Administrateur")
        notes_actuelles = bug.get('notes_admin', '')
        nouvelles_notes = st.text_area(
          "Notes internes",
          value=notes_actuelles,
          key=f"admin_notes_{bug.get('id')}",
          height=100
        )

        # Actions 
        st.markdown("### ⚙️ Actions")
        col1, col2, col3, col4 = st.columns(4)

        with col1:
          statuses = ["Nouveau", "En cours", "Résolu", "Fermé"]
          statuses_db = ["nouveau", "en_cours", "resolu", "ferme"]
          
          # Récupérer le statut actuel depuis la base
          current_status_db = bug.get('status', 'nouveau')
          
          # Mapper les valeurs DB vers les labels d'affichage
          status_map = {
              'nouveau': 'Nouveau',
              'en_cours': 'En cours',
              'resolu': 'Résolu',
              'ferme': 'Fermé'
          }
          
          current_status_display = status_map.get(current_status_db, 'Nouveau')
          
          # Trouver l'index
          try:
              status_index = statuses.index(current_status_display)
          except ValueError:
              status_index = 0
          
          nouveau_status_display = st.selectbox(
              "Statut",
              statuses,
              index=status_index,
              key=f"status_{bug.get('id')}"
          )
          
          # Convertir l'affichage vers la valeur DB
          reverse_map = {
              'Nouveau': 'nouveau',
              'En cours': 'en_cours',
              'Résolu': 'resolu',
              'Fermé': 'ferme'
          }
          nouveau_status = reverse_map[nouveau_status_display]
        
        with col2:
          st.write("")  # Espaceur
          st.write("")  # Espaceur
          if st.button("💾 Sauvegarder", key=f"save_{bug.get('id')}", type="primary"):
            # Mettre à jour le statut
            if update_bug_status(bug.get('id'), nouveau_status):
              # Mettre à jour les notes
              if nouvelles_notes != notes_actuelles:
                add_admin_notes(bug.get('id'), nouvelles_notes)
              st.success("Mise à jour réussie.")
              st.rerun()
            else:
              st.error("Échec de la mise à jour.")
        
        with col3:
          st.write("")  # Espaceur
          st.write("")  # Espaceur
          if st.button("🗑️ Supprimer le bug", key=f"delete_{bug.get('id')}"):
            if delete_bug_report(bug.get('id')):
              st.success("Bug supprimé avec succès.")
              st.rerun()
            else:
              st.error("Échec de la suppression.")
        
        with col4:
          st.write("")  # Espaceur
          st.write("")  # Espaceur
          if bug.get('contact_email'):
            if st.button("📧 Contacter", key=f"contact_{bug.get('id')}"):
              st.info(f"Email : {bug.get('contact_email')}")

  else:
    st.info("Aucun bug à afficher")

except Exception as e:
  st.error(f"Erreur lors de la récupération des bugs : {e}")        