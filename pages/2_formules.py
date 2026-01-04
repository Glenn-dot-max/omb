#pages/2_formules.py
import streamlit as st
import sys
from pathlib import Path

from database import (
  get_formules,
  get_all_formules_with_details,
  create_formule,
  delete_formule,
  get_formule_details,
  add_produit_to_formule,
  remove_produit_from_formule,
  update_quantite_in_formule,
  get_produits,
  get_unites,
  init_db_if_needed
)

# Configuration
st.set_page_config(page_title="Formules", page_icon="📋", layout="wide")

# Initialiser la base
init_db_if_needed()

# Titre
st.title("📋 Gestion des Formules")

# ======== CRÉER UNE FORMULE ===========
# Initialiser le mode composition
if 'composition_formule_mode' not in st.session_state:
    st.session_state.composition_formule_mode = False
    st.session_state.current_formule_id = None

# Si on n'est pas en mode composition, afficher le formulaire de création
if not st.session_state.composition_formule_mode:
    with st.expander("➕ Créer une nouvelle formule"):
        col1, col2 = st.columns([4, 1])

        with col1:
            nom_formule = st.text_input("Nom de la formule", placeholder="Ex: Menu Petit-déjeuner")

        with col2:
            st.write("")
            st.write("")
            if st.button("Créer", type="primary", use_container_width=True):
                if nom_formule:
                    formule_id = create_formule(nom_formule)
                    if formule_id:
                        st.success(f"✅ Formule '{nom_formule}' créée !")
                        st.session_state.composition_formule_mode = True
                        st.session_state.current_formule_id = formule_id
                        st.rerun()
                    else:
                        st.error("❌ Cette formule existe déjà")
                else:
                    st.warning("⚠️ Entrez un nom")

# MODE COMPOSITION - Ajouter les produits à la nouvelle formule
else:
    formule_id = st.session_state.current_formule_id
    
    # Récupérer les infos de la formule
    formules = get_formules()
    formule_info = next((f for f in formules if f['id'] == formule_id), None)
    
    if formule_info:
        st.success(f"🎉 Formule créée : **{formule_info['nom']}**")
        st.subheader("📋 Composer la formule")
        
        # Section : Ajouter des produits
        st.write("### 🥖 Ajouter des produits")
        
        produits = get_produits()
        unites = get_unites()
        
        if produits and unites:
            col1, col2, col3, col4 = st.columns([3, 2, 2, 1])
            
            with col1:
                produit_options = [f"{p['nom']} ({p['categorie'] or 'N/A'})" for p in produits]
                selected_prod_display = st.selectbox(
                    "🔎 Produit (tapez pour filtrer)",
                    options=produit_options,
                    key=f"prod_select_new",
                    help="Tapez directement dans la liste pour rechercher"
                )
                selected_prod_id = produits[produit_options.index(selected_prod_display)]['id']
            
            with col2:
                quantite = st.number_input(
                    "Quantité par personne",
                    min_value=0.0,
                    value=1.0,
                    step=0.5,
                    key=f"qty_add_new"
                )
            
            with col3:
                unite_options = [u['nom'] for u in unites]
                selected_unite = st.selectbox(
                    "Unité",
                    options=unite_options,
                    key=f"unite_select_new"
                )
                selected_unite_id = unites[unite_options.index(selected_unite)]['id']
            
            with col4:
                st.write("")
                st.write("")
                if st.button("➕ Ajouter", key=f"add_btn_new", use_container_width=True, type="primary"):
                    if add_produit_to_formule(formule_id, selected_prod_id, quantite, selected_unite_id):
                        st.success("✅ Produit ajouté !")
                        st.rerun()
                    else:
                        st.error("❌ Ce produit est déjà dans la formule")
        else:
            st.warning("⚠️ Créez d'abord des produits et des unités")
        
        st.divider()
        
        # Afficher le récapitulatif de la formule en cours
        st.write("### 📦 Récapitulatif de la formule")
        
        details = get_formule_details(formule_id)
        
        if details:
            col1, col2, col3, col4 = st.columns([3, 2, 2, 1])
            with col1:
                st.write("**Produit**")
            with col2:
                st.write("**Quantité**")
            with col3:
                st.write("**Unité**")
            with col4:
                st.write("")
            
            st.divider()
            
            for item in details:
                col1, col2, col3, col4 = st.columns([3, 2, 2, 1])
                
                with col1:
                    st.write(item['nom'])
                
                with col2:
                    st.write(item['quantite'])
                
                with col3:
                    st.write(item['unite'])
                
                with col4:
                    if st.button("🗑️", key=f"del_prod_new_{item['produit_id']}"):
                        if remove_produit_from_formule(formule_id, item['produit_id']):
                            st.success("Retiré !")
                            st.rerun()
        else:
            st.info("Aucun produit ajouté pour le moment")
        
        st.divider()
        
        col1, col2 = st.columns(2)
        with col1:
            if st.button("✅ Terminer et voir toutes les formules", type="primary", use_container_width=True):
                st.session_state.composition_formule_mode = False
                st.session_state.current_formule_id = None
                st.balloons()
                st.rerun()
        with col2:
            if st.button("↩️ Continuer plus tard", use_container_width=True):
                st.session_state.composition_formule_mode = False
                st.session_state.current_formule_id = None
                st.rerun()

