# pages/ 04_production.py
import streamlit as st
from datetime import date, timedelta
from collections import defaultdict
import sys
from pathlib import Path

# Ajouter le chemin parent pour importer database
sys.path.append(str(Path(__file__).parent.parent))

from database import (
  get_commandes,
  get_commande_details,
  get_categories,
  get_produit_by_id,
  init_db_if_needed
)

# Configuration
st.set_page_config(page_title="Planning Production", page_icon="📊", layout="wide")

# Initialiser la base 
init_db_if_needed()

# Titre
st.title("📊 Planning de production")

# ======= FILTRES DE PÉRIODES ==========
st.subheader("Période de production")

col1, col2, col3 = st.columns([2, 2, 1])

with col1:
  date_debut = st.date_input(
    "Date de début",
    value=date.today(),
    key="date_debut_prod"
  )

with col2:
  # Sélection de vue
  vue = st.selectbox(
    "Vue",
    ["Jour", "3 jours", "Semaine"],
    key="vue_prod"
  )

with col3:
  st.write("")
  st.write("")
  # Bouton pour générer le planning
  if st.button("🔄 Générer le planning", type="primary", use_container_width=True):
    st.session_state.generer_planning = True

# Calculer la date de fin selon la vue
if vue == "Jour":
  date_fin = date_debut
  nb_jours = 1
elif vue == "3 jours":
  date_fin = date_debut + timedelta(days=2)
  nb_jours = 3
else : # Semaine
  date_fin = date_debut + timedelta(days=6)
  nb_jours = 7

st.info(f"📅 Période: du {date_debut.strftime('%d/%m/%Y')} au {date_fin.strftime('%d/%m/%Y')}")

