# pages/ 03_commandes
import streamlit as st
from datetime import date, time, timedelta
from datetime import date as date_type
import sys
from pathlib import Path
import calendar

# Pour la première page faire apparaitre un calendrier qui peut passer de mois, à semaine, à 3 jours à jours en particulier
# Affichage comme sur un carnet outlook.

# ========================================
# 🔐 PROTECTION PAR MOT DE PASSE
# ========================================
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

from auth import check_password

if not check_password():
    st.stop()

# ======================================== 

# Ajouter le chemin parent pour importer database 
sys.path.append(str(Path(__file__).parent.parent))

from database import (
  get_commandes, 
  create_commande, 
  delete_commande,
  update_commande, 
  get_commande_details,
  add_formule_to_commande, 
  add_produit_to_commande,
  remove_produit_from_commande,
  update_quantite_produit_commande,
  get_formules,
  get_produits,
  get_unites,
  archiver_commande,
  get_archives,
  init_db_if_needed,
  get_produits_formule_avec_calcul
)

# ========================================
# 🔐 PROTECTION PAR MOT DE PASSE
# ========================================
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

from auth import check_password

if not check_password():
    st.stop()

# Configuration
st.set_page_config(page_title="Commandes", page_icon="📝", layout="wide")

# Initialiser la base 
init_db_if_needed()

# Titre
st.title("📝 Carnet de Commandes")

# Archivage automatique des commandes de plus d'une semaine
def archiver_commandes_anciennes():
    """Archive automatiquement les commandes passées de plus d'une semaine"""
    commandes = get_commandes()
    date_limite = (date.today() - timedelta(days=7))
    
    commandes_a_archiver = []
    for c in commandes:
       cmd_date = c['date'] if isinstance(c['date'], date_type) else date_type.fromisoformat(str(c['date']))
       if cmd_date < date_limite:
          commandes_a_archiver.append(c)
    
    for cmd in commandes_a_archiver:
        archiver_commande(cmd['id'], statut="Auto-archivée")
    
    return len(commandes_a_archiver)

# Exécuter l'archivage automatique au chargement de la page
nb_archivees = archiver_commandes_anciennes()
if nb_archivees > 0:
    st.toast(f"✅ {nb_archivees} commande(s) archivée(s) automatiquement", icon="📦")

# Tabs
tab1, tab2, tab3 = st.tabs(["📋 Commandes actives", "➕ Nouvelle commande", "📦 Archives"])


# ============== TAB 1 : Commandes Actives ============
# ============== TAB 1 : Commandes Actives (AVEC 3 SECTIONS) ============
# À copier-coller pour remplacer le contenu du "with tab1:" dans ton fichier

