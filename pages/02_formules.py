# pages/2_formules.py
import streamlit as st
import sys
from pathlib import Path

# Make local package imports work (consider replacing this with proper package layout)
sys.path.append(str(Path(__file__).parent.parent))

from database import (
    get_formules,
    get_all_formules_with_details,
    create_formule,
    delete_formule,
    get_formule_details,
    add_produit_to_formule,
    remove_produit_from_formule,
    update_quantite_in_formule,
    update_formule,
    get_produits,
    get_unites,
    init_db_if_needed,
)

@st.cache_data(ttl=120)
def cached_get_formules():
    return get_formules() or []

@st.cache_data(ttl=120)
def cached_get_produits():
    return get_produits() or []

@st.cache_data(ttl=300)
def cached_get_unites():
    return get_unites() or []

@st.cache_data(ttl=60)
def cached_get_all_formules_with_details():
    return get_all_formules_with_details() or {}

@st.cache_data(ttl=60)
def cached_get_formule_details(formule_id):
    return get_formule_details(formule_id) or []

# Authentication (stop the app early if unauthorized)
from auth import check_password

if not check_password():
    st.stop()

# Configuration
st.set_page_config(page_title="Formules", page_icon="📋", layout="wide")

# Initialize DB if needed
init_db_if_needed()

st.title("📋 Gestion des Formules")

# Session state initialization
if "composition_formule_mode" not in st.session_state:
    st.session_state.composition_formule_mode = False
    st.session_state.current_formule_id = None

# ========== CREATE FORMULA ==========
if not st.session_state.composition_formule_mode:
    with st.expander("➕ Créer une nouvelle formule"):
        col1, col2, col3 = st.columns([3, 2, 1])

        with col1:
            nom_formule = st.text_input("Nom de la formule", placeholder="Ex: Menu Petit-déjeuner")

        with col2:
            type_formule = st.selectbox(
                "Type de formule",
                ["Non-Brunch", "Brunch"],
                help="Classez la formule",
            )

        with col3:
            st.write("")
            st.write("")
            if st.button("Créer", type="primary", use_container_width=True):
                if not nom_formule:
                    st.warning("⚠️ Entrez un nom")
                else:
                    # NOTE: create_formule currently only takes a name in original code.
                    # If your DB supports type, consider adding it to create_formule call.
                    formule_id = create_formule(nom_formule)
                    if formule_id:
                        st.success(f"✅ Formule '{nom_formule}' créée !")
                        st.session_state.composition_formule_mode = True
                        st.session_state.current_formule_id = formule_id
                        st.cache_data.clear()
                        st.rerun()
                    else:
                        st.error("❌ Cette formule existe déjà")

# ========== COMPOSITION MODE ==========
else:
    formule_id = st.session_state.current_formule_id

    # Get current formule info
    formules = cached_get_formules()
    formule_info = next((f for f in formules if f["id"] == formule_id), None)

    if formule_info:
        st.success(f"🎉 Formule créée : **{formule_info['nom']}**")
        st.subheader("📋 Composer la formule")

        st.write("### 🥖 Ajouter des produits")

        produits = cached_get_produits()
        unites = cached_get_unites()

        if produits and unites:
            col1, col2, col3, col4 = st.columns([3, 2, 2, 1])

            with col1:
                # Use product objects as options and a format function to avoid fragile index lookups
                selected_prod = st.selectbox(
                    "🔎 Produit (tapez pour filtrer)",
                    options=produits,
                    format_func=lambda p: f"{p['nom']} ({p.get('categorie') or 'N/A'})",
                    key=f"prod_select_new_{formule_id}",
                    help="Tapez directement dans la liste pour rechercher",
                )
                selected_prod_id = selected_prod["id"]

            with col2:
                quantite = st.number_input(
                    "Quantité par personne",
                    min_value=0.0,
                    value=1.0,
                    step=0.5,
                    key=f"qty_add_new_{formule_id}",
                )
            
            with col3:
                # Trouver l'index de "unité" pour le mettre par défaut
                index_unite_defaut = 0
                for i, u in enumerate(unites):
                    if u["nom"].lower() == "unité":
                        index_unite_defaut = i
                        break
                
                selected_unite = st.selectbox(
                    "Unité",
                    options=unites,
                    index=index_unite_defaut,
                    format_func=lambda u: u["nom"],
                    key=f"unite_select_new_{formule_id}",
                )
                selected_unite_id = selected_unite["id"]

            with col4:
                st.write("")
                st.write("")
                if st.button("➕ Ajouter", key=f"add_btn_new_{formule_id}", use_container_width=True, type="primary"):
                    if add_produit_to_formule(formule_id, selected_prod_id, quantite, selected_unite_id):
                        st.success("✅ Produit ajouté !")
                        # Clear caches to ensure updated lists are shown
                        st.cache_data.clear()
                        st.rerun()
                    else:
                        st.error("❌ Ce produit est déjà dans la formule")
        else:
            st.warning("⚠️ Créez d'abord des produits et des unités")

        st.divider()

        st.write("### 📦 Récapitulatif de la formule")
        details = cached_get_formule_details(formule_id) or []

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
                    st.write(item["nom"])

                with col2:
                    # Provide a number input but require explicit confirmation to update DB
                    qty_key = f"qty_edit_{formule_id}_{item['produit_id']}"
                    new_qty = st.number_input(
                        "Quantité",
                        value=float(item["quantite"]),
                        min_value=0.0,
                        step=0.5,
                        key=qty_key,
                        label_visibility="collapsed",
                    )
                    if st.button("Mettre à jour", key=f"update_qty_{formule_id}_{item['produit_id']}"):
                        if new_qty != item["quantite"]:
                            if update_quantite_in_formule(formule_id, item["produit_id"], new_qty):
                                st.success("Quantité mise à jour")
                                # Clear caches and refresh details
                                st.cache_data.clear()
                                st.rerun()
                            else:
                                st.error("Erreur lors de la mise à jour")

                with col3:
                    st.write(item["unite"])

                with col4:
                    if st.button("🗑️", key=f"del_prod_new_{formule_id}_{item['produit_id']}"):
                        if remove_produit_from_formule(formule_id, item["produit_id"]):
                            st.success("Retiré !")
                            st.cache_data.clear()
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