if st.session_state.get('generer_planning', False):
  st.divider()

  # =============== RÉCUPÉRATION ET TRAITEMENT DES DONNÉES ===============

  # Récupérer toutes les commandes
  toutes_commandes = get_commandes()

  # Filtrer les commandes dans la période
  commandes_periode = []
  for cmd in toutes_commandes:
    cmd_date = date.fromisoformat(cmd['date'])
    if date_debut <= cmd_date <= date_fin:
      commandes_periode.append({
        **cmd,
        'date_obj': cmd_date
      })

  # Trier par date et heure
  commandes_periode = sorted(commandes_periode, key=lambda x: (x['date_obj'], x['heure']))

  if not commandes_periode:
    st.warning("Aucune commande dans cette période")
    st.stop()

  st.success(f"✅ {len(commandes_periode)} commande(s) trouvée(s) dans la période")

  # =============== ORGANISER LES DONNÉES ============

  # Structure : {jour: {commande_id: {nom_client, produits}}}
  planning = defaultdict(lambda: defaultdict(dict))

  # Structure : {categorie: {produit_nom: {jour: {commande_id: quantité}}}}
  produits_par_categorie = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: defaultdict(float))))

  # Liste de tous les produits avec leur catégorie
  tous_produits = set()

  for cmd in commandes_periode:
    jour = cmd['date_obj'].strftime('%Y-%m-%d')
    jour_affichage = cmd['date_obj'].strftime('%d/%m')

    # Récupérer le détail de la commande
    details = get_commande_details(cmd['id'])

    # Stocker les infos de la commande
    planning[jour][cmd['id']] = {
      'client': cmd['client'],
      'couverts': cmd['couverts'],
      'heure': cmd['heure'],
      'jour_affichage': jour_affichage
    }

    # Traiter les produits de la commande
    if details['produits']:
      for produit_id, prod_nom, qte, unite_nom, unite_id in details['produits']:
        # Récupérer la catégorie du produit 
        produit_info = get_produit_by_id(produit_id)
        categorie = produit_info['categorie'] if produit_info else "Sans catégorie"

        produits_par_categorie[categorie][prod_nom][jour][cmd['id']] = {
          'quantite': qte,
          'unite': unite_nom or ''
        }
        tous_produits.add((categorie, prod_nom))

  # ================= AFFICHAGE DU TABLEAU ==============

  st.subheader("📋 Plan de production")

  # Créer la liste des jours dans la période 
  jours_liste = []
  date_courante = date_debut
  for i in range(nb_jours):
    jour_str = date_courante.strftime('%Y-%m-%d')
    jour_affichage = date_courante.strftime('%d/%m\n%A')
    jours_liste.append({
      'date' : jour_str,
      'affichage': jour_affichage
    })
    date_courante += timedelta(days=1)

  # Afficher par catégorie
  categories = get_categories()

  if not categories:
    st.warning("⚠️ Aucune catégorie définie. Créez des catégories dans la page Produits.")

  # Grouper les produits sans catégorie
  produits_sans_categorie = [p for cat, p in tous_produits if cat == "Sans catégorie"]

  # Pour chaque catégorie
  for categorie in sorted(produits_par_categorie.keys()):
    with st.expander(f"📦 {categorie}", expanded=True):

      # Créer le tableau HTML
      html_table = "<table style='width:100%; border-collapse: collapse; font-size: 12px;'>"

      # En-tête : Jours et Commandes
      html_table += "<thead><tr style='background-color: #f0f2f6;'>"
      html_table += "<th style='border: 1px solid #ddd; padding: 8px; text-align: left;'>Produit</th>"

      for jour_info in jours_liste:
        jour = jour_info['date']
        jour_affichage = jour_info['affichage']

        # Compter le nombre de commande ce jour-là 
        nb_commandes = len(planning.get(jour, {}))

        if nb_commandes > 0:
          # Créer une colonne par commande 
          commandes_jour = planning[jour]
          html_table += f"<th colspan='{nb_commandes}' style='border: 1px solid #ddd; padding: 8px; text-align: center; background-color: #e8f4f8;'>{jour_affichage}</th>"
        else:
          html_table += f"<th style='border: 1px solid #ddd; padding: 8px; text-align: center; background-color: #f8f9fa;'>{jour_affichage}<br/>-</th>"
    
      html_table += "</tr>"

      # Sous-en-tête : Noms des clients
      html_table += "<tr style='background-color: #f8f9fa;'>"
      html_table += "<th style='border: 1px solid #ddd; padding: 4px'></th>"

      for jour_info in jours_liste:
        jour = jour_info['date']
        commandes_jour = planning.get(jour, {})

        if commandes_jour:
          for cmd_id, cmd_info in commandes_jour.items():
            html_table += f"<th style='border: 1px solid #ddd; padding: 4px; font-size: 10px; text-align: center;'>{cmd_info['client']}<br/>{cmd_info['heure']}</th>"
        else:
          html_table += "<th style='border: 1px solid #ddd; padding: 4px;'>-</th>"

      html_table += "</tr></thead>"

      # Corps du tableau: Produits
      html_table += "<tbody>"

      produits_categorie = sorted(produits_par_categorie[categorie].keys())

      for prod_nom in produits_categorie:
        html_table += "<tr>"
        html_table += f"<td style='border: 1px solid #ddd; padding: 8px; font-weight: bold;'>{prod_nom}</td>"

        # Total pour ce produit
        total_produit = 0
        
        for jour_info in jours_liste:
          jour = jour_info['date']
          commandes_jour = planning.get(jour, {})

          if commandes_jour: 
            for cmd_id in commandes_jour.keys():
              # Vérifier si ce produit est dans cette commande 
              if cmd_id in produits_par_categorie[categorie][prod_nom].get(jour, {}):
                info = produits_par_categorie[categorie][prod_nom][jour][cmd_id]
                qte = info['quantite']
                unite = info['unite']
                total_produit += qte
                html_table += f"<td style='border: 1px solid #ddd; padding: 8px; text-align: center; background-color: #e8f5e9;'>{qte} {unite}</td>"
              else:
                html_table += "<td style='border: 1px solid #ddd; padding: 8px; text-align: center;'>-</td>"
          else:
            html_table += "<td style='border: 1px solid #ddd; padding: 8px; text-align: center;'>-</td>"
        
        html_table += "</tr>"
      
      html_table += "</tbody></table>"

      # Afficher le tableau
      st.markdown(html_table, unsafe_allow_html=True)

      st.write("")

  st.divider()

  # ============== STATISTIQUES ==============
  st.subheader("📈 Statistiques")

  col1, col2, col3 = st.columns(3)

  with col1:
    st.metric("Commandes totales", len(commandes_periode))

  with col2:
    total_couverts = sum(cmd['couverts'] for cmd in commandes_periode)
    st.metric("Couverts totaux", total_couverts)

  with col3:
    nb_produits_uniques = len(tous_produits)
    st.metric("Produits différents", nb_produits_uniques)

  st.divider()

  # ============== EXPORT EXCEL (À VENIR) ==============
  st.subheader("💾 Export")

  col1, col2 = st.columns([3, 1])

  with col1:
    st.info("📊 La fonctionnalité d'export Excel sera disponible prochainement")

  with col2:
    st.button("📥 Exporter en Excel", disabled=True, use_container_width=True)