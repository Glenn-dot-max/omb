import streamlit as st
import calendar
import sys
from pathlib import Path
from datetime import date, datetime, timedelta

sys.path.append(str(Path(__file__).parent.parent))

from database import(
  get_commandes,
  init_db_if_needed
)

# Helper pour convertir les dates
def to_date(d):
    from datetime import date as date_type
    return d if isinstance(d, date_type) else date_type.fromisoformat(d)



# Configuration
st.set_page_config(page_title="Calendrier", page_icon="📅", layout="wide")

# Initialiser la base
init_db_if_needed()

st.title("📅 Calendrier")

# Initialiser la vue et date dans session_state
if 'vue_actuelle' not in st.session_state:
  st.session_state['vue_actuelle'] = "📅 Mois"
if 'date_actuelle' not in st.session_state:
  st.session_state['date_actuelle'] = date.today()

# CSS Amélioré (correction des bugs)
st.markdown("""
<style>
.calendar-header {
    background-color: #8B4513;
    color: white;
    padding: 12px;
    text-align: center;
    font-weight: bold;
    border-radius: 5px 5px 0 0;
    margin-bottom: 2px;
}

.calendar-day-cell {
    background-color: #FFE4B5;
    border: 1px solid #DEB887;
    border-radius: 5px;
    min-height: 125px;
    padding: 5px;
    position: relative;
    margin-bottom: 10px;
}  

.day-number {
    position: absolute;
    top: 5px;
    left: 8px;
    background-color: #8B4513;
    color: white;
    padding: 3px 8px;
    border-radius: 3px;
    font-weight: bold;
    font-size: 0.9em;
}

.calendar-day-cell-today {
    background-color: #FFA500;
    border: 2px solid #FF8C00;
    box-shadow: 0 0 10px rgba(255, 140, 0, 0.3);
}
            
.commande-item {
    padding: 4px 6px;
    border-radius: 3px;
    font-size: 0.8em;
    white-space: normal;
    overflow: visible;
    text-overflow: clip;
    margin: 3px 0;
}

.commande-matin {
    background-color: #FFA500;
    color: white;
}

.commande-soir {
    background-color: #4A90E2;
    color: white;
}

.badge-commandes {
    position: absolute;
    top: 5px;
    right: 8px;
    background: #FF6B6B;
    color: white;
    border-radius: 50%;
    width: 22px;
    height: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.7em;
    font-weight: bold;
}
</style>          
""", unsafe_allow_html=True)

# Cache pour les commandes
@st.cache_data(ttl=60)
def get_commandes_cached():
    return get_commandes()

# Récupérer toutes les commandes
commandes = get_commandes_cached()

# Sélecteurs 
col1, col2 = st.columns([1, 3])

with col1:
  # utiliser directement session_state au lieu d'une variable locale
  vue_selectionnee = st.selectbox(
      "Vue",
      ["📅 Mois", "📆 Semaine", "🗓️ 3 jours", "📋 Jour"],
      index=["📅 Mois", "📆 Semaine", "🗓️ 3 jours", "📋 Jour"].index(st.session_state['vue_actuelle']),
  )

  # SEULEMENT mettre à jour si l'utilisateur change manuellement la radio
  if vue_selectionnee != st.session_state['vue_actuelle']:
    st.session_state['vue_actuelle'] = vue_selectionnee
    st.rerun()

  # Bouton retour à aujourd'hui
  if st.button("🔵 Aujourd'hui", use_container_width=True, type="primary"):
    st.session_state['date_actuelle'] = date.today()
    st.rerun()

# utiliser directement session_state au lieu de la variable vue
  vue = st.session_state['vue_actuelle']  

with col2:
  # Filtres
  col_f1, col_f2 = st.columns(2)
  
  with col_f1:
    filtre_service = st.multiselect(
      "🕐 Service", 
      ["Matin", "Soir"], 
      default=["Matin", "Soir"],
      key="filtre_service"
    )
  
  with col_f2:
    clients_uniques = sorted(list(set([c['client'] for c in commandes])))
    filtre_client = st.multiselect(
      "👤 Client", 
      clients_uniques,
      key="filtre_client"
    )

