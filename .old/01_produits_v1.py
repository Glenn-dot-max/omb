"""
Refactored produits management page:
- Caches reads with st.cache_data
- Uses st.form for create actions
- Requires explicit Save for renames
- Confirms deletes before applying
- Minimizes DB calls inside loops
- Adds basic error handling
"""
import logging
from pathlib import Path
import sys
from typing import List, Dict, Optional

import streamlit as st

# Ensure repository package imports work (consider using a proper package/venv instead)
sys.path.append(str(Path(__file__).parent.parent))

from auth import check_password
from database import (
    add_category,
    add_produit,
    add_type,
    delete_category,
    delete_produit,
    delete_type,
    get_categories,
    get_produits,
    get_types,
    init_db_if_needed,
    update_category,
    update_type,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Authentication early
if not check_password():
    st.stop()

# Page config
st.set_page_config(page_title="Produits", page_icon="📦", layout="wide")

# Initialize DB if needed
init_db_if_needed()

st.title("📦 Gestion des produits")

# ---- Cached getters to reduce DB hits ----
@st.cache_data(ttl=10)
def cached_get_produits() -> List[Dict]:
    return get_produits() or []


@st.cache_data(ttl=10)
def cached_get_categories() -> List[Dict]:
    return get_categories() or []


@st.cache_data(ttl=10)
def cached_get_types() -> List[Dict]:
    return get_types() or []


def refresh_caches():
    # Clear caches after writes so UI shows new data
    cached_get_produits.clear()
    cached_get_categories.clear()
    cached_get_types.clear()


# Helper: compute counts once
produits_all = cached_get_produits()
categories_all = cached_get_categories()
types_all = cached_get_types()

prod_count_by_category = {}
prod_count_by_type = {}
for p in produits_all:
    prod_count_by_category[p.get("categorie")] = prod_count_by_category.get(p.get("categorie"), 0) + 1
    prod_count_by_type[p.get("type")] = prod_count_by_type.get(p.get("type"), 0) + 1

# Tabs
tab1, tab2, tab3 = st.tabs(["🛒 Produits", "📁 Catégories", "🏷️ Types"])

# ---------------- Tab 1: Produits ----------------
with tab1:
    st.header("Liste des produits")

    # Add product form
    with st.form("add_product_form", clear_on_submit=True):
        col1, col2, col3, col4 = st.columns([3, 2, 2, 1])
        with col1:
            new_prod = st.text_input("Nom du produit", placeholder="Ex: Savon à la lavande")
        with col2:
            cat_options = {c["nom"]: c["id"] for c in categories_all}
            cat_options["(Aucune)"] = None
            selected_cat = st.selectbox("Catégorie", options=list(cat_options.keys()))
            selected_cat_id = cat_options[selected_cat]
        with col3:
            type_options = {t["nom"]: t["id"] for t in types_all}
            type_options["(Aucune)"] = None
            selected_type = st.selectbox("Type", options=list(type_options.keys()))
            selected_type_id = type_options[selected_type]
        with col4:
            submitted = st.form_submit_button("Ajouter")
        if submitted:
            if not new_prod:
                st.warning("⚠️ Veuillez entrer un nom de produit.")
            else:
                try:
                    ok = add_produit(new_prod.strip(), selected_cat_id, selected_type_id)
                    if ok:
                        st.success(f"✅ Produit '{new_prod}' ajouté !")
                        refresh_caches()
                        st.experimental_rerun()
                    else:
                        st.error("❌ Erreur lors de l'ajout (peut-être existe déjà).")
                except Exception as e:
                    logger.exception("Erreur lors de l'ajout de produit")
                    st.error(f"Erreur serveur: {e}")

    st.divider()

    # Filters & Search
    colf1, colf2, colf3 = st.columns([3, 2, 1])
    with colf1:
        search = st.text_input("🔍 Rechercher un produit")
    with colf2:
        category_names = ["Tous"] + [c["nom"] for c in categories_all if c.get("nom")]
        cat_filter = st.selectbox("Filtrer par catégorie", category_names)
    with colf3:
        type_names = ["Tous"] + [t["nom"] for t in types_all if t.get("nom")]
        type_filter = st.selectbox("Filtrer par type", type_names)

    produits = cached_get_produits()
    produits_filtered = produits
    if search:
        produits_filtered = [p for p in produits_filtered if search.lower() in (p.get("nom") or "").lower()]
    if cat_filter != "Tous":
        produits_filtered = [p for p in produits_filtered if p.get("categorie") == cat_filter]
    if type_filter != "Tous":
        produits_filtered = [p for p in produits_filtered if p.get("type") == type_filter]

    st.write(f"**{len(produits_filtered)} produit(s)**")

    # Deletion confirmation state
    if "to_delete_prod" not in st.session_state:
        st.session_state.to_delete_prod = None

    # Display list
    for p in produits_filtered:
        col1, col2, col3, col4 = st.columns([3, 2, 2, 1])
        with col1:
            st.write(f"**{p.get('nom')}**")
        with col2:
            st.write(p.get("categorie") or "-")
        with col3:
            st.write(p.get("type") or "-")
        with col4:
            if st.button("🗑️", key=f"del_prod_{p['id']}"):
                st.session_state.to_delete_prod = ("produit", p["id"], p.get("nom"))

    # If delete requested, show modal-like confirmation
    if st.session_state.to_delete_prod:
        kind, obj_id, obj_name = st.session_state.to_delete_prod
        confirm_col1, confirm_col2 = st.columns([3, 1])
        with confirm_col1:
            st.warning(f"Confirmer la suppression de {kind} '{obj_name}' (id: {obj_id}) ?")
        with confirm_col2:
            if st.button("Confirmer", key="confirm_delete"):
                try:
                    if kind == "produit" and delete_produit(obj_id):
                        st.success("Produit supprimé.")
                        refresh_caches()
                        st.session_state.to_delete_prod = None
                        st.experimental_rerun()
                    else:
                        st.error("Impossible de supprimer.")
                except Exception as e:
                    logger.exception("Erreur suppression")
                    st.error(f"Erreur serveur: {e}")
            if st.button("Annuler", key="cancel_delete"):
                st.session_state.to_delete_prod = None

# ---------------- Tab 2: Catégories ----------------
with tab2:
    st.header("Gestion des catégories")

    with st.form("add_category_form", clear_on_submit=True):
        new_cat = st.text_input("Nouvelle catégorie")
        add_submitted = st.form_submit_button("Ajouter")
        if add_submitted:
            if not new_cat:
                st.warning("Entrez un nom de catégorie.")
            else:
                try:
                    if add_category(new_cat.strip()):
                        st.success("✅ Catégorie ajoutée !")
                        refresh_caches()
                        st.experimental_rerun()
                    else:
                        st.error("❌ Cette catégorie existe déjà")
                except Exception as e:
                    logger.exception("Erreur ajout catégorie")
                    st.error(f"Erreur serveur: {e}")

    st.divider()

    categories = cached_get_categories()
    if not categories:
        st.info("Aucune catégorie. Créez-en une ci-dessus !")
    else:
        st.expander(f"📋 Consulter les catégories ({len(categories)})", expanded=True)
        for cat in categories:
            cat_id = cat["id"]
            cat_nom = cat["nom"]
            col1, col2, col3 = st.columns([4, 1, 1])
            with col1:
                # Inline edit with explicit Save to avoid writing on every keystroke
                key_text = f"edit_cat_{cat_id}"
                if key_text not in st.session_state:
                    st.session_state[key_text] = cat_nom
                new_name = st.text_input("Nom", value=st.session_state[key_text], key=key_text, label_visibility="collapsed")
            with col2:
                count = prod_count_by_category.get(cat_nom, 0)
                st.write(f"📦 {count}")
            with col3:
                if st.button("💾 Enregistrer", key=f"save_cat_{cat_id}"):
                    if new_name.strip() and new_name.strip() != cat_nom:
                        try:
                            if update_category(cat_id, new_name.strip()):
                                st.success("Modifié.")
                                refresh_caches()
                                st.experimental_rerun()
                            else:
                                st.error("Échec de la mise à jour (conflit ?).")
                        except Exception as e:
                            logger.exception("Erreur update catégorie")
                            st.error(f"Erreur serveur: {e}")
                if st.button("🗑️", key=f"del_cat_{cat_id}"):
                    # try delete and show error if used by products
                    try:
                        if delete_category(cat_id):
                            st.success("Catégorie supprimée.")
                            refresh_caches()
                            st.experimental_rerun()
                        else:
                            st.error("❌ Catégorie utilisée par des produits")
                    except Exception as e:
                        logger.exception("Erreur suppression catégorie")
                        st.error(f"Erreur serveur: {e}")

# ---------------- Tab 3: Types ----------------
with tab3:
    st.header("Gestion des types")

    with st.form("add_type_form", clear_on_submit=True):
        new_type = st.text_input("Nouveau type")
        type_submitted = st.form_submit_button("Ajouter")
        if type_submitted:
            if not new_type:
                st.warning("⚠️ Entrez un nom")
            else:
                try:
                    if add_type(new_type.strip()):
                        st.success("✅ Type ajouté !")
                        refresh_caches()
                        st.experimental_rerun()
                    else:
                        st.error("❌ Ce type existe déjà")
                except Exception as e:
                    logger.exception("Erreur ajout type")
                    st.error(f"Erreur serveur: {e}")

    st.divider()

    types = cached_get_types()
    if not types:
        st.info("Aucun type. Créez-en un ci-dessus !")
    else:
        for typ in types:
            type_id = typ["id"]
            type_nom = typ["nom"]
            col1, col2, col3 = st.columns([4, 1, 1])
            with col1:
                key_text = f"edit_type_{type_id}"
                if key_text not in st.session_state:
                    st.session_state[key_text] = type_nom
                new_name = st.text_input("Nom", value=st.session_state[key_text], key=key_text, label_visibility="collapsed")
            with col2:
                count = prod_count_by_type.get(type_nom, 0)
                st.write(f"📦 {count}")
            with col3:
                if st.button("💾 Enregistrer", key=f"save_type_{type_id}"):
                    if new_name.strip() and new_name.strip() != type_nom:
                        try:
                            if update_type(type_id, new_name.strip()):
                                st.success("Modifié.")
                                refresh_caches()
                                st.experimental_rerun()
                            else:
                                st.error("Échec de la mise à jour.")
                        except Exception as e:
                            logger.exception("Erreur update type")
                            st.error(f"Erreur serveur: {e}")
                if st.button("🗑️", key=f"del_type_{type_id}"):
                    try:
                        if delete_type(type_id):
                            st.success("Type supprimé.")
                            refresh_caches()
                            st.experimental_rerun()
                        else:
                            st.error("❌ Type utilisé par des produits")
                    except Exception as e:
                        logger.exception("Erreur suppression type")
                        st.error(f"Erreur serveur: {e}")

# ---- Stats ----
st.divider()
col1, col2, col3 = st.columns(3)
with col1:
    st.metric("Total Produits", len(cached_get_produits()))
with col2:
    st.metric("Total Catégories", len(cached_get_categories()))
with col3:
    st.metric("Total Types", len(cached_get_types()))