with tab1:
  commandes = get_commandes()

  if commandes:
    # Catégoriser les commandes
    aujourd_hui = date.today()
    dans_3jours = aujourd_hui + timedelta(days=3)
    
    aujourd_hui_str = aujourd_hui.strftime('%Y-%m-%d')
    dans_3jours_str = dans_3jours.strftime('%Y-%m-%d')
    
    # Séparer en 3 catégories
    commandes_a_faire = []  # Aujourd'hui jusqu'à J+3
    commandes_a_venir = []   # Après J+3
    commandes_passees = []   # Avant aujourd'hui
    
    for c in commandes:
        if str(c['date']) < aujourd_hui_str:
            commandes_passees.append(c)
        elif str(c['date']) <= dans_3jours_str:
            commandes_a_faire.append(c)
        else:
            commandes_a_venir.append(c)
    
    # Trier chaque catégorie par date
    commandes_a_faire = sorted(commandes_a_faire, key=lambda x: (x['date'], x['heure']))
    commandes_a_venir = sorted(commandes_a_venir, key=lambda x: (x['date'], x['heure']))
    commandes_passees = sorted(commandes_passees, key=lambda x: (x['date'], x['heure']), reverse=True)
    
    # Alerte pour commandes urgentes
    commandes_aujourdhui = [c for c in commandes_a_faire if str(c['date']) == aujourd_hui_str]
    if commandes_aujourdhui:
        st.error(f"🔔 **{len(commandes_aujourdhui)} commande(s) AUJOURD'HUI** à préparer !", icon="🚨")
    
    # Filtres globaux en haut
    col1, col2, col3 = st.columns([3, 2, 2])
    with col1:
      search = st.text_input("🔍 Rechercher un client", key="search_cmd")
    with col2:
      filtre_service = st.selectbox("Service", ["Tous", "Matin", "Soir"], key="filtre_service")
    with col3:
      affichage = st.selectbox("Affichage", ["Toutes les sections", "À faire uniquement", "À venir uniquement", "Passées uniquement"], key="affichage_sections")
    
    st.divider()
    
    # Fonction pour appliquer les filtres
    def appliquer_filtres(commandes_liste):
        filtrees = commandes_liste
        
        if search:
            filtrees = [c for c in filtrees if search.lower() in c['client'].lower()]
        
        if filtre_service == "Matin":
            filtrees = [c for c in filtrees if c['service'] == 0]
        elif filtre_service == "Soir":
            filtrees = [c for c in filtrees if c['service'] == 1]
        
        return filtrees
    
    # Fonction pour générer le badge de statut
    def get_badge_statut(cmd_date):
        if isinstance(cmd_date, str):
           cmd_date_obj = date.fromisoformat(cmd_date)
        else:
           cmd_date_obj = cmd_date
        delta = (cmd_date_obj - aujourd_hui).days
        
        if delta == 0:
            return "🔴 AUJOURD'HUI", "error"
        elif delta == 1:
            return "🟠 DEMAIN", "warning"
        elif delta < 0:
            return f"⚠️ Il y a {abs(delta)}j", "info"
        elif delta <= 3:
            return f"🟡 Dans {delta}j", "warning"
        else:
            return f"📅 Dans {delta}j", "success"
    
    # Fonction pour afficher une commande
    def afficher_commande(cmd):
        service_icon = "🌅" if cmd['service'] == 0 else "🌙"
        badge_text, badge_type = get_badge_statut(str(cmd['date']))
        
        # Colorer différemment selon le statut
        if badge_type == "error":
            title_prefix = "🔴"
        elif badge_type == "warning":
            title_prefix = "🟠"
        elif "Il y a" in badge_text:
            title_prefix = "⚠️"
        else:
            title_prefix = service_icon

        with st.expander(f"{title_prefix} {cmd['client']} - {cmd['couverts']} couverts - {str(cmd['date'])} {cmd['heure']} | {badge_text}", expanded=False):
            # Infos principales avec badge
            col_badge = st.columns(1)[0]
            with col_badge:
                badge_text_display, badge_type_display = get_badge_statut(str(cmd['date']))
                if badge_type_display == "error":
                    st.error(f"**{badge_text_display}**")
                elif badge_type_display == "warning":
                    st.warning(f"**{badge_text_display}**")
                elif "Il y a" in badge_text_display:
                    st.info(f"**{badge_text_display}**")
                else:
                    st.success(f"**{badge_text_display}**")
            
            col1, col2, col3, col4 = st.columns(4)
            with col1:
              st.metric("Client", cmd['client'])
            with col2:
              st.metric("Couverts", cmd['couverts'])
            with col3:
              st.metric("Date", str(cmd['date']))
            with col4:
              st.metric("Heure", str(cmd['heure']))
            
            if cmd['notes']:
              st.info(f"📝 Notes : {cmd['notes']}")
            
            st.divider()

            # Détails de la commande
            details = get_commande_details(cmd['id'])

            # Formules
            if details['formules']:
              st.subheader("📋 Formules")
              for formule_id, formule_nom, qte_rec, qte_fin in details['formules']:
                col1, col2 = st.columns([3, 1])
                with col1:
                  st.write(f"**{formule_nom}**")
                with col2:
                  st.write(f"Qté: {qte_fin}")
                    
            # Produits individuels
            if details['produits']:
                st.subheader("📦 Produits supplémentaires")
                for produit_id, prod_nom, qte, unite_nom, unite_id in details['produits']:
                    col1, col2 = st.columns([3, 1])
                    with col1:
                        st.write(f"**{prod_nom}**")
                    with col2:
                        st.write(f"{qte} {unite_nom or ''}") 

            st.divider()

            # Actions
            col1, col2, col3 = st.columns(3)

            with col1:
              if st.button("✏️ Modifier", key=f"edit_{cmd['id']}", use_container_width=True):
                  st.session_state[f"edit_mode_{cmd['id']}"] = True
                  st.rerun()
            
            with col2:
              if st.button("📦 Archiver (Livrée)", key=f"archive_{cmd['id']}", use_container_width=True, type="primary"):
                if archiver_commande(cmd['id'], statut="Livrée"):
                  st.success("Commande archivée !")
                  st.rerun()
            
            with col3:
              if st.button("🗑️ Supprimer", key=f"del_{cmd['id']}", use_container_width=True):
                if delete_commande(cmd['id']):
                  st.success("Commande supprimée !")
                  st.rerun()
    
    # ============= SECTION 1 : À FAIRE (3 JOURS) =============
    if affichage in ["Toutes les sections", "À faire uniquement"]:
        st.header("🏃 À faire (3 prochains jours)")
        commandes_a_faire_filtrees = appliquer_filtres(commandes_a_faire)
        
        if commandes_a_faire_filtrees:
            st.write(f"**{len(commandes_a_faire_filtrees)} commande(s)** sur {len(commandes_a_faire)}")
            for cmd in commandes_a_faire_filtrees:
                afficher_commande(cmd)
        else:
            st.info("✅ Aucune commande dans les 3 prochains jours")
        
        st.divider()
    
    # ============= SECTION 2 : À VENIR (FUTUR) =============
    if affichage in ["Toutes les sections", "À venir uniquement"]:
        st.header("📅 À venir (après 3 jours)")
        commandes_a_venir_filtrees = appliquer_filtres(commandes_a_venir)
        
        if commandes_a_venir_filtrees:
            st.write(f"**{len(commandes_a_venir_filtrees)} commande(s)** sur {len(commandes_a_venir)}")
            for cmd in commandes_a_venir_filtrees:
                afficher_commande(cmd)
        else:
            st.info("Aucune commande future après 3 jours")
        
        st.divider()
    
    # ============= SECTION 3 : PASSÉES =============
    if affichage in ["Toutes les sections", "Passées uniquement"]:
        st.header("⏰ Passées (non archivées)")
        commandes_passees_filtrees = appliquer_filtres(commandes_passees)
        
        if commandes_passees_filtrees:
            st.warning(f"⚠️ **{len(commandes_passees_filtrees)} commande(s) passée(s)** sur {len(commandes_passees)} - Pensez à les archiver")
            for cmd in commandes_passees_filtrees:
                afficher_commande(cmd)
        else:
            st.success("✅ Aucune commande passée en attente")
  
  else:
    st.info("Aucune commande active. Créer-en une dans l'onglet 'Nouvelle Commande' !")

