#pages/1_produits. py
import streamlit as st
import sys
from pathlib import Path

# Ajouter le chemin parent pour importer database
sys.path.append(str(Path(__file__).parent.parent))

from database import (
    get_produits,
    produit_existe, 
    add_produit,
    delete_produit,
    get_categories,
    add_category,
    delete_category,
    update_category,
    get_types,
    add_type,
    delete_type,
    update_type,
    init_db_if_needed
)

# ========================================
# 🚀 CACHE DES DONNÉES
# ========================================
@st.cache_data(ttl=120)
def cached_get_produits():
    """Récupère les produits avec cache"""
    return get_produits() or []

@st.cache_data(ttl=300)
def cached_get_categories():
    """Récupère les catégories avec cache"""
    return get_categories() or []

@st.cache_data(ttl=300)
def cached_get_types():
    """Récupère les types avec cache"""
    return get_types() or []

# ========================================
# 🔐 PROTECTION PAR MOT DE PASSE
# ========================================
from auth import check_password

if not check_password():
    st.stop()

# Configuration de la page
st.set_page_config(page_title="Produits", page_icon="📦", layout="wide")

# Initialiser la base
init_db_if_needed()

# Titre
st.title("📦 Gestion des Produits")

# Tabs principales
tab1, tab2, tab3 = st.tabs(["🛒 Produits", "📁 Catégories", "📁 Types"])