# Appliquer les filtres
commandes_filtrees = commandes
if filtre_service:
  commandes_filtrees = [
    c for c in commandes_filtrees 
    if (c['service'] == 0 and "Matin" in filtre_service) 
    or (c['service'] == 1 and "Soir" in filtre_service)
  ]
if filtre_client:
  commandes_filtrees = [c for c in commandes_filtrees if c['client'] in filtre_client]

# Sélection de date
if vue == "📅 Mois":
  col_a, col_b = st.columns(2)
  with col_a:
    mois = st.selectbox(
      "Mois",
      range(1, 13),
      index=date.today().month - 1,
      format_func=lambda x: calendar.month_name[x]
    )
  with col_b:
    annee = st.number_input("Année", value=date.today().year, min_value=2020, max_value=2030)
  date_ref = date(annee, mois, 1)
else:
  date_ref = st.date_input("Date", value=st.session_state['date_actuelle'])

# Mettre à jour session_state
st.session_state['vue_actuelle'] = vue
st.session_state['date_actuelle'] = date_ref

st.divider()

# ======== VUE MOIS ========
if vue == "📅 Mois":
  # Navigation et stats
  col_prev, col_stats, col_next = st.columns([1, 8, 1])
  
  with col_prev:
    if st.button("◀", key="prev_month", help="Mois précédent"):
      if mois == 1:
        st.session_state['date_actuelle'] = date(annee - 1, 12, 1)
      else:
        st.session_state['date_actuelle'] = date(annee, mois - 1, 1)
      st.rerun()
  
  with col_stats:
    # Calculer les stats du mois
    premier_jour = date(annee, mois, 1)
    dernier_jour = date(annee, mois, calendar.monthrange(annee, mois)[1])
    commandes_mois = [
      c for c in commandes_filtrees 
      if premier_jour <= to_date(c['date']) <= dernier_jour
    ]
    
    col_s1, col_s2, col_s3 = st.columns(3)
    with col_s1:
      st.metric("📦 Commandes", len(commandes_mois))
    with col_s2:
      total_couverts = sum(c['couverts'] for c in commandes_mois)
      st.metric("👥 Couverts", total_couverts)
    with col_s3:
      jours_avec_commandes = len(set([c['date'] for c in commandes_mois]))
      st.metric("📅 Jours actifs", jours_avec_commandes)
  
  with col_next:
    if st.button("▶", key="next_month", help="Mois suivant"):
      if mois == 12:
        st.session_state['date_actuelle'] = date(annee + 1, 1, 1)
      else:
        st.session_state['date_actuelle'] = date(annee, mois + 1, 1)
      st.rerun()

  st.divider()
  st.subheader(f"{calendar.month_name[mois]} {annee}")

  # Obtenir le calendrier
  cal = calendar.monthcalendar(annee, mois)

  # En-tête des jours 
  jours_semaine = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]
  cols_header = st.columns(7)
  for i, jour_nom in enumerate(jours_semaine):
    with cols_header[i]:
      st.markdown(f"<div class='calendar-header'>{jour_nom}</div>", unsafe_allow_html=True)

  # Afficher les semaines 
  for semaine in cal:
    cols = st.columns(7)
    for i, numero_jour in enumerate(semaine):
      with cols[i]:
        if numero_jour == 0:
          # Jour vide
          st.markdown("<div style='min-height: 100px;'></div>", unsafe_allow_html=True)
        else:
          date_jour = date(annee, mois, numero_jour)
          date_str = date_jour.strftime('%Y-%m-%d')
          commandes_jour = [c for c in commandes_filtrees if c['date'] == date_str]

          # Bouton invisible couvrant toute la case
          if st.button(
            " ",
            key=f"day_mois_{date_jour}",
            help=f"Cliquez pour voir la semaine",
            use_container_width=True
          ):
            st.session_state['vue_actuelle'] = "📆 Semaine"
            st.session_state['date_actuelle'] = date_jour
            st.rerun()

          # Classe CSS selon si c'est aujourd'hui
          css_class = "calendar-day-cell-today" if date_jour == date.today() else "calendar-day-cell"

          # Contenu de la cellule PAR DESSUS le bouton
          html = f"""
          <div class='calendar-day-cell {css_class}' style='margin-top: -42px; pointer-events: none;'>
              <div class='day-number'>{numero_jour}</div>
          """
          
          # Badge avec nombre de commandes
          if commandes_jour:
            html += f"<div class='badge-commandes'>{len(commandes_jour)}</div>"

          # Ajouter chaque commande dans le HTML
          if commandes_jour:
              html += """
                  <p style='color: #888; font-size: 0.75em; margin:-22px 0 0 0; text-align: center; padding-right: 8px;'>Réduire la vue</p>
                  <div style='margin-top: 35px;'>
              """
              for cmd in commandes_jour:
                  service_icon = "🌅" if cmd['service'] == 0 else "🌙"
                  service_class = "commande-matin" if cmd['service'] == 0 else "commande-soir"
                  html += f"<div class='commande-item {service_class}' style='margin: 6px 0;'>{service_icon} {cmd['heure'][:5]} {cmd['client']}</div>"
              html += "</div>"
          
          else:
              html += "<p style='color: #aaa; text-align: center; font-size: 0.85em; margin-top: 40px;'>Aucune commande</p>"

          html += """
          </div>    
          """

          st.markdown(html, unsafe_allow_html=True)