# ============== TAB 2 : NOUVELLE COMMANDE ==============
with tab2:
  st.header("Créer une nouvelle commande")

  # Vérifier si on est en mode composition
  if 'composition_mode' not in st.session_state:
    st.session_state.composition_mode = False
    st.session_state.current_commande_id = None
  
  # Si on n'est pas en mode composition, afficher le formulaire de création
  if not st.session_state.composition_mode:
    with st.form("nouvelle_commande"):
      # Informations client
      st.subheader("👤 Informations client")
      col1, col2 = st.columns(2)

      with col1:
        nom_client = st.text_input("Nom du client *", placeholder="Une entreprise qui commande plein de trucs")
        nombre_couverts = st.number_input("Nombre de couverts *", min_value=1, value=25, step=5)

      with col2:
        service = st.radio("Service", ["Matin", "Soir"], horizontal=True)
        service_value = 0 if service == "Matin" else 1

      st.divider()

      # Date et heure de livraison
      st.subheader("📅 Livraison")
      col1, col2 = st.columns(2)

      with col1:
        delivery_date = st.date_input(
          "Date de livraison *",
          value=date.today() + timedelta(days=7),
          min_value=date.today()
        )
      
      with col2:
        delivery_hour = st.time_input("Heure de livraison *", value=time(9,0))
      
      st.divider()

      # Notes 
      notes = st.text_area("📝 Notes / Instructions spéciales", placeholder="Dis nous ce qu'on doit savoir...")

      # Bouton de soumission
      submit = st.form_submit_button("✅ Créer la commande", type="primary", use_container_width=True)

      if submit:
        if nom_client:
          # Convertir date et heure en string
          date_str = delivery_date.strftime('%Y-%m-%d')
          heure_str = delivery_hour.strftime('%H:%M')

          commande_id = create_commande(
            nom_client=nom_client,
            nb_couverts = nombre_couverts,
            service = service_value,
            date = date_str,
            heure = heure_str, 
            notes = notes
          )

          if commande_id:
            st.success(f"✅ Commande créée pour {nom_client} !")
            # Passer en mode composition
            st.session_state.composition_mode = True
            st.session_state.current_commande_id = commande_id
            st.rerun()
          else:
            st.error("❌ Erreur lors de la création")
        else:
          st.warning("⚠️ Le nom du client est obligatoire")

  # MODE COMPOSITION - Ajouter formules et produits
  else:
    commande_id = st.session_state.current_commande_id
    cmd_details = get_commande_details(commande_id)

    # Récupérer les infos de la commande
    commandes = get_commandes()
    cmd_info = next((c for c in commandes if c['id'] == commande_id), None)

    if cmd_info:
      st.success(f"🎉 Commande créée pour **{cmd_info['client']}** - {cmd_info['couverts']} couverts")
      st.subheader("📋 Composer la commande")

      # Section Formules
      st.write("### 🍽️ Ajouter une formule")
      formules = get_formules()

      if formules:
        # Etat de session pour gérer l'affichage des produits
        if 'formule_en_cours' not in st.session_state:
          st.session_state.formule_en_cours = None
          st.session_state.produits_a_valider = []

        col1, col2, col3 = st.columns([3, 1, 1])

        with col1:
          formule_selectionnee = st.selectbox(
            "Choisir une formule",
            options=[(f['id'], f['nom']) for f in formules],
            format_func=lambda x: x[1],
            key="select_formule"
          )
        
        with col2:
          nb_couverts_formule = st.number_input(
            "Nombre de couverts", 
            min_value=1,
            value=cmd_info['couverts'],
            key="nb_couverts_formule",
            help="Nombre de couverts pour cette formule"
          )
        
        with col3:
          st.write("")
          st.write("")
          # Bouton pour dérouler les produits
          if st.button("📋 Voir les produits", type="secondary", use_container_width=True):
            # Récupérer les produits de la formule avec calculs
            produits_formule = get_produits_formule_avec_calcul(formule_selectionnee[0], nb_couverts_formule)
            st.session_state.formule_en_cours = {
              'id': formule_selectionnee[0],
              'nom': formule_selectionnee[1],
              'nb_couverts': nb_couverts_formule
            }
            # Initialiser les quantités finales avec les quantités recommandées
            st.session_state.produits_a_valider = [
              {
                'id': p['id'],
                'nom': p['nom'],
                'qte_recommandee': p['qte_recommandee'],
                'qte_finale': p['qte_recommandee'],
                'unite': p['unite'],
                'unite_id': p['unite_id'],
                'inclus': True
              }
              for p in produits_formule
            ]
            st.rerun()
        
        if st.session_state.formule_en_cours and st.session_state.produits_a_valider:
          st.success(f"📋 Formule: **{st.session_state.formule_en_cours['nom']}** ({st.session_state.formule_en_cours['nb_couverts']} couverts)")

          st.write("#### Ajustez les quantités avant de valider :")

          # En tête du tableau 
          col1, col2, col3, col4, col5 = st.columns([3, 2, 2, 2, 1])
          with col1:
            st.write("**Produit**")
          with col2:
            st.write("**Qté recommandée**")
          with col3:
            st.write("**Qté finale**")
          with col4:
            st.write("**Unité**")
          with col5:
            st.write("**Inclure**")
          
          st.divider()

          # Liste des produits modifiables
          produits_a_supprimer = []
          for i, prod in enumerate(st.session_state.produits_a_valider):
            col1, col2, col3, col4, col5 = st.columns([3, 2, 2, 2, 1])

            with col1:
              st.write(f"**{prod['nom']}**")
            
            with col2:
              # Afficher la quantité recommandée (non modifiable)
              st.metric("Qté recommandée", f"{prod['qte_recommandee']}", label_visibility="collapsed")

            with col3:
              # Input pour la quantité finale
              new_qte = st.number_input(
                "Qté", 
                value=float(prod['qte_finale']),
                min_value=0.0,
                step=0.5,
                key=f"qte_valid_{i}_{prod['id']}",
                label_visibility="collapsed",
                disabled=not prod['inclus']
              )
              # MAJ dans le state
              st.session_state.produits_a_valider[i]['qte_finale'] = new_qte
            
            with col4:
              st.write(prod['unite'])
            
            with col5:
              # Checkbox pour inclure/exclure
              inclus = st.checkbox(
                "✓",
                value=prod['inclus'],
                key=f"inclus_{i}_{prod['id']}",
                label_visibility="collapsed"
              )
              st.session_state.produits_a_valider[i]['inclus'] = inclus
          
          st.divider()

          # Boutons d'action
          col1, col2, col3 = st.columns([2, 2, 1])

          with col1:
            if st.button("✅ Valider et ajouter la commande", type="primary", use_container_width=True):
              # Ajouter seulement les produits inclus 
              success = True
              for prod in st.session_state.produits_a_valider:
                if prod['inclus'] and prod['qte_finale'] > 0:
                  if not add_produit_to_commande(commande_id, prod['id'], prod['qte_finale'], prod['unite_id']):
                    success = False
              
              # Ajoter la formule dans la table de liaison
              if success:
                if add_formule_to_commande(commande_id, st.session_state.formule_en_cours['id'], st.session_state.formule_en_cours['nb_couverts']):
                  st.success("🎉 Formule ajoutée avec succès !")
                  # Réinitialiser le state
                  st.session_state.formule_en_cours = None
                  st.session_state.produits_a_valider = []
                  st.rerun()
                else:
                  st.error("Erreur lors de l'ajout de la formule")
              else:
                st.error("Erreur lors de l'ajout des produits")

          with col2:
            if st.button("❌  Annuler", use_container_width=True):
              # Réinitialiser sans ajouter
              st.session_state.formule_en_cours = None
              st.session_state.produits_a_valider = []
              st.rerun()

          with col3:
            # Info sur le nombre de produits inclus
            nb_inclus= sum(1 for p in st.session_state.produits_a_valider if p['inclus'])
            st.metric("Produits", f"{nb_inclus}/{len(st.session_state.produits_a_valider)}")
      st.divider() 
                  
      # Section produits
      st.write("### 🥖 Ajouter un produit")
      produits = get_produits()
      unites = get_unites()

      if produits:
        col1, col2, col3 = st.columns([3, 1, 1])
        with col1:
          produit_selectionne = st.selectbox(
            "Choisir un produit",
            options=[(p['id'], p['nom']) for p in produits], 
            format_func=lambda x: x[1], 
            key="select_produit"
          )

        with col2:
          qte_produit = st.number_input("Quantité", min_value=0.0, value=1.0, step=0.5, key="qte_produit")
        with col3:
          unite_produit = st.selectbox(
            "Unité",
            options=[u['id'] for u in unites],
            format_func=lambda x: next((u['nom'] for u in unites if u['id'] == x), ""),
            key="unite_produit"
          )          
        
        if st.button("➕ Ajouter ce produit", type="secondary", use_container_width=True):
          if add_produit_to_commande(commande_id, produit_selectionne[0], qte_produit, unite_produit):
            st.success("Produit ajouté !")
            st.rerun()

      st.divider()

      details = {
         'formules': st.session_state.get('formules_temp', []),
         'produits': st.session_state.get('produits_temp', [])
      }

      # Afficher le récapitulatif
      st.subheader("📦 Récapitulatif de la commande")

      # ============= FORMULES ET LEURS PRODUITS ================
      if details['formules']:
         st.markdown("** 🍽️ Formules :**")

         for formule_id, formule_nom, qte_rec, qte_fin in details['formules']:
            # Afficher la formule
            st.markdown(f"**• {formule_nom}** : {qte_fin} couverts")

            # Récupérer et afficher les produits de cette formule
            produits_formule = get_produits(formule_nom, qte_fin)
            
            if produits_formule:
               for prod in produits_formule:
                  st.markdown(f" └─ {prod['produit']} : {prod['quantite_finale']} {prod['unite']}")
            
            st.write("") # Espace entre les formules
      
      # ============ PRODUITS SUPPLÉMENTAIRES ============
      if details['produits']:
         st.markdown("** 📦 Produits supplémentaires :**")

         for prod in details['produit']:
          prod_id, prod_nom, qte, unite_id, unite_nom = prod
          st.markdown(f"• {prod_nom} : {qte} {unite_nom}")

      st.write(" 📦 Récapitulatif de la commande")

      details = get_commande_details(commande_id)

      if details['formules']:
        st.write("**Formules :**")
        for formule_id, formule_nom, qte_rec, qte_fin in details['formules']:
          st.write(f"- {formule_nom} : {qte_fin} couverts (reçu: {qte_rec})")
            
      if details['produits']:
          st.write("**Produits supplémentaires :**")
          # Maintenant produits contient : (produit_id, nom, quantite, unite_nom, unite_id)
          for produit_id, prod_nom, qte, unite_nom, unite_id in details['produits']:
              st.write(f"- {prod_nom} : {qte} {unite_nom or ''}")

      if not details['formules'] and not details['produits']:
        st.info("Aucune formule ou produit ajouté pour le moment")
      
      st.divider()

      # Bouton pour terminer 
      col1, col2 = st.columns(2)
      with col1:
        if st.button("✅ Terminer et voir toutes les commandes", type="primary", use_container_width=True):
          st.session_state.composition_mode = False
          st.session_state.current_commande_id = None
          st.rerun()
      with col2:
        if st.button("↩️ Continuer plus tard", use_container_width=True):
          st.session_state.composition_mode = False
          st.session_state.current_commande_id = None
          st.rerun()