# ========== TAB 1 : PRODUITS ===========
with tab1:
    st.header("Liste des produits")

    # Ajouter un produit
    with st.expander("➕ Ajouter un nouveau produit"):
        col1, col2, col3, col4 = st.columns([3, 2, 2, 1])

        with col1:
            nouveau_produit = st.text_input("Nom du produit", key="new_prod")

        with col2:
            categories = cached_get_categories()
            if categories:
                cat_options = {cat['nom']: cat['id'] for cat in categories}
                cat_options["(Aucune)"] = None
                selected_cat = st.selectbox("Catégorie", options=cat_options.keys(), key="cat_prod")
                selected_cat_id = cat_options[selected_cat]
            else: 
                st.warning("Créez d'abord des catégories")
                selected_cat_id = None

        with col3:
            types = cached_get_types()
            if types: 
                type_options = {typ['nom']: typ['id'] for typ in types}
                type_options["(Aucune)"] = None
                selected_type = st.selectbox("Type", options=type_options.keys(), key="type_prod")
                selected_type_id = type_options[selected_type]
            else:
                st.warning("Créez d'abord des types")
                selected_type_id = None

        with col4:
            st.write("")
            st.write("")
            if st.button("Ajouter", type="primary", use_container_width=True):
                if nouveau_produit:
                    if produit_existe(nouveau_produit):
                        st.error(f"❌ Le produit '{nouveau_produit}' existe déjà !")
                    else:
                        if add_produit(nouveau_produit, selected_cat_id, selected_type_id):
                            st.success(f"✅ Produit '{nouveau_produit}' ajouté !")
                            st.cache_data.clear()
                            st. rerun()
                        else: 
                            st.error("❌ Erreur lors de l'ajout")
                else: 
                    st.warning("⚠️ Veuillez entrer un nom")

    st.divider()

    # Afficher les produits
    produits = cached_get_produits()
    categories = cached_get_categories()

    if produits:
        # Filtres
        col1, col2 = st.columns(2)
        with col1:
            search = st.text_input("🔍 Rechercher un produit", key="search_prod")
        with col2:
            cat_filter = st.selectbox(
                "Filtrer par catégorie",
                ["Tous"] + [cat['nom'] for cat in categories if cat['nom']],
                key="filtrer_cat"
            )

        # Appliquer les filtres
        produits_filtres = produits
        if search:
            produits_filtres = [p for p in produits_filtres if search.lower() in p['nom'].lower()]
        if cat_filter != "Tous": 
            produits_filtres = [p for p in produits_filtres if p['categorie'] == cat_filter]

        # ========== PAGINATION ==========
        PRODUITS_PAR_PAGE = 20

        # Initialiser la page
        if 'page_produits' not in st.session_state:
            st.session_state.page_produits = 1

        # Calculer le nombre de pages
        total_produits = len(produits_filtres)
        total_pages = max(1, (total_produits + PRODUITS_PAR_PAGE - 1) // PRODUITS_PAR_PAGE)

        # Réinitialiser à la page 1 si les filtres changent
        if 'last_search_prod' not in st.session_state:
            st.session_state.last_search_prod = ""
        if 'last_cat_filter' not in st.session_state:
            st.session_state.last_cat_filter = ""

        if search != st.session_state.last_search_prod or cat_filter != st.session_state.last_cat_filter:
            st.session_state.page_produits = 1
            st. session_state.last_search_prod = search
            st.session_state.last_cat_filter = cat_filter

        # S'assurer que la page est dans les limites
        if st. session_state.page_produits > total_pages:
            st.session_state.page_produits = total_pages
        if st.session_state.page_produits < 1:
            st.session_state.page_produits = 1

        # Afficher le compteur et la navigation
        st.write(f"**{total_produits} produit(s)** - Page {st.session_state.page_produits}/{total_pages}")

        col1, col2, col3 = st.columns([1, 2, 1])
        with col1:
            if st.button("⬅️ Précédent", disabled=st.session_state.page_produits == 1, use_container_width=True, key="prev_prod"):
                st.session_state.page_produits -= 1
                st. rerun()
        with col2:
            st.markdown(
                f"<div style='text-align: center; padding: 10px;'>Page <b>{st.session_state.page_produits}</b> sur <b>{total_pages}</b></div>",
                unsafe_allow_html=True,
            )
        with col3:
            if st.button("Suivant ➡️", disabled=st. session_state.page_produits == total_pages, use_container_width=True, key="next_prod"):
                st.session_state.page_produits += 1
                st.rerun()

        st.divider()

        # Calculer les indices pour la page courante
        debut = (st.session_state. page_produits - 1) * PRODUITS_PAR_PAGE
        fin = min(debut + PRODUITS_PAR_PAGE, total_produits)

        # Afficher SEULEMENT les produits de la page courante
        produits_page = produits_filtres[debut: fin]

        for produit in produits_page:
            col1, col2, col3, col4 = st.columns([3, 2, 2, 1])

            with col1:
                st.write(f"**{produit['nom']}**")
            with col2:
                st.write(produit['categorie'] or "-")
            with col3:
                st.write(produit['type'] or "-")
            with col4:
                if st.button("🗑️", key=f"del_prod_{produit['id']}"):
                    if delete_produit(produit['id']):
                        st.success("Supprimé !")
                        st.cache_data.clear()
                        st.rerun()

    else:
        st.info("Aucun produit. Ajoutez-en un ci-dessus !")

# ========== TAB 2 : CATÉGORIES ==========
with tab2:
    st.header("Gestion des catégories")

    # Ajouter une catégorie
    col1, col2 = st. columns([4, 1])
    with col1:
        nouvelle_cat = st.text_input("Nouvelle catégorie", key="new_cat")
    with col2:
        st.write("")
        st.write("")
        if st.button("Ajouter", key='add_cat', type="primary", use_container_width=True):
            if nouvelle_cat: 
                if add_category(nouvelle_cat):
                    st.success("✅ Catégorie ajoutée !")
                    st.cache_data.clear()
                    st.rerun()
                else:
                    st.error("❌ Cette catégorie existe déjà")
            else:
                st.warning("Entrez un nom")

    st.divider()

    # Afficher les catégories
    categories = cached_get_categories()

    if categories: 
        with st.expander(f"📋 Consulter les catégories ({len(categories)})"):
            for cat in categories:
                cat_id = cat['id']
                cat_nom = cat['nom']
                col1, col2, col3 = st.columns([4, 1, 1])

                with col1:
                    # Mode édition
                    new_name = st.text_input(
                        "Nom",
                        value=cat_nom,
                        key=f"edit_cat_{cat_id}",
                        label_visibility="collapsed"
                    )
                    if new_name != cat_nom:
                        if update_category(cat_id, new_name):
                            st.cache_data.clear()
                            st.rerun()

                with col2:
                    # Compter les produits
                    produits_count = len([p for p in cached_get_produits() if p['categorie'] == cat_nom])
                    st.write(f"📦 {produits_count}")

                with col3:
                    if st.button("🗑️", key=f"del_cat_{cat_id}"):
                        if delete_category(cat_id):
                            st.success("Supprimée !")
                            st.cache_data.clear()
                            st.rerun()
                        else:
                            st.error("❌ Catégorie utilisée par des produits")
    else:
        st.info("Aucune catégorie.  Créez-en une ci-dessus !")

# ========== TAB 3 :  TYPES ===========
with tab3:
    st.header("Gestion des types")

    # Ajouter un type
    col1, col2 = st.columns([4, 1])
    with col1:
        nouveau_type = st.text_input("Nouveau type", key="new_type")
    with col2:
        st.write("")
        st.write("")
        if st.button("Ajouter", key="add_type", type="primary", use_container_width=True):
            if nouveau_type: 
                if add_type(nouveau_type):
                    st.success("✅ Type ajouté!")
                    st.cache_data.clear()
                    st. rerun()
                else: 
                    st.error("❌ Ce type existe déjà")
            else:
                st. warning("⚠️ Entrez un nom")

    st.divider()

    # Afficher les types
    types = cached_get_types()

    if types:
        with st.expander(f"🏷️ Consulter les types ({len(types)})"):
            for typ in types:
                type_id = typ['id']
                type_nom = typ['nom']
                col1, col2, col3 = st.columns([4, 1, 1])

                with col1:
                    # Mode édition
                    new_name = st.text_input(
                        "Nom",
                        value=type_nom,
                        key=f"edit_type_{type_id}",
                        label_visibility="collapsed"
                    )
                    if new_name != type_nom:
                        if update_type(type_id, new_name):
                            st.cache_data.clear()
                            st.rerun()

                with col2:
                    # Compter les produits
                    produits_count = len([p for p in cached_get_produits() if p['type'] == type_nom])
                    st.write(f"📦 {produits_count}")

                with col3:
                    if st.button("🗑️", key=f"del_type_{type_id}"):
                        if delete_type(type_id):
                            st.success("Supprimé !")
                            st.cache_data.clear()
                            st.rerun()
                        else:
                            st.error("❌ Type utilisé par des produits")

    else:
        st.info("Aucun type.  Créez-en un ci-dessus !")

# ========== STATISTIQUES ==========
st.divider()
col1, col2, col3 = st.columns(3)
with col1:
    st. metric("Total Produits", len(cached_get_produits()))
with col2:
    st.metric("Total Catégories", len(cached_get_categories()))
with col3:
    st.metric("Total Types", len(cached_get_types()))