# ======== VUE SEMAINE =======
elif vue == "📆 Semaine":
  # Bouton retour vers mois
  if st.button("⬅️ Retour au mois", key="retour_mois", type="secondary"):
    st.session_state['vue_actuelle'] = "📅 Mois"
    st.rerun()

  # Début de semaine (lundi)
  debut_semaine = date_ref - timedelta(days=date_ref.weekday())
  fin_semaine = debut_semaine + timedelta(days=6)

  # Navigation et stats
  col_prev, col_stats, col_next = st.columns([1, 8, 1])
  
  with col_prev:
    if st.button("◀", key="prev_week", help="Semaine précédente"):
      st.session_state['date_actuelle'] = date_ref - timedelta(days=7)
      st.rerun()
  
  with col_stats:
    # Stats de la semaine
    commandes_semaine = [
      c for c in commandes_filtrees 
      if debut_semaine <= to_date(c['date']) <= fin_semaine
    ]
    
    col_s1, col_s2, col_s3 = st.columns(3)
    with col_s1:
      st.metric("📦 Commandes", len(commandes_semaine))
    with col_s2:
      total_couverts = sum(c['couverts'] for c in commandes_semaine)
      st.metric("👥 Couverts", total_couverts)
    with col_s3:
      jours_actifs = len(set([c['date'] for c in commandes_semaine]))
      st.metric("📅 Jours actifs", f"{jours_actifs}/7")
  
  with col_next:
    if st.button("▶", key="next_week", help="Semaine suivante"):
      st.session_state['date_actuelle'] = date_ref + timedelta(days=7)
      st.rerun()

  st.divider()
  st.subheader(f"Semaine du {debut_semaine.strftime('%d/%m')} au {fin_semaine.strftime('%d/%m/%Y')}")

  # Afficher 7 jours
  cols = st.columns(7)
  jours_semaine = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]

  for i in range(7):
    jour = debut_semaine + timedelta(days=i)
    date_str = jour.strftime('%Y-%m-%d')
    commandes_jour = [c for c in commandes_filtrees if c['date'] == date_str]

    with cols[i]:
      # Bouton invisible couvrant toute la colonne
      if st.button(
        " ",
        key=f"day_semaine_{jour}",
        help="",
        use_container_width=True
      ):
        st.session_state['vue_actuelle'] = "🗓️ 3 jours"
        st.session_state['date_actuelle'] = jour
        st.rerun()

      # Classe CSS
      css_class = "calendar-day-cell-today" if jour == date.today() else "calendar-day-cell"

      #Semaine
      # Contenu PAR DESSUS le bouton
      html = f"""
      <div style='margin-top: -42px; pointer-events: none;'>
        <div class='calendar-day-cell {css_class}' style='min-height: 400px;'>
          <div class='calendar-header'>{jours_semaine[i]} {jour.day}</div>
      """
      
      # Badge avec nombre de commandes
      if commandes_jour:
        html += f"<div class='badge-commandes'>{len(commandes_jour)}</div>"

      # Ajouter chaque commande dans le HTML
      if commandes_jour:
          html += """
              <p style='color: #888; font-size: 0.75em; margin: -72px 0 0 0; text-align: center;'>Réduire la vue</p>
              <div style='margin-top: 50px; display: flex; flex-direction: column; align-items: center;'>
          """
          for cmd in commandes_jour:
                service_icon = "🌅" if cmd['service'] == 0 else "🌙"
                service_class = "commande-matin" if cmd['service'] == 0 else "commande-soir"
                html += f"<div class='commande-item {service_class}' style='margin: 5px 0; width: 100%' >{service_icon} {cmd['heure'][:5]}<br/>{cmd['client']}<br/>{cmd['couverts']} couv.</div>"
      else:
          html += "<p style='color: #aaa; text-align: center; font-size: 0.85em; margin-top: 40px;'>Aucune commande</p>"

      html += """
          </div>
        </div>
      </div>
      """
      st.markdown(html, unsafe_allow_html=True)