st.divider()

# Afficher la liste seulement si on n'est pas en mode composition
if not st.session_state.composition_formule_mode:
    # ============= LISTE DES FORMULES ============
    # ⚡ OPTIMISATION : Charger TOUTES les formules avec détails en 1 requête
    formules_with_details = get_all_formules_with_details()
    formules = list(formules_with_details.values())

    if formules:
      # Barre de recherche
      col1, col2 = st.columns([3, 1])
      
      with col1: 
        search_formule = st.text_input("🔎 Rechercher une formule", key="search_formule")

      with col2:
        tri = st.selectbox("Trier par", ["Nom (A-Z)", "Nom (Z-A)", "Plus récent", "Plus ancien"], key="tri_formule")

      # Filtrer les formules 
      if search_formule:
        formules_filtrees = [f for f in formules if search_formule.lower() in f['nom'].lower()]

        if not formules_filtrees:
          st.warning(f"Aucune formule trouvée pour '{search_formule}'")

          suggestions = []
          for f in formules:
            nom = f['nom'].lower()
            if len(set(search_formule.lower()) & set(nom)) >= 3:
              suggestions.append(f['nom'])
          
          if suggestions:
            st.info(f"💡 Suggestions : {', '.join(suggestions[:3])}")  

      else:
        formules_filtrees = formules

      # Appliquer le tri
      if tri == "Nom (A-Z)":
          formules_filtrees = sorted(formules_filtrees, key=lambda x: x['nom'])
      elif tri == "Nom (Z-A)":
          formules_filtrees = sorted(formules_filtrees, key=lambda x: x['nom'], reverse=True)
      elif tri == "Plus récent":
          formules_filtrees = sorted(formules_filtrees, key=lambda x: x['date_creation'], reverse=True)
      elif tri == "Plus ancien":
          formules_filtrees = sorted(formules_filtrees, key=lambda x: x['date_creation'])

      # ============= PAGINATION =============
      formules_par_page = 10
      total_formules = len(formules_filtrees)
      total_pages = max(1, (total_formules + formules_par_page - 1) // formules_par_page)

      # Initialiser la page si nécessaire
      if 'page_formules' not in st.session_state:
          st.session_state.page_formules = 1
      
      # Réinitialiser à la page 1 si on filtre/trie
      if 'last_search' not in st.session_state:
          st.session_state.last_search = ""
      if 'last_tri' not in st.session_state:
          st.session_state.last_tri = ""
      
      if search_formule != st.session_state.last_search or tri != st.session_state.last_tri:
          st.session_state.page_formules = 1
          st.session_state.last_search = search_formule
          st.session_state.last_tri = tri

      # S'assurer que la page est dans les limites
      if st.session_state.page_formules > total_pages:
          st.session_state.page_formules = total_pages
      if st.session_state.page_formules < 1:
          st.session_state.page_formules = 1

      # Afficher les infos de pagination
      st.write(f"**{total_formules} formule(s)** - Page {st.session_state.page_formules}/{total_pages}")

      # Boutons de navigation
      col1, col2, col3 = st.columns([1, 2, 1])
      
      with col1:
          if st.button("⬅️ Précédent", disabled=st.session_state.page_formules == 1, use_container_width=True):
              st.session_state.page_formules -= 1
              st.rerun()
      
      with col2:
          # Afficher le numéro de page
          st.markdown(f"<div style='text-align: center; padding: 10px;'>Page <b>{st.session_state.page_formules}</b> sur <b>{total_pages}</b></div>", unsafe_allow_html=True)
      
      with col3:
          if st.button("Suivant ➡️", disabled=st.session_state.page_formules == total_pages, use_container_width=True):
              st.session_state.page_formules += 1
              st.rerun()

      st.divider()

      # Calculer les indices pour la page courante
      debut = (st.session_state.page_formules - 1) * formules_par_page
      fin = min(debut + formules_par_page, total_formules)
      
      # Afficher SEULEMENT les formules de la page courante
      formules_a_afficher = formules_filtrees[debut:fin]

      for formule in formules_a_afficher:
        formule_id = formule['id']
        nom_formule = formule['nom']
        details = formule['produits']  # ⚡ Déjà chargés !
        
        with st.expander(f"📋 {nom_formule} ({len(details)} produits)", expanded=False):

          if details:
            st.subheader("Produits dans cette formule")

            col1, col2, col3, col4, col5 = st.columns([3, 2, 2, 1, 1])
            with col1:
              st.write("**Produit**")
            with col2:
              st.write("**Quantité**")
            with col3: 
              st.write("**Unité**")
            with col4:
              st.write("")
            with col5:
              st.write("")
            
            st.divider()

            for item in details:
              col1, col2, col3, col4, col5 = st.columns([3, 2, 2, 1, 1])

              with col1:
                st.write(item['nom'])
              
              with col2:
                new_qty = st.number_input(
                  "Quantité",
                  value=float(item['quantite']),
                  min_value=0.0, 
                  step=0.5,
                  key=f"qty_{formule_id}_{item['produit_id']}",
                  label_visibility="collapsed"
                )
                if new_qty != item['quantite']:
                  if update_quantite_in_formule(formule_id, item['produit_id'], new_qty):
                    st.rerun()
              
              with col3:
                st.write(item['unite'])
              
              with col4:
                st.write(f"{new_qty} {item['unite']}")
              
              with col5:
                if st.button("🗑️", key=f"del_prod_{formule_id}_{item['produit_id']}"):
                  if remove_produit_from_formule(formule_id, item['produit_id']):
                    st.success("Retiré !")
                    st.rerun()
            
          else:
            st.info("Aucun produit dans cette formule")

          st.divider()

          # ============= AJOUTER UN PRODUIT ==========
          st.subheader("➕ Ajouter un produit")

          produits = get_produits()
          unites = get_unites()

          if produits and unites:
            col1, col2, col3, col4 = st.columns([3, 2, 2, 1])

            with col1:
                produit_options = [f"{p['nom']} ({p['categorie'] or 'N/A'})" for p in produits]
                selected_prod_display = st.selectbox(
                    "🔎 Produit (tapez pour filtrer)",
                    options=produit_options,
                    key=f"prod_select_{formule_id}",
                    help="Tapez directement dans la liste pour rechercher"
                )
                selected_prod_id = produits[produit_options.index(selected_prod_display)]['id']

            with col2: 
              quantite = st.number_input(
                "Quantité",
                min_value=0.0,
                value=1.0,
                step=0.5,
                key=f"qty_add_{formule_id}"
              )
            
            with col3:
              unite_options = [u['nom'] for u in unites]
              selected_unite = st.selectbox(
                "Unité",
                options=unite_options,
                key=f"unite_select_{formule_id}"
              )
              selected_unite_id = unites[unite_options.index(selected_unite)]['id']
            
            with col4:
              st.write("")
              st.write("")
              if st.button("Ajouter", key=f"add_btn_{formule_id}", use_container_width=True):
                if add_produit_to_formule(formule_id, selected_prod_id, quantite, selected_unite_id):
                  st.success("✅ Produit ajouté !")
                  st.rerun()
                else:
                  st.error("❌ Ce produit est déjà dans la formule")
          else:
            st.warning("⚠️ Créez d'abord des produits et des unités")

          if st.button(f"🗑️ Supprimer la formule '{nom_formule}'", key=f"del_formule_{formule_id}", type="secondary"):
            if delete_formule(formule_id):
              st.success("Formule supprimée !")
              st.rerun()

    else:
      st.info("Aucune formule. Créez-en une ci-dessus !")

    # Statistiques 
    st.divider()
    col1, col2 = st.columns(2)
    with col1:
      st.metric("Total Formules", len(formules))
    with col2:
      total_produits = sum(len(f['produits']) for f in formules)
      st.metric("Total Produits dans formules", total_produits)