# ========== LIST VIEW ==========
if not st.session_state.composition_formule_mode:
    # Load everything in one call and cache it
    formules_with_details = cached_get_all_formules_with_details()
    formules = list(formules_with_details.values())

    if formules:
        col1, col2, col3 = st.columns([3, 2, 2])

        with col1:
            search_formule = st.text_input("🔎 Rechercher une formule", key="search_formule")

        with col2:
            filtre_type = st.selectbox(
                "Filter par type",
                ["Toutes", "Brunch", "Non-Brunch"],
                key="filtre_type",
            )

        with col3:
            tri = st.selectbox(
                "Trier par",
                ["Nom (A-Z)", "Nom (Z-A)", "Plus récent", "Plus ancien"],
                key="tri_formule",
            )

        formules_filtrees = formules

        # Filtre par recherche
        if search_formule:
            formules_filtrees = [f for f in formules_filtrees if search_formule.lower() in f["nom"].lower()]

            if not formules_filtrees:
                # fixed missing trailing quote in original f-string
                st.warning(f"Aucune formule trouvée pour '{search_formule}'")

                # Simple suggestion logic (can be improved with fuzzy matching)
                suggestions = []
                for f in formules:
                    nom = f["nom"].lower()
                    # very naive heuristics: at least 3 characters in common substring
                    if len(set(search_formule.lower()) & set(nom)) >= 3:
                        suggestions.append(f["nom"])

                if suggestions:
                    st.info(f"💡 Suggestions : {', '.join(suggestions[:3])}")

        # Filtre par type
        if filtre_type != "Toutes":
            formules_filtrees = [f for f in formules_filtrees if f.get("type_formule", "Non-Brunch") == filtre_type]

        # Tri
        if tri == "Nom (A-Z)":
            formules_filtrees = sorted(formules_filtrees, key=lambda x: x["nom"])
        elif tri == "Nom (Z-A)":
            formules_filtrees = sorted(formules_filtrees, key=lambda x: x["nom"], reverse=True)
        elif tri == "Plus récent":
            formules_filtrees = sorted(formules_filtrees, key=lambda x: x["date_creation"], reverse=True)
        elif tri == "Plus ancien":
            formules_filtrees = sorted(formules_filtrees, key=lambda x: x["date_creation"])

        # Pagination
        formules_par_page = 10
        total_formules = len(formules_filtrees)
        total_pages = max(1, (total_formules + formules_par_page - 1) // formules_par_page)

        if "page_formules" not in st.session_state:
            st.session_state.page_formules = 1

        if "last_search" not in st.session_state:
            st.session_state.last_search = ""
        if "last_tri" not in st.session_state:
            st.session_state.last_tri = ""

        if search_formule != st.session_state.last_search or tri != st.session_state.last_tri:
            st.session_state.page_formules = 1
            st.session_state.last_search = search_formule
            st.session_state.last_tri = tri

        if st.session_state.page_formules > total_pages:
            st.session_state.page_formules = total_pages
        if st.session_state.page_formules < 1:
            st.session_state.page_formules = 1

        st.write(f"**{total_formules} formule(s)** - Page {st.session_state.page_formules}/{total_pages}")

        col1, col2, col3 = st.columns([1, 2, 1])
        with col1:
            if st.button("⬅️ Précédent", disabled=st.session_state.page_formules == 1, use_container_width=True):
                st.session_state.page_formules -= 1
                st.rerun()
        with col2:
            st.markdown(
                f"<div style='text-align: center; padding: 10px;'>Page <b>{st.session_state.page_formules}</b> sur <b>{total_pages}</b></div>",
                unsafe_allow_html=True,
            )
        with col3:
            if st.button("Suivant ➡️", disabled=st.session_state.page_formules == total_pages, use_container_width=True):
                st.session_state.page_formules += 1
                st.rerun()

        st.divider()

        debut = (st.session_state.page_formules - 1) * formules_par_page
        fin = min(debut + formules_par_page, total_formules)
        formules_a_afficher = formules_filtrees[debut:fin]

        for formule in formules_a_afficher:
            formule_id = formule["id"]
            nom_formule = formule["nom"]
            type_formule = formule.get("type_formule", "Non-Brunch")
            details = formule.get("produits", [])

            icone = "🍳" if type_formule == "Brunch" else "🍽️"
            badge = f"[{type_formule}]"

            with st.expander(f"{icone} {nom_formule} {badge} ({len(details)} produits)", expanded=False):
                col_type1, col_type2 = st.columns([4, 1])
                with col_type1:
                    nouveau_type = st.selectbox(
                        "Type de formule",
                        ["Non-Brunch", "Brunch"],
                        index=1 if type_formule == "Brunch" else 0,
                        key=f"type_{formule_id}",
                    )
                with col_type2:
                    st.write("")
                    st.write("")
                    if st.button("💾 MAJ type", key=f"update_type_{formule_id}"):
                        if update_formule(formule_id, nouveau_type):
                            st.success("✅ Type mis à jour !")
                            st.cache_data.clear()
                            st.rerun()
                        else:
                            st.error("❌ Erreur")

                st.divider()

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
                        st.write(item["nom"])

                    with col2:
                        qty_key = f"qty_{formule_id}_{item['produit_id']}"
                        new_qty = st.number_input(
                            "Quantité",
                            value=float(item["quantite"]),
                            min_value=0.0,
                            step=0.5,
                            key=qty_key,
                            label_visibility="collapsed",
                        )
                        if st.button("Mettre à jour", key=f"update_qty_list_{formule_id}_{item['produit_id']}"):
                            if new_qty != item["quantite"]:
                                if update_quantite_in_formule(formule_id, item["produit_id"], new_qty):
                                    st.success("Quantité mise à jour")
                                    st.cache_data.clear()
                                    st.rerun()
                                else:
                                    st.error("Erreur lors de la mise à jour")

                    with col3:
                        st.write(item["unite"])

                    with col4:
                        st.write(f"{new_qty} {item['unite']}")

                    with col5:
                        if st.button("🗑️", key=f"del_prod_{formule_id}_{item['produit_id']}"):
                            if remove_produit_from_formule(formule_id, item["produit_id"]):
                                st.success("Retiré !")
                                st.cache_data.clear()
                                st.rerun()

                if not details:
                    st.info("Aucun produit dans cette formule")

                st.divider()

                # Add a product to this formule
                produits = cached_get_produits()
                unites = cached_get_unites()

                if produits and unites:
                    col1, col2, col3, col4 = st.columns([3, 2, 2, 1])

                    with col1:
                        selected_prod = st.selectbox(
                            "🔎 Produit (tapez pour filtrer)",
                            options=produits,
                            format_func=lambda p: f"{p['nom']} ({p.get('categorie') or 'N/A'})",
                            key=f"prod_select_{formule_id}",
                        )
                        selected_prod_id = selected_prod["id"]

                    with col2:
                        quantite = st.number_input(
                            "Quantité",
                            min_value=0.0,
                            value=1.0,
                            step=0.5,
                            key=f"qty_add_{formule_id}",
                        )

                    with col3:
                        # Trouver l'index de "unité" pour le mettre par défaut
                        index_unite_defaut = 0
                        for i, u in enumerate(unites):
                            if u["nom"].lower() == "unité":
                                index_unite_defaut = i
                                break
                        
                        selected_unite = st.selectbox(
                            "Unité",
                            options=unites,
                            index=index_unite_defaut,
                            format_func=lambda u: u["nom"],
                            key=f"unite_select_{formule_id}",
                        )
                        selected_unite_id = selected_unite["id"]

                    with col4:
                        st.write("")
                        st.write("")
                        if st.button("Ajouter", key=f"add_btn_{formule_id}", use_container_width=True):
                            if add_produit_to_formule(formule_id, selected_prod_id, quantite, selected_unite_id):
                                st.success("✅ Produit ajouté !")
                                st.cache_data.clear()
                                st.rerun()
                            else:
                                st.error("❌ Ce produit est déjà dans la formule")
                else:
                    st.warning("⚠️ Créez d'abord des produits et des unités")

                if st.button(f"🗑️ Supprimer la formule '{nom_formule}'", key=f"del_formule_{formule_id}", type="secondary"):
                    if delete_formule(formule_id):
                        st.success("Formule supprimée !")
                        st.cache_data.clear()
                        st.rerun()
    else:
        st.info("Aucune formule. Créez-en une ci-dessus !")

    # Stats
    st.divider()
    col1, col2 = st.columns(2)
    with col1:
        st.metric("Total Formules", len(formules))
    with col2:
        total_produits = sum(len(f.get("produits", [])) for f in formules)
        st.metric("Total Produits dans formules", total_produits)