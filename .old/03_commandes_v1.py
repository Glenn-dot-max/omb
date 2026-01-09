# pages/03_Commandes.py
import streamlit as st
from datetime import date, time, timedelta, datetime as _datetime, time as _time
import sys
from pathlib import Path
import calendar

# Add parent path once so we can import local modules
sys.path.append(str(Path(__file__).parent.parent))

# ========================================
# 🔐 PROTECTION PAR MOT DE PASSE (single block)
# ========================================
from auth import check_password

if not check_password():
    st.stop()

# ======================================== 

# Import database functions
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

# Configuration
st.set_page_config(page_title="Commandes", page_icon="📝", layout="wide")

# Initialiser la base 
init_db_if_needed()

# Title
st.title("📝 Carnet de Commandes")

# --- Helpers -----------------------------------------------------------------
def safe_date_from(value):
    """Return a date object from a date or an ISO-string. Returns None if invalid."""
    if value is None:
        return None
    if isinstance(value, date):
        return value
    try:
        return date.fromisoformat(str(value))
    except Exception:
        try:
            # try parse with datetime if includes time
            dt = _datetime.fromisoformat(str(value))
            return dt.date()
        except Exception:
            return None

def safe_time_str(value):
    """Return a time string 'HH:MM' from a time object or string. Returns '' if unknown."""
    if value is None:
        return ""
    if isinstance(value, _time):
        return value.strftime("%H:%M")
    try:
        # if stored as 'HH:MM' or time-like string
        return str(value)
    except Exception:
        return ""

def normalize_commandes(raw_commandes):
    """Normalize command entries to add 'date_obj' and 'heure_str' for safe comparisons/sorting."""
    normalized = []
    for c in raw_commandes:
        try:
            c_copy = dict(c)
            c_copy['date_obj'] = safe_date_from(c.get('date'))
            # try common keys for time
            heure_val = c.get('heure') or c.get('time') or c.get('heure_str')
            c_copy['heure_str'] = safe_time_str(heure_val)
            # ensure integer couverts if possible
            try:
                c_copy['couverts'] = int(c_copy.get('couverts', 0) or 0)
            except Exception:
                c_copy['couverts'] = 0
            normalized.append(c_copy)
        except Exception:
            # skip malformed entry but continue
            continue
    return normalized

# Caching wrappers for relatively static lists (reduces DB hits)
@st.cache_data
def cached_get_formules():
    try:
        return get_formules() or []
    except Exception:
        return []

@st.cache_data
def cached_get_produits():
    try:
        return get_produits() or []
    except Exception:
        return []

@st.cache_data
def cached_get_unites():
    try:
        return get_unites() or []
    except Exception:
        return []

# Archivage automatique des commandes de plus d'une semaine
def archiver_commandes_anciennes():
    """Archive automatiquement les commandes passées de plus d'une semaine"""
    try:
        raw_commandes = get_commandes() or []
    except Exception as e:
        st.error("Erreur lors de la récupération des commandes pour archivage.")
        return 0

    commandes = normalize_commandes(raw_commandes)
    date_limite = (date.today() - timedelta(days=7))

    commandes_a_archiver = []
    for c in commandes:
        cmd_date = c.get('date_obj')
        if cmd_date and cmd_date < date_limite:
            commandes_a_archiver.append(c)

    nb = 0
    for cmd in commandes_a_archiver:
        try:
            if archiver_commande(cmd['id'], statut="Auto-archivée"):
                nb += 1
        except Exception:
            # continue on failure for other commands
            continue

    return nb

# Exécuter l'archivage automatique au chargement de la page
nb_archivees = archiver_commandes_anciennes()
if nb_archivees > 0:
    # Use st.success instead of st.toast for compatibility
    st.success(f"✅ {nb_archivees} commande(s) archivée(s) automatiquement", icon="📦")

# Tabs
tab1, tab2, tab3 = st.tabs(["📋 Commandes actives", "➕ Nouvelle commande", "📦 Archives"])


