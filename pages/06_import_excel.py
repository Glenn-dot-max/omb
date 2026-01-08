# pages/07_import_excel.py
import streamlit as st
import pandas as pd
import io
import sys
from pathlib import Path

# Ajouter le chemin parent pour importer database
sys.path.append(str(Path(__file__).parent.parent))

from database import (
    get_produits,
    add_produit,
    get_categories,
    add_category,
    get_types,
    add_type,
    get_formules,
    create_formule,
    add_produit_to_formule,
    get_unites,
    add_unite,
    init_db_if_needed
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
st.set_page_config(page_title="Import Excel", page_icon="📥", layout="wide")

# Initialiser la base
init_db_if_needed()

# Titre
st.title("📥 Import de Données Excel")

st.info("💡 Importez vos produits et formules depuis un fichier Excel au format OMB")

# Tabs
tab1, tab2, tab3 = st.tabs(["📦 Import Produits", "📋 Import Formules", "📄 Templates"])

# ============== TAB 1 : IMPORT PRODUITS ==============
with tab1:
    st.header("📦 Import des Produits")
    
    st.write("### Format attendu")
    st.info("Le fichier doit contenir une feuille **'Gestionnaire produits'** avec les colonnes : `Catégorie | Type | Produit`")
    
    # Upload du fichier
    uploaded_file_produits = st.file_uploader(
        "Choisir un fichier Excel (.xlsx, .xlsm)",
        type=["xlsx", "xlsm"],
        key="upload_produits"
    )
    
    if uploaded_file_produits:
        try:
            # Lire le fichier Excel
            df = pd.read_excel(uploaded_file_produits, sheet_name='Gestionnaire produits', engine='openpyxl')
            
            # Nettoyer les noms de colonnes
            df.columns = df.columns.str.strip()
            
            st.success(f"✅ Fichier chargé : {len(df)} lignes détectées")
            
            # Prévisualisation
            with st.expander("👁️ Prévisualisation des données", expanded=True):
                st.dataframe(df.head(20), use_container_width=True)
            
            st.divider()
            
            # Options d'import
            st.write("### ⚙️ Options d'import")
            
            col1, col2 = st.columns(2)
            with col1:
                creer_categories = st.checkbox("Créer automatiquement les catégories manquantes", value=True)
            with col2:
                creer_types = st.checkbox("Créer automatiquement les types manquants", value=True)
            
            # Bouton d'import
            if st.button("🚀 Lancer l'import", type="primary", use_container_width=True):
                
                # Récupérer les données existantes
                categories_existantes = {cat['nom']: cat['id'] for cat in get_categories()}
                types_existants = {typ['nom']: typ['id'] for typ in get_types()}
                produits_existants = {p['nom'].lower(): p['id'] for p in get_produits()}
                
                # Compteurs
                nb_crees = 0
                nb_ignores = 0
                nb_erreurs = 0
                categories_creees = []
                types_crees = []
                
                # Barre de progression
                progress_bar = st.progress(0)
                status_text = st.empty()
                
                for index, row in df.iterrows():
                    progress = (index + 1) / len(df)
                    progress_bar.progress(progress)
                    
                    categorie_nom = str(row.get('Catégorie', '')).strip() if pd.notna(row.get('Catégorie')) else ''
                    type_nom = str(row.get('Type', '')).strip() if pd.notna(row.get('Type')) else ''
                    produit_nom = str(row.get('Produit', '')).strip() if pd.notna(row.get('Produit')) else ''
                    
                    # Ignorer les lignes vides
                    if not produit_nom:
                        continue
                    
                    status_text.text(f"Traitement : {produit_nom}...")
                    
                    # Vérifier si le produit existe déjà
                    if produit_nom.lower() in produits_existants:
                        # Demander à l'utilisateur
                        if f'doublon_{index}' not in st.session_state:
                            st.session_state[f'doublon_{index}'] = None
                        
                        if st.session_state[f'doublon_{index}'] is None:
                            st.warning(f"⚠️ Le produit **{produit_nom}** existe déjà")
                            col1, col2 = st.columns(2)
                            with col1:
                                if st.button("Ignorer", key=f"ignore_{index}"):
                                    st.session_state[f'doublon_{index}'] = 'ignore'
                                    nb_ignores += 1
                                    st.rerun()
                            with col2:
                                if st.button("Remplacer", key=f"replace_{index}"):
                                    st.session_state[f'doublon_{index}'] = 'replace'
                                    st.rerun()
                            continue
                        elif st.session_state[f'doublon_{index}'] == 'ignore':
                            nb_ignores += 1
                            continue
                    
                    # Gérer la catégorie
                    categorie_id = None
                    if categorie_nom:
                        if categorie_nom not in categories_existantes:
                            if creer_categories:
                                if add_category(categorie_nom):
                                    categories_existantes[categorie_nom] = max([cat['id'] for cat in get_categories()])
                                    categories_creees.append(categorie_nom)
                                    categorie_id = categories_existantes[categorie_nom]
                        else:
                            categorie_id = categories_existantes[categorie_nom]
                    
                    # Gérer le type
                    type_id = None
                    if type_nom:
                        if type_nom not in types_existants:
                            if creer_types:
                                if add_type(type_nom):
                                    types_existants[type_nom] = max([typ['id'] for typ in get_types()])
                                    types_crees.append(type_nom)
                                    type_id = types_existants[type_nom]
                        else:
                            type_id = types_existants[type_nom]
                    
                    # Ajouter le produit
                    if add_produit(produit_nom, categorie_id, type_id):
                        nb_crees += 1
                    else:
                        nb_erreurs += 1
                
                progress_bar.progress(1.0)
                status_text.empty()
                
                # Rapport final
                st.success("✅ Import terminé !")
                
                col1, col2, col3 = st.columns(3)
                with col1:
                    st.metric("Produits créés", nb_crees)
                with col2:
                    st.metric("Produits ignorés", nb_ignores)
                with col3:
                    st.metric("Erreurs", nb_erreurs)
                
                if categories_creees:
                    st.info(f"📁 Catégories créées : {', '.join(categories_creees)}")
                
                if types_crees:
                    st.info(f"🏷️ Types créés : {', '.join(types_crees)}")
                
                st.balloons()
        
        except Exception as e:
            st.error(f"❌ Erreur lors de la lecture du fichier : {str(e)}")
            st.write("Assurez-vous que le fichier contient une feuille nommée 'Gestionnaire produits'")

# ============== TAB 2 : IMPORT FORMULES ==============
with tab2:
    st.header("📋 Import des Formules")
    
    st.write("### Format attendu")
    st.info("Le fichier doit contenir une feuille **'Gestionnaire formule'** avec les colonnes : `Nom formule | Nom produit | Catégorie | TYPE | Quantité/clients`")
    
    # Upload du fichier
    uploaded_file_formules = st.file_uploader(
        "Choisir un fichier Excel (.xlsx, .xlsm)",
        type=["xlsx", "xlsm"],
        key="upload_formules"
    )
    
    if uploaded_file_formules:
        try:
            # Lire le fichier Excel
            df = pd.read_excel(uploaded_file_formules, sheet_name='Gestionnaire formule', engine='openpyxl')
            
            # Nettoyer les noms de colonnes
            df.columns = df.columns.str.strip()
            
            st.success(f"✅ Fichier chargé : {len(df)} lignes détectées")
            
            # Prévisualisation
            with st.expander("👁️ Prévisualisation des données", expanded=True):
                st.dataframe(df.head(20), use_container_width=True)
            
            st.divider()
            
            # Bouton d'import
            if st.button("🚀 Lancer l'import des formules", type="primary", use_container_width=True):
                
                # Récupérer les données existantes
                produits_existants = {p['nom'].lower(): p['id'] for p in get_produits()}
                formules_existantes = {f['nom']: f['id'] for f in get_formules()}
                unites_existantes = {u['nom'].lower(): u['id'] for u in get_unites()}
                
                # Ajouter l'unité par défaut si elle n'existe pas
                if 'unité' not in unites_existantes:
                    add_unite('unité')
                    unites_existantes['unité'] = max([u['id'] for u in get_unites()])
                
                # Compteurs
                nb_formules_creees = 0
                nb_produits_ajoutes = 0
                nb_erreurs = 0
                formule_courante = None
                formule_id_courante = None
                
                # Barre de progression
                progress_bar = st.progress(0)
                status_text = st.empty()
                
                for index, row in df.iterrows():
                    progress = (index + 1) / len(df)
                    progress_bar.progress(progress)
                    
                    formule_nom = str(row.get('Nom formule', '')).strip() if pd.notna(row.get('Nom formule')) else ''
                    produit_nom = str(row.get('Nom produit', '')).strip() if pd.notna(row.get('Nom produit')) else ''
                    quantite = float(row.get('Quantité/ clients', 0)) if pd.notna(row.get('Quantité/ clients')) else 0
                    
                    # Ignorer les lignes vides
                    if not formule_nom or not produit_nom:
                        continue
                    
                    status_text.text(f"Traitement : {formule_nom} - {produit_nom}...")
                    
                    # Créer une nouvelle formule si nécessaire
                    if formule_nom != formule_courante:
                        formule_courante = formule_nom
                        
                        if formule_nom not in formules_existantes:
                            formule_id = create_formule(formule_nom)
                            if formule_id:
                                formules_existantes[formule_nom] = formule_id
                                formule_id_courante = formule_id
                                nb_formules_creees += 1
                        else:
                            formule_id_courante = formules_existantes[formule_nom]
                    
                    # Ajouter le produit à la formule
                    if formule_id_courante:
                        # Trouver le produit
                        produit_id = produits_existants.get(produit_nom.lower())
                        
                        if produit_id:
                            # Utiliser l'unité par défaut (unité)
                            unite_id = unites_existantes.get('unité')
                            
                            if add_produit_to_formule(formule_id_courante, produit_id, quantite, unite_id):
                                nb_produits_ajoutes += 1
                            else:
                                nb_erreurs += 1
                        else:
                            st.warning(f"⚠️ Produit non trouvé : {produit_nom}")
                            nb_erreurs += 1
                
                progress_bar.progress(1.0)
                status_text.empty()
                
                # Rapport final
                st.success("✅ Import des formules terminé !")
                
                col1, col2, col3 = st.columns(3)
                with col1:
                    st.metric("Formules créées", nb_formules_creees)
                with col2:
                    st.metric("Produits ajoutés", nb_produits_ajoutes)
                with col3:
                    st.metric("Erreurs", nb_erreurs)
                
                st.balloons()
        
        except Exception as e:
            st.error(f"❌ Erreur lors de la lecture du fichier : {str(e)}")
            st.write("Assurez-vous que le fichier contient une feuille nommée 'Gestionnaire formule'")

# ============== TAB 3 : TEMPLATES ==============
with tab3:
    st.header("📄 Templates Excel")
    
    st.write("### Télécharger les templates")
    st.info("Utilisez ces templates pour préparer vos données avant l'import")
    
    # Template Produits
    st.write("#### 📦 Template Produits")
    
    # Créer un DataFrame exemple
    df_template_produits = pd.DataFrame({
        'Catégorie': ['Pains et Viennoiseries', 'Pains et Viennoiseries', 'Produits laitiers', 'Épicerie', 'Épicerie'],
        'Type': ['Salé', 'Salé', 'Salé', 'Sucré', 'Sucré'],
        'Produit': ['Pain complet', 'Croissant', 'Beurre doux', 'Confiture fraise', 'Confiture abricot']
    })
    
    st.dataframe(df_template_produits, use_container_width=True)
    
    # Créer le fichier Excel en mémoire
    output_produits = io.BytesIO()
    with pd.ExcelWriter(output_produits, engine='openpyxl') as writer:
        df_template_produits.to_excel(writer, sheet_name='Gestionnaire produits', index=False)
    output_produits.seek(0)
    
    st.download_button(
        label="📥 Télécharger template_produits.xlsx",
        data=output_produits,
        file_name="template_produits.xlsx",
        mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        use_container_width=True
    )
    
    st.divider()
    
    # Template Formules
    st.write("#### 📋 Template Formules")
    
    df_template_formules = pd.DataFrame({
        'Nom formule': ['Menu Petit-déjeuner', 'Menu Petit-déjeuner', 'Menu Petit-déjeuner', 'Menu Déjeuner', 'Menu Déjeuner'],
        'Nom produit': ['Pain complet', 'Beurre doux', 'Confiture fraise', 'Croissant', 'Confiture abricot'],
        'Catégorie': ['Pains et Viennoiseries', 'Produits laitiers', 'Épicerie', 'Pains et Viennoiseries', 'Épicerie'],
        'TYPE': ['Salé', 'Salé', 'Sucré', 'Salé', 'Sucré'],
        'Quantité/ clients': [0.5, 20, 15, 2, 10]
    })
    
    st.dataframe(df_template_formules, use_container_width=True)
    
    # Créer le fichier Excel en mémoire
    output_formules = io.BytesIO()
    with pd.ExcelWriter(output_formules, engine='openpyxl') as writer:
        df_template_formules.to_excel(writer, sheet_name='Gestionnaire formule', index=False)
    output_formules.seek(0)
    
    st.download_button(
        label="📥 Télécharger template_formules.xlsx",
        data=output_formules,
        file_name="template_formules.xlsx",
        mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        use_container_width=True
    )
    
    st.divider()
    
    # NOUVEAU : Template Complet (Produits + Formules)
    st.write("#### 🎯 Template Complet (Produits + Formules)")
    st.success("💡 Fichier tout-en-un pour importer produits ET formules en une seule fois !")
    
    # Créer un fichier avec les deux feuilles
    output_complet = io.BytesIO()
    with pd.ExcelWriter(output_complet, engine='openpyxl') as writer:
        # Feuille 1 : Produits avec plus d'exemples
        df_produits_complet = pd.DataFrame({
            'Catégorie': [
                'Pains et Viennoiseries', 'Pains et Viennoiseries', 'Pains et Viennoiseries',
                'Produits laitiers', 'Produits laitiers',
                'Épicerie', 'Épicerie',
                'Fruits', 'Fruits',
                'Charcuterie', 'Fromages'
            ],
            'Type': [
                'Salé', 'Salé', 'Sucré',
                'Salé', 'Salé',
                'Sucré', 'Sucré',
                'Sucré', 'Sucré',
                'Salé', 'Salé'
            ],
            'Produit': [
                'Pain complet', 'Baguette tradition', 'Croissant',
                'Beurre doux', 'Fromage blanc',
                'Confiture fraise', 'Miel',
                'Jus d\'orange', 'Salade de fruits',
                'Jambon blanc', 'Comté 18 mois'
            ]
        })
        
        # Feuille 2 : Formules correspondantes
        df_formules_complet = pd.DataFrame({
            'Nom formule': [
                'Menu Petit-déjeuner', 'Menu Petit-déjeuner', 'Menu Petit-déjeuner', 'Menu Petit-déjeuner',
                'Brunch Gourmand', 'Brunch Gourmand', 'Brunch Gourmand', 'Brunch Gourmand', 'Brunch Gourmand',
                'Pause Café', 'Pause Café', 'Pause Café',
                'Plateau Déjeuner', 'Plateau Déjeuner', 'Plateau Déjeuner', 'Plateau Déjeuner'
            ],
            'Nom produit': [
                'Pain complet', 'Beurre doux', 'Confiture fraise', 'Jus d\'orange',
                'Croissant', 'Baguette tradition', 'Fromage blanc', 'Salade de fruits', 'Jus d\'orange',
                'Croissant', 'Pain complet', 'Confiture fraise',
                'Baguette tradition', 'Jambon blanc', 'Comté 18 mois', 'Beurre doux'
            ],
            'Catégorie': [
                'Pains et Viennoiseries', 'Produits laitiers', 'Épicerie', 'Fruits',
                'Pains et Viennoiseries', 'Pains et Viennoiseries', 'Produits laitiers', 'Fruits', 'Fruits',
                'Pains et Viennoiseries', 'Pains et Viennoiseries', 'Épicerie',
                'Pains et Viennoiseries', 'Charcuterie', 'Fromages', 'Produits laitiers'
            ],
            'TYPE': [
                'Salé', 'Salé', 'Sucré', 'Sucré',
                'Sucré', 'Salé', 'Salé', 'Sucré', 'Sucré',
                'Sucré', 'Salé', 'Sucré',
                'Salé', 'Salé', 'Salé', 'Salé'
            ],
            'Quantité/ clients': [
                0.5, 20, 15, 250,
                2, 0.3, 100, 150, 200,
                1.5, 0.25, 10,
                0.5, 80, 40, 15
            ]
        })
        
        df_produits_complet.to_excel(writer, sheet_name='Gestionnaire produits', index=False)
        df_formules_complet.to_excel(writer, sheet_name='Gestionnaire formule', index=False)
    
    output_complet.seek(0)
    
    # Afficher un aperçu
    col1, col2 = st.columns(2)
    with col1:
        st.write("**Feuille 'Gestionnaire produits'**")
        st.dataframe(df_produits_complet.head(5), use_container_width=True)
    with col2:
        st.write("**Feuille 'Gestionnaire formule'**")
        st.dataframe(df_formules_complet.head(5), use_container_width=True)
    
    st.download_button(
        label="📥 Télécharger template_complet.xlsx (Produits + Formules)",
        data=output_complet,
        file_name="template_OMB_complet.xlsx",
        mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        use_container_width=True,
        type="primary"
    )
    
    st.divider()
    
    st.write("### 💡 Conseils d'utilisation")
    
    with st.expander("📖 Guide pas à pas", expanded=False):
        st.markdown("""
        ### 🎯 Workflow recommandé
        
        **Option 1 : Import séparé (plus de contrôle)**
        1. Téléchargez `template_produits.xlsx`
        2. Remplissez avec vos produits
        3. Importez dans l'onglet "Import Produits"
        4. Téléchargez `template_formules.xlsx`
        5. Remplissez avec vos formules (en utilisant les noms de produits déjà importés)
        6. Importez dans l'onglet "Import Formules"
        
        **Option 2 : Import groupé (plus rapide)**
        1. Téléchargez `template_OMB_complet.xlsx`
        2. Remplissez les deux feuilles :
           - **'Gestionnaire produits'** : Tous vos produits
           - **'Gestionnaire formule'** : Toutes vos formules
        3. Importez d'abord les produits (onglet "Import Produits")
        4. Puis importez les formules (onglet "Import Formules")
        
        ### ✏️ Remplissage du fichier
        
        **Pour les Produits :**
        - **Catégorie** : Nom de la catégorie (ex: "Pains et Viennoiseries")
        - **Type** : "Salé" ou "Sucré"
        - **Produit** : Nom exact du produit
        
        **Pour les Formules :**
        - **Nom formule** : Répétez le même nom pour tous les produits d'une formule
        - **Nom produit** : Doit correspondre EXACTEMENT au nom dans la feuille produits
        - **Quantité/ clients** : Quantité par personne (ex: 0.5 = demi-portion, 20 = 20g)
        
        ### ⚠️ Points d'attention
        
        - Les noms de produits doivent être **exactement identiques** entre les deux feuilles
        - Utilisez des nombres décimaux avec un point : `0.5` et non `0,5`
        - Les catégories et types seront créés automatiquement si activé
        - Importez TOUJOURS les produits AVANT les formules
        """)
    
    with st.expander("❓ Questions fréquentes", expanded=False):
        st.markdown("""
        **Q: Que se passe-t-il si un produit existe déjà ?**  
        R: Vous aurez le choix entre "Ignorer" ou "Remplacer"
        
        **Q: Puis-je importer plusieurs formules en une fois ?**  
        R: Oui ! Répétez simplement le nom de la formule sur plusieurs lignes avec différents produits
        
        **Q: Que faire si un produit n'est pas trouvé lors de l'import des formules ?**  
        R: Le système vous alertera. Assurez-vous que le produit existe d'abord dans la base
        
        **Q: Les unités sont-elles gérées automatiquement ?**  
        R: Oui, l'unité par défaut "unité" est utilisée. Vous pourrez la modifier ensuite dans la page Formules
        
        **Q: Puis-je modifier le template ?**  
        R: Oui, mais gardez les noms de colonnes et de feuilles identiques
        """)