# ======== VUE 3 JOURS =======
elif vue == "🗓️ 3 jours":

  # Bouton retour vers semaine
  if st.button("⬅️ Retour à la semaine", key="retour_semaine", type="secondary"):
    st.session_state['vue_actuelle'] = "📆 Semaine"
    st.rerun()

  # Navigation et stats
  col_prev, col_stats, col_next = st.columns([1, 8, 1])
  
  with col_prev:
    if st.button("◀", key="prev_3days", help="3 jours précédents"):
      st.session_state['date_actuelle'] = date_ref - timedelta(days=3)
      st.rerun()
  
  with col_stats:
    # Stats des 3 jours
    fin_3jours = date_ref + timedelta(days=2)
    commandes_3jours = [
      c for c in commandes_filtrees 
      if date_ref <= to_date(c['date']) <= fin_3jours
    ]
    
    col_s1, col_s2 = st.columns(2)
    with col_s1:
      st.metric("📦 Commandes", len(commandes_3jours))
    with col_s2:
      total_couverts = sum(c['couverts'] for c in commandes_3jours)
      st.metric("👥 Couverts", total_couverts)
  
  with col_next:
    if st.button("▶", key="next_3days", help="3 jours suivants"):
      st.session_state['date_actuelle'] = date_ref + timedelta(days=3)
      st.rerun()

  st.divider()
  st.subheader(f"Du {date_ref.strftime('%d/%m')} au {(date_ref + timedelta(days=2)).strftime('%d/%m/%Y')}")

  cols = st.columns(3)

  for i in range(3):
    jour = date_ref + timedelta(days=i)
    date_str = jour.strftime('%Y-%m-%d')
    commandes_jour = [c for c in commandes_filtrees if c['date'] == date_str]

    with cols[i]:
      # Bouton invisible couvrant toute la colonne
      if st.button(
        " ",
        key=f"day_3_jours_{jour}",
        help="",
        use_container_width=True
      ):
        st.session_state['vue_actuelle'] = "📋 Jour"
        st.session_state['date_actuelle'] = jour
        st.rerun()

      # Classe CSS
      css_class = "calendar-day-cell-today" if jour == date.today() else "calendar-day-cell"

      # Contenu PAR DESSUS le bouton
      html = f"""
      <div style='margin-top: -42px; pointer-events: none;'>
        <div class='calendar-day-cell {css_class}' style='min-height: 500px;'>
        <div class='calendar-header'>{jour.strftime('%A %d/%m')}</div> 
      """
      
      # Badge avec nombre de commandes
      if commandes_jour:
        html += f"<div class='badge-commandes'>{len(commandes_jour)}</div>"
      


      # Ajouter les commandes
      if commandes_jour:
          html += """
              <p style='color: #888; font-size: 0.75em; margin: -72px 0 0 0; text-align: center;'>Réduire la vue</p>
              <div style='margin-top: 50px; display: flex; flex-direction: column; align-items: center;'>
          """

          for cmd in commandes_jour:
                service_icon = "🌅" if cmd['service'] == 0 else "🌙"
                service_class = "commande-matin" if cmd['service'] == 0 else "commande-soir"
                html += f"<div class='commande-item {service_class}' style='margin: 10px 0; width: 100%;'>{service_icon} {cmd['heure'][:5]}<br/>{cmd['client']}<br/>{cmd['couverts']} couverts</div>"
      else:
          html += "<p style='color: #aaa; text-align: center; font-size: 0.85em; margin-top: 40px;'>Aucune commande</p>"

      html += """      
          </div>
        </div>
      </div>
      """
      st.markdown(html, unsafe_allow_html=True)