# ============== TAB 3 : ARCHIVES ==============
with tab3:
  st.header("📦 Commandes Archivées")
  
  # Récupérer les commandes archivées
  commandes_archivees = get_archives()
  
  if commandes_archivees:
    # Filtres pour archives
    col1, col2, col3 = st.columns([3, 2, 2])
    with col1:
      search_archive = st.text_input("🔍 Rechercher dans les archives", key="search_archive")
    with col2:
      filtre_statut = st.selectbox("Statut", ["Tous", "Livrée", "Auto-archivée", "Annulée"], key="filtre_statut")
    with col3:
      tri_archive = st.selectbox("Trier par", ["Date archivage (récent)", "Date archivage (ancien)", "Date livraison", "Client (A-Z)"], key="tri_archive")
    
    # Appliquer filtres
    commandes_filtrees_archive = commandes_archivees
    
    if search_archive:
      commandes_filtrees_archive = [c for c in commandes_filtrees_archive if search_archive.lower() in c['client'].lower()]
    
    if filtre_statut != "Tous":
      commandes_filtrees_archive = [c for c in commandes_filtrees_archive if c['statut'] == filtre_statut]
    
    # Appliquer tri
    if tri_archive == "Date archivage (récent)":
      commandes_filtrees_archive = sorted(commandes_filtrees_archive, key=lambda x: x['date_archivage'], reverse=True)
    elif tri_archive == "Date archivage (ancien)":
      commandes_filtrees_archive = sorted(commandes_filtrees_archive, key=lambda x: x['date_archivage'])
    elif tri_archive == "Date livraison":
      commandes_filtrees_archive = sorted(commandes_filtrees_archive, key=lambda x: x['date'], reverse=True)
    elif tri_archive == "Client (A-Z)":
      commandes_filtrees_archive = sorted(commandes_filtrees_archive, key=lambda x: x['client'])
    
    st.write(f"**{len(commandes_filtrees_archive)} commande(s) archivée(s)** sur {len(commandes_archivees)}")
    st.divider()
    
    # Afficher les commandes archivées
    for cmd in commandes_filtrees_archive:
      statut_icon = "✅" if cmd['statut'] == "Livrée" else "🤖" if cmd['statut'] == "Auto-archivée" else "❌"
      
      with st.expander(f"{statut_icon} {cmd['client']} - {cmd['couverts']} couverts - {str(cmd['date'])} [{cmd['statut']}]", expanded=False):
        
        # Infos principales
        col1, col2, col3, col4 = st.columns(4)
        with col1:
          st.metric("Client", cmd['client'])
        with col2:
          st.metric("Couverts", cmd['couverts'])
        with col3:
          st.metric("Date livraison", str(cmd['date']))
        with col4:
          st.metric("Statut", cmd['statut'])
        
        # Date d'archivage
        st.info(f"📦 Archivée le : {cmd['date_archivage']}")
        
        st.divider()
        
        # Récupérer les détails depuis les tables d'archives
        # Note: Il faudra créer une fonction get_archive_details(archive_id) dans database.py
        try:
          from database import get_archive_details
          details = get_archive_details(cmd['id'])
          
          # Formules archivées
          if details.get('formules'):
            st.subheader("📋 Formules")
            for formule in details['formules']:
              formule_nom, qte_rec, qte_fin = formule
              col1, col2 = st.columns([3, 1])
              with col1:
                st.write(f"**{formule_nom}**")
              with col2:
                st.write(f"Qté: {qte_fin}")
          
          # Produits archivés
          if details.get('produits'):
            st.subheader("📦 Produits supplémentaires")
            for prod in details['produits']:
              prod_nom, qte_finale, unite = prod
              col1, col2 = st.columns([3, 1])
              with col1:
                st.write(f"**{prod_nom}**")
              with col2:
                st.write(f"{qte_finale} {unite}")
        
        except ImportError:
          st.warning("📦 Fonction get_archive_details() à créer dans database.py pour afficher les détails")
        
        st.divider()
        
        # Actions
        col1, col2 = st.columns(2)
        with col1:
          st.info("ℹ️ Les archives sont en lecture seule")
        with col2:
          if st.button("🗑️ Supprimer définitivement", key=f"del_archive_{cmd['id']}", use_container_width=True):
            # Note: Il faudra créer delete_archive(archive_id) dans database.py
            st.warning("📦 Fonction delete_archive() à créer dans database.py")
  
  else:
    st.info("📭 Aucune commande archivée pour le moment.")
    st.write("Les commandes seront automatiquement archivées 7 jours après leur date de livraison.")


# Statistiques 
st.divider()
commandes = get_commandes()
aujourd_hui_str = date.today().strftime('%Y-%m-%d')
commandes_aujourdhui = [c for c in commandes if str(c['date']) == aujourd_hui_str]
commandes_futures = [c for c in commandes if str(c['date']) > aujourd_hui_str]
commandes_semaine = [c for c in commandes if aujourd_hui_str <= str(c['date']) <= (date.today() + timedelta(days=7)).strftime('%Y-%m-%d')]

col1, col2, col3, col4 = st.columns(4)

with col1:
  st.metric("📋 Commandes actives", len(commandes))

with col2:
  st.metric("🔴 Aujourd'hui", len(commandes_aujourdhui))

with col3:
  st.metric("📅 Cette semaine", len(commandes_semaine))

with col4:
  total_couverts = sum(c['couverts'] for c in commandes)
  st.metric("👥 Total couverts", total_couverts)