# ============== TAB 1 : Commandes Actives ============
with tab1:
    try:
        raw_commandes = get_commandes() or []
    except Exception:
        st.error("Erreur lors de la récupération des commandes.")
        raw_commandes = []

    commandes = normalize_commandes(raw_commandes)

    if commandes:
        # Categorize commandes by date (using date_obj)
        aujourd_hui = date.today()
        dans_3jours = aujourd_hui + timedelta(days=3)

        # Séparer en 3 catégories
        commandes_a_faire = []  # Aujourd'hui jusqu'à J+3
        commandes_a_venir = []   # Après J+3
        commandes_passees = []   # Avant aujourd'hui

        for c in commandes:
            d = c.get('date_obj')
            if d is None:
                # treat unknown dates as future (or skip)
                commandes_a_venir.append(c)
                continue
            if d < aujourd_hui:
                commandes_passees.append(c)
            elif d <= dans_3jours:
                commandes_a_faire.append(c)
            else:
                commandes_a_venir.append(c)

        # Sort each category by date_obj then heure_str
        def sort_key(x):
            return (x.get('date_obj') or date.min, x.get('heure_str') or "")

        commandes_a_faire = sorted(commandes_a_faire, key=sort_key)
        commandes_a_venir = sorted(commandes_a_venir, key=sort_key)
        commandes_passees = sorted(commandes_passees, key=sort_key, reverse=True)

        # Alerte pour commandes urgentes (aujourd'hui)
        commandes_aujourdhui = [c for c in commandes_a_faire if c.get('date_obj') == aujourd_hui]
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
                filtrees = [c for c in filtrees if c.get('client') and search.lower() in c['client'].lower()]

            if filtre_service == "Matin":
                filtrees = [c for c in filtrees if c.get('service') == 0]
            elif filtre_service == "Soir":
                filtrees = [c for c in filtrees if c.get('service') == 1]

            return filtrees

        # Fonction pour générer le badge de statut (attend date_obj)
        def get_badge_statut(cmd_date_obj):
            if not cmd_date_obj:
                return "📅 Date inconnue", "info"
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
            service_icon = "🌅" if cmd.get('service') == 0 else "🌙"
            badge_text, badge_type = get_badge_statut(cmd.get('date_obj'))

            # Colorer différemment selon le statut
            if badge_type == "error":
                title_prefix = "🔴"
            elif badge_type == "warning":
                title_prefix = "🟠"
            elif "Il y a" in badge_text:
                title_prefix = "⚠️"
            else:
                title_prefix = service_icon

            date_display = str(cmd.get('date_obj')) if cmd.get('date_obj') else str(cmd.get('date') or "")
            heure_display = cmd.get('heure_str') or ""

            with st.expander(f"{title_prefix} {cmd.get('client','')} - {cmd.get('couverts',0)} couverts - {date_display} {heure_display} | {badge_text}", expanded=False):
                # Infos principales avec badge
                col_badge = st.columns(1)[0]
                with col_badge:
                    badge_text_display, badge_type_display = get_badge_statut(cmd.get('date_obj'))
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
                    st.metric("Client", cmd.get('client'))
                with col2:
                    st.metric("Couverts", cmd.get('couverts'))
                with col3:
                    st.metric("Date", date_display)
                with col4:
                    st.metric("Heure", heure_display)

                if cmd.get('notes'):
                    st.info(f"📝 Notes : {cmd['notes']}")

                st.divider()

                # Détails de la commande
                try:
                    details = get_commande_details(cmd['id']) or {'formules': [], 'produits': []}
                except Exception:
                    st.error("Erreur lors de la récupération des détails de la commande.")
                    details = {'formules': [], 'produits': []}

                # Formules
                if details.get('formules'):
                    st.subheader("📋 Formules")
                    for formule_id, formule_nom, qte_rec, qte_fin in details['formules']:
                        col1, col2 = st.columns([3, 1])
                        with col1:
                            st.write(f"**{formule_nom}**")
                        with col2:
                            st.write(f"Qté: {qte_fin}")

                # Produits individuels
                if details.get('produits'):
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
                        try:
                            if archiver_commande(cmd['id'], statut="Livrée"):
                                st.success("Commande archivée !")
                                st.rerun()
                            else:
                                st.error("Impossible d'archiver la commande.")
                        except Exception:
                            st.error("Erreur lors de l'archivage.")

                with col3:
                    if st.button("🗑️ Supprimer", key=f"del_{cmd['id']}", use_container_width=True):
                        try:
                            if delete_commande(cmd['id']):
                                st.success("Commande supprimée !")
                                st.rerun()
                            else:
                                st.error("Impossible de supprimer la commande.")
                        except Exception:
                            st.error("Erreur lors de la suppression de la commande.")

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
                delivery_hour = st.time_input("Heure de livraison *", value=time(9, 0))

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

                    try:
                        commande_id = create_commande(
                            nom_client=nom_client,
                            nb_couverts=nombre_couverts,
                            service=service_value,
                            date=date_str,
                            heure=heure_str,
                            notes=notes
                        )
                    except Exception:
                        commande_id = None

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
        if not commande_id:
            st.error("ID de commande introuvable. Retour au mode création.")
            st.session_state.composition_mode = False
            st.rerun()

        # Récupérer les infos de la commande
        try:
            raw_commandes = get_commandes() or []
        except Exception:
            raw_commandes = []

        cmd_info = next((c for c in normalize_commandes(raw_commandes) if c.get('id') == commande_id), None)

        if cmd_info:
            st.success(f"🎉 Commande créée pour **{cmd_info.get('client','')}** - {cmd_info.get('couverts',0)} couverts")
            st.subheader("📋 Composer la commande")

            # Section Formules
            st.write("### 🍽️ Ajouter une formule")
            formules = cached_get_formules()

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
                        value=cmd_info.get('couverts', 1),
                        key="nb_couverts_formule",
                        help="Nombre de couverts pour cette formule"
                    )

                with col3:
                    st.write("")
                    st.write("")
                    # Bouton pour dérouler les produits
                    if st.button("📋 Voir les produits", type="secondary", use_container_width=True):
                        # Récupérer les produits de la formule avec calculs
                        try:
                            produits_formule = get_produits_formule_avec_calcul(formule_selectionnee[0], nb_couverts_formule) or []
                        except Exception:
                            produits_formule = []
                        st.session_state.formule_en_cours = {
                            'id': formule_selectionnee[0],
                            'nom': formule_selectionnee[1],
                            'nb_couverts': nb_couverts_formule
                        }
                        # Initialiser les quantités finales avec les quantités recommandées
                        st.session_state.produits_a_valider = [
                            {
                                'id': p.get('id'),
                                'nom': p.get('nom'),
                                'qte_recommandee': p.get('qte_recommandee', 0),
                                'qte_finale': p.get('qte_recommandee', 0),
                                'unite': p.get('unite'),
                                'unite_id': p.get('unite_id'),
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
                    for i, prod in enumerate(st.session_state.produits_a_valider):
                        col1, col2, col3, col4, col5 = st.columns([3, 2, 2, 2, 1])

                        with col1:
                            st.write(f"**{prod.get('nom','')}**")

                        with col2:
                            # Afficher la quantité recommandée (non modifiable)
                            st.metric("Qté recommandée", f"{prod.get('qte_recommandee',0)}", label_visibility="collapsed")

                        with col3:
                            # Input pour la quantité finale
                            new_qte = st.number_input(
                                "Qté",
                                value=float(prod.get('qte_finale', 0.0)),
                                min_value=0.0,
                                step=0.5,
                                key=f"qte_valid_{i}_{prod.get('id')}",
                                label_visibility="collapsed",
                                disabled=not prod.get('inclus', True)
                            )
                            # MAJ dans le state
                            st.session_state.produits_a_valider[i]['qte_finale'] = new_qte

                        with col4:
                            st.write(prod.get('unite') or "")

                        with col5:
                            # Checkbox pour inclure/exclure
                            inclus = st.checkbox(
                                "✓",
                                value=prod.get('inclus', True),
                                key=f"inclus_{i}_{prod.get('id')}",
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
                                if prod.get('inclus') and prod.get('qte_finale', 0) > 0:
                                    try:
                                        ok = add_produit_to_commande(commande_id, prod['id'], prod['qte_finale'], prod['unite_id'])
                                        if not ok:
                                            success = False
                                    except Exception:
                                        success = False

                            # Ajouter la formule dans la table de liaison
                            if success:
                                try:
                                    if add_formule_to_commande(commande_id, st.session_state.formule_en_cours['id'], st.session_state.formule_en_cours['nb_couverts']):
                                        st.success("🎉 Formule ajoutée avec succès !")
                                        # Réinitialiser le state
                                        st.session_state.formule_en_cours = None
                                        st.session_state.produits_a_valider = []
                                        st.rerun()
                                    else:
                                        st.error("Erreur lors de l'ajout de la formule")
                                except Exception:
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
                        nb_inclus = sum(1 for p in st.session_state.produits_a_valider if p.get('inclus'))
                        st.metric("Produits", f"{nb_inclus}/{len(st.session_state.produits_a_valider)}")
            st.divider()

            # Section produits
            st.write("### 🥖 Ajouter un produit")
            produits = cached_get_produits()
            unites = cached_get_unites()

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
                    try:
                        if add_produit_to_commande(commande_id, produit_selectionne[0], qte_produit, unite_produit):
                            st.success("Produit ajouté !")
                            st.rerun()
                        else:
                            st.error("Impossible d'ajouter le produit.")
                    except Exception:
                        st.error("Erreur lors de l'ajout du produit.")

            st.divider()

            # Afficher le récapitulatif depuis la DB
            st.subheader("📦 Récapitulatif de la commande")
            try:
                details = get_commande_details(commande_id) or {'formules': [], 'produits': []}
            except Exception:
                details = {'formules': [], 'produits': []}

            # ============= FORMULES ET LEURS PRODUITS ================
            if details.get('formules'):
                st.markdown("** 🍽️ Formules :**")
                for formule_id, formule_nom, qte_rec, qte_fin in details['formules']:
                    # Afficher la formule
                    st.markdown(f"**• {formule_nom}** : {qte_fin} couverts")

                    # Récupérer et afficher les produits de cette formule (use correct helper)
                    try:
                        produits_formule = get_produits_formule_avec_calcul(formule_id, qte_fin) or []
                    except Exception:
                        produits_formule = []

                    if produits_formule:
                        for prod in produits_formule:
                            # expecting dict-like with keys 'produit'/'quantite_finale' or keys depending on DB
                            nom = prod.get('produit') or prod.get('nom') or prod.get('nom_produit') or ""
                            quant = prod.get('quantite_finale') or prod.get('qte_finale') or prod.get('quantite', "")
                            unite = prod.get('unite') or ""
                            st.markdown(f" └─ {nom} : {quant} {unite}")

                    st.write("")  # Espace entre les formules

            # ============ PRODUITS SUPPLÉMENTAIRES ============
            if details.get('produits'):
                st.markdown("** 📦 Produits supplémentaires :**")
                # details['produits'] expected as list of tuples: (produit_id, nom, quantite, unite_nom, unite_id)
                for prod in details.get('produits', []):
                    # be defensive about tuple shapes
                    try:
                        if len(prod) >= 4:
                            if len(prod) == 5:
                                prod_id, prod_nom, qte, unite_nom, unite_id = prod
                            else:
                                # fallback common order
                                prod_id, prod_nom, qte, unite_nom = prod[0], prod[1], prod[2], prod[3]
                        else:
                            # unknown shape
                            continue
                        st.markdown(f"• {prod_nom} : {qte} {unite_nom or ''}")
                    except Exception:
                        continue

            if not details.get('formules') and not details.get('produits'):
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
        else:
            st.error("Commande introuvable. Elle a peut-être été supprimée.")
            st.session_state.composition_mode = False
            st.session_state.current_commande_id = None
            st.rerun()


# ============== TAB 3 : ARCHIVES ==============
with tab3:
    st.header("📦 Commandes Archivées")

    try:
        commandes_archivees = get_archives() or []
    except Exception:
        st.error("Erreur lors de la récupération des archives.")
        commandes_archivees = []

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
        commandes_filtrees_archive = list(commandes_archivees)

        if search_archive:
            commandes_filtrees_archive = [c for c in commandes_filtrees_archive if c.get('client') and search_archive.lower() in c['client'].lower()]

        if filtre_statut != "Tous":
            commandes_filtrees_archive = [c for c in commandes_filtrees_archive if c.get('statut') == filtre_statut]

        # Appliquer tri (defensive)
        def archive_sort_key(x, key_name):
            val = x.get(key_name)
            if isinstance(val, str):
                # try parse date-like strings
                try:
                    return safe_date_from(val)
                except Exception:
                    return date.min
            if isinstance(val, date):
                return val
            return date.min

        if tri_archive == "Date archivage (récent)":
            commandes_filtrees_archive = sorted(commandes_filtrees_archive, key=lambda x: archive_sort_key(x, 'date_archivage'), reverse=True)
        elif tri_archive == "Date archivage (ancien)":
            commandes_filtrees_archive = sorted(commandes_filtrees_archive, key=lambda x: archive_sort_key(x, 'date_archivage'))
        elif tri_archive == "Date livraison":
            commandes_filtrees_archive = sorted(commandes_filtrees_archive, key=lambda x: archive_sort_key(x, 'date'), reverse=True)
        elif tri_archive == "Client (A-Z)":
            commandes_filtrees_archive = sorted(commandes_filtrees_archive, key=lambda x: x.get('client') or "")

        st.write(f"**{len(commandes_filtrees_archive)} commande(s) archivée(s)** sur {len(commandes_archivees)}")
        st.divider()

        # Afficher les commandes archivées
        for cmd in commandes_filtrees_archive:
            statut_icon = "✅" if cmd.get('statut') == "Livrée" else "🤖" if cmd.get('statut') == "Auto-archivée" else "❌"

            with st.expander(f"{statut_icon} {cmd.get('client','')} - {cmd.get('couverts',0)} couverts - {str(cmd.get('date'))} [{cmd.get('statut')}]", expanded=False):

                # Infos principales
                col1, col2, col3, col4 = st.columns(4)
                with col1:
                    st.metric("Client", cmd.get('client'))
                with col2:
                    st.metric("Couverts", cmd.get('couverts'))
                with col3:
                    st.metric("Date livraison", str(cmd.get('date')))
                with col4:
                    st.metric("Statut", cmd.get('statut'))

                # Date d'archivage
                st.info(f"📦 Archivée le : {cmd.get('date_archivage')}")

                st.divider()

                # Récupérer les détails depuis les tables d'archives
                try:
                    from database import get_archive_details
                    details = get_archive_details(cmd['id']) or {}
                except Exception:
                    details = {}

                # Formules archivées
                if details.get('formules'):
                    st.subheader("📋 Formules")
                    for formule in details['formules']:
                        # (nom, qte_rec, qte_fin) expected
                        try:
                            formule_nom, qte_rec, qte_fin = formule
                        except Exception:
                            continue
                        col1, col2 = st.columns([3, 1])
                        with col1:
                            st.write(f"**{formule_nom}**")
                        with col2:
                            st.write(f"Qté: {qte_fin}")

                # Produits archivés
                if details.get('produits'):
                    st.subheader("📦 Produits supplémentaires")
                    for prod in details['produits']:
                        try:
                            prod_nom, qte_finale, unite = prod
                        except Exception:
                            # try alternate shapes
                            try:
                                _, prod_nom, qte_finale, unite = prod
                            except Exception:
                                continue
                        col1, col2 = st.columns([3, 1])
                        with col1:
                            st.write(f"**{prod_nom}**")
                        with col2:
                            st.write(f"{qte_finale} {unite}")

                st.divider()

                # Actions
                col1, col2 = st.columns(2)
                with col1:
                    st.info("ℹ️ Les archives sont en lecture seule")
                with col2:
                    if st.button("🗑️ Supprimer définitivement", key=f"del_archive_{cmd['id']}", use_container_width=True):
                        st.warning("📦 Fonction delete_archive() à créer dans database.py")
    else:
        st.info("📭 Aucune commande archivée pour le moment.")
        st.write("Les commandes seront automatiquement archivées 7 jours après leur date de livraison.")


# Statistiques 
st.divider()
try:
    raw_commandes = get_commandes() or []
except Exception:
    raw_commandes = []
commandes = normalize_commandes(raw_commandes)
aujourd_hui_str = date.today().strftime('%Y-%m-%d')
commandes_aujourdhui = [c for c in commandes if c.get('date_obj') == date.today()]
commandes_futures = [c for c in commandes if c.get('date_obj') and c.get('date_obj') > date.today()]
commandes_semaine = [c for c in commandes if c.get('date_obj') and date.today() <= c.get('date_obj') <= (date.today() + timedelta(days=7))]

col1, col2, col3, col4 = st.columns(4)

with col1:
    st.metric("📋 Commandes actives", len(commandes))

with col2:
    st.metric("🔴 Aujourd'hui", len(commandes_aujourdhui))

with col3:
    st.metric("📅 Cette semaine", len(commandes_semaine))

with col4:
    total_couverts = sum(c.get('couverts', 0) for c in commandes)
    st.metric("👥 Total couverts", total_couverts)