# ======== VUE JOUR =======
elif vue == "📋 Jour":
    # Bouton retour vers 3 jours
    if st.button("⬅️ Retour au 3 jours", key="retour_3jours", type="secondary"):
        st.session_state['vue_actuelle'] = "🗓️ 3 jours"
        st.rerun()
    
    # Navigation et stats
    col_prev, col_stats, col_next = st.columns([1, 8, 1])
    
    with col_prev:
      if st.button("◀", key="prev_day", help="Jour précédent"):
        st.session_state['date_actuelle'] = date_ref - timedelta(days=1)
        st.rerun()
    
    with col_stats:
      date_str = date_ref.strftime('%Y-%m-%d')
      commandes_jour = [c for c in commandes_filtrees if c['date'] == date_str]
      
      col_s1, col_s2 = st.columns(2)
      with col_s1:
        st.metric("📦 Commandes", len(commandes_jour))
      with col_s2:
        total_couverts = sum(c['couverts'] for c in commandes_jour)
        st.metric("👥 Couverts", total_couverts)
    
    with col_next:
      if st.button("▶", key="next_day", help="Jour suivant"):
        st.session_state['date_actuelle'] = date_ref + timedelta(days=1)
        st.rerun()
    
    st.divider()
    st.subheader(f"{date_ref.strftime('%A %d %B %Y')}")
    
    date_str = date_ref.strftime('%Y-%m-%d')
    commandes_jour = [c for c in commandes_filtrees if c['date'] == date_str]
    
    # Classe CSS
    css_class = "calendar-day-cell-today" if date_ref == date.today() else "calendar-day-cell"
    
    # Contenu
    html = f"""
    <div class='calendar-day-cell {css_class}' style='min-height: 600px;'>
        <div class='calendar-header'>{date_ref.strftime('%A %d %B %Y')}</div>
        <div style='margin-top: 50px; display: flex; flex-direction: column; align-items: center;'>
    """
    
    if commandes_jour:
        # Afficher les commandes
        for cmd in commandes_jour:
            service_icon = "🌅" if cmd['service'] == 0 else "🌙"
            service_class = "commande-matin" if cmd['service'] == 0 else "commande-soir"
            html += f"<div class='commande-item {service_class}' style='margin: 10px 0; width: 100%; font-size: 2em; padding: 10px'>{service_icon} {cmd['heure'][:5]} {cmd['client']} - {cmd['couverts']} couverts</div>"
    else:
        html += "<p style='color: #888;'>Aucune commande pour ce jour</p>"
    
    html += """
        </div>
    </div>
    """
    st.markdown(html, unsafe_allow_html=True)
    
    # Détails des commandes
    if commandes_jour:
        st.divider()
        st.subheader("📋 Détails des commandes")
        
        for cmd in sorted(commandes_jour, key=lambda x: x['heure']):
            with st.expander(f"{'🌅' if cmd['service'] == 0 else '🌙'} {cmd['heure'][:5]} - {cmd['client']} ({cmd['couverts']} couverts)", expanded=False):
                col1, col2, col3 = st.columns(3)
                
                with col1:
                    st.write(f"**Client:** {cmd['client']}")
                    st.write(f"**Couverts:** {cmd['couverts']}")
                
                with col2:
                    st.write(f"**Service:** {'Matin 🌅' if cmd['service'] == 0 else 'Soir 🌙'}")
                    st.write(f"**Heure:** {cmd['heure']}")
                
                with col3:
                    st.write(f"**Date:** {cmd['date']}")

# Footer avec infos
st.divider()
col_info1, col_info2 = st.columns(2)
with col_info1:
    st.info(f"📊 Total général : {len(commandes)} commandes | {sum(c['couverts'] for c in commandes)} couverts")
with col_info2:
    if filtre_service or filtre_client:
        st.warning(f"⚠️ Filtres actifs : {len(commandes_filtrees)} commandes affichées")