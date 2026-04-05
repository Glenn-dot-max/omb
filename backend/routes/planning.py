from fastapi import APIRouter, HTTPException, Depends
from auth import get_current_user
from database import get_supabase_client
from datetime import datetime, date
from typing import List, Dict, Any
from collections import defaultdict
import traceback

router = APIRouter(prefix="/planning", tags=["planning"])
supabase = get_supabase_client()

@router.get("/production")
async def get_planning_production(date_debut: str, date_fin: str, type_formule: str = "toutes", current_user: dict = Depends(get_current_user)):
    """
    VERSION OPTIMISÉE - Récupération séparée puis jointure en mémoire
    """
    
    try:
        print(f"\n{'='*60}")
        print(f"🚀 Génération du planning: {date_debut} → {date_fin}")
        print(f"   Type formule: {type_formule}")
        print(f"{'='*60}\n")
        
        # =========================================
        # ÉTAPE 1: RÉCUPÉRER LES COMMANDES
        # =========================================
        
        print("📦 Étape 1: Récupération des commandes...")
        all_commandes_response = supabase.table("carnet_commande")\
            .select("*")\
            .eq("franchise_id", current_user["franchise_id"])\
            .gte("delivery_date", date_debut)\
            .lte("delivery_date", date_fin)\
            .order("delivery_date")\
            .execute()
        
        all_commandes = all_commandes_response.data

        # Séparer les commandes validées et non-validées
        commandes = [c for c in all_commandes if c.get("validated", True)]  # Validées par défaut
        commandes_non_validees = [c for c in all_commandes if not c.get("validated", True)]  # Non validées

        print(f"   ✅ {len(commandes)} commandes validées")
        print(f"   ⚠️ {len(commandes_non_validees)} commandes NON validées (exclues)")
        
        if not commandes:
            return {
                "periode": {"debut": date_debut, "fin": date_fin},
                "commandes_count": 0,
                "planning": {}
            }
        
        commande_ids = [c["id"] for c in commandes]
        
        # =========================================
        # ÉTAPE 2: PRÉ-CHARGER LES RELATIONS
        # =========================================
        
        print("\n📦 Étape 2: Pré-chargement des relations...")
        
        # 2.1 Commande → Formules
        print("   🔗 Récupération commande_formules...")
        commande_formules_response = supabase.table("commande_formules")\
            .select("*")\
            .in_("commande_id", commande_ids)\
            .execute()
        
        commande_formules_map = defaultdict(list)
        formule_ids = set()
        
        for cf in commande_formules_response.data:
            commande_formules_map[cf["commande_id"]].append(cf)
            formule_ids.add(cf["formule_id"])
        
        print(f"      ✅ {len(commande_formules_response.data)} relations | {len(formule_ids)} formules uniques")
        
        # 2.2 Récupérer les infos des formules
        formules_info_map = {}
        if formule_ids:
            print("   🔗 Récupération des formules...")
            formules_response = supabase.table("formules")\
                .select("id, name, type_formule")\
                .in_("id", list(formule_ids))\
                .eq("franchise_id", current_user["franchise_id"])\
                .execute()
            
            for f in formules_response.data:
                formules_info_map[f["id"]] = f
            
            print(f"      ✅ {len(formules_info_map)} formules")
        
        # 2.3 Commande → Produits directs
        print("   🔗 Récupération commande_produits...")
        commande_produits_response = supabase.table("commande_produits")\
            .select("*")\
            .in_("commande_id", commande_ids)\
            .execute()
        
        commande_produits_map = defaultdict(list)
        produit_ids = set()
        
        for cp in commande_produits_response.data:
            commande_produits_map[cp["commande_id"]].append(cp)
            produit_ids.add(cp["produit_id"])
        
        print(f"      ✅ {len(commande_produits_response.data)} produits directs")
        
        # 2.4 Formule → Produits
        formule_produits_map = defaultdict(list)
        if formule_ids:
            print("   🔗 Récupération formule_produits...")
            formule_produits_response = supabase.table("formule_produits")\
                .select("*")\
                .in_("formule_id", list(formule_ids))\
                .execute()
            
            for fp in formule_produits_response.data:
                formule_produits_map[fp["formule_id"]].append(fp)
                produit_ids.add(fp["produit_id"])
            
            print(f"      ✅ {len(formule_produits_response.data)} produits de formules")
        
        # =========================================
        # ÉTAPE 3: PRÉ-CHARGER LES PRODUITS
        # =========================================
        
        print(f"\n📦 Étape 3: Pré-chargement des produits ({len(produit_ids)} uniques)...")
        produits_infos = {}
        
        if produit_ids:
            # 3.1 Récupérer TOUS les produits EN UNE FOIS
            print("   🔗 Récupération des produits...")
            produits_response = supabase.table("produits")\
                .select("id, name, categorie_id, type_id")\
                .in_("id", list(produit_ids))\
                .eq("franchise_id", current_user["franchise_id"])\
                .execute()
            
            print(f"      ✅ {len(produits_response.data)} produits")
            
            # 3.2 Extraire les IDs de catégories et types
            categorie_ids = set()
            type_ids = set()
            
            for prod in produits_response.data:
                if prod.get("categorie_id"):
                    categorie_ids.add(prod["categorie_id"])
                if prod.get("type_id"):
                    type_ids.add(prod["type_id"])
            
            # 3.3 Récupérer TOUTES les catégories EN UNE FOIS
            categories_map = {}
            if categorie_ids:
                print(f"   🔗 Récupération de {len(categorie_ids)} catégories...")
                categories_response = supabase.table("categories")\
                    .select("id, name")\
                    .in_("id", list(categorie_ids))\
                    .execute()
                
                for cat in categories_response.data:
                    categories_map[cat["id"]] = cat["name"]
                
                print(f"      ✅ {len(categories_map)} catégories")
            
            # 3.4 Récupérer TOUS les types EN UNE FOIS
            types_map = {}
            if type_ids:
                print(f"   🔗 Récupération de {len(type_ids)} types...")
                types_response = supabase.table("types")\
                    .select("id, name")\
                    .in_("id", list(type_ids))\
                    .execute()
                
                for typ in types_response.data:
                    types_map[typ["id"]] = typ["name"]
                
                print(f"      ✅ {len(types_map)} types")
            
            # 3.5 JOINDRE EN MÉMOIRE (très rapide)
            print("   🔧 Jointure en mémoire...")
            for prod in produits_response.data:
                produits_infos[prod["id"]] = {
                    "name": prod["name"],
                    "categorie": categories_map.get(prod.get("categorie_id"), "Autre"),
                    "type": types_map.get(prod.get("type_id"), "Autre")
                }
            
            print(f"      ✅ {len(produits_infos)} produits enrichis")
        
        # =========================================
        # ÉTAPE 4: CONSTRUCTION DU PLANNING
        # =========================================
        
        print("\n📦 Étape 4: Construction du planning...")
        
        planning = defaultdict(lambda: {
            "commandes": [],
            "totaux": defaultdict(lambda: {
                "quantite": 0,
                "unite": "",
                "nom": "",
                "categorie": "",
                "type": ""
            })
        })
        
        # Filtrer les commandes par type de formule
        commandes_filtrees = []
        
        for commande in commandes:
            commande_id = commande["id"]
            
            # Vérification du type de formule
            if type_formule != "toutes":
                formules_commande = commande_formules_map.get(commande_id, [])
                
                if not formules_commande:
                    continue
                
                # Vérifier si au moins une formule correspond
                formule_correspond = False
                for cf in formules_commande:
                    formule_info = formules_info_map.get(cf["formule_id"])
                    if formule_info and formule_info.get("type_formule") == type_formule:
                        formule_correspond = True
                        break
                
                if not formule_correspond:
                    continue
            
            commandes_filtrees.append(commande)
        
        print(f"   ✅ {len(commandes_filtrees)} commandes après filtrage")
        
        # =========================================
        # ÉTAPE 5: TRAITER CHAQUE COMMANDE
        # =========================================
        
        print("\n📦 Étape 5: Traitement des commandes...")
        
        for commande in commandes_filtrees:
            commande_id = commande["id"]
            delivery_date = commande["delivery_date"]
            
            commande_data = {
                "id": commande_id,
                "client": commande.get('nom_client', ''),
                "heure": commande.get("delivery_hour", ""),
                "couverts": commande.get("nombre_couverts", 0),
                "produits": {}
            }
            
            # ----------------------------------------
            # 5a. PRODUITS DIRECTS
            # ----------------------------------------
            
            produits_directs = commande_produits_map.get(commande_id, [])
            
            for cp in produits_directs:
                produit_id = cp["produit_id"]
                quantite = cp["quantite"]
                unite = cp["unite"]
                
                prod_info = produits_infos.get(produit_id)
                if not prod_info:
                    print(f"      ⚠️ Produit {produit_id} non trouvé")
                    continue
                
                # Ajouter au dictionnaire de la commande
                if produit_id in commande_data["produits"]:
                    commande_data["produits"][produit_id]["quantite"] += quantite
                    commande_data["produits"][produit_id]["source"] = "mixte"
                else:
                    commande_data["produits"][produit_id] = {
                        "nom": prod_info["name"],
                        "quantite": quantite,
                        "unite": unite,
                        "categorie": prod_info["categorie"],
                        "type": prod_info["type"],
                        "source": "suppl"
                    }
                
                # Mettre à jour les totaux du jour
                planning[delivery_date]["totaux"][produit_id]["quantite"] += quantite
                planning[delivery_date]["totaux"][produit_id]["unite"] = unite
                planning[delivery_date]["totaux"][produit_id]["nom"] = prod_info["name"]
                planning[delivery_date]["totaux"][produit_id]["categorie"] = prod_info["categorie"]
                planning[delivery_date]["totaux"][produit_id]["type"] = prod_info["type"]
            
            # ----------------------------------------
            # 5b. PRODUITS VIA FORMULES
            # ----------------------------------------
            
            formules_commande = commande_formules_map.get(commande_id, [])
            
            for cf in formules_commande:
                formule_id = cf["formule_id"]
                quantite_finale = cf["quantite_finale"]
                
                # Récupérer les produits de cette formule
                formule_produits = formule_produits_map.get(formule_id, [])
                
                for fp in formule_produits:
                    produit_id = fp["produit_id"]
                    quantite_par_personne = fp["quantite"]
                    unite = fp["unite"]
                    quantite_totale = quantite_par_personne * quantite_finale
                    
                    prod_info = produits_infos.get(produit_id)
                    if not prod_info:
                        print(f"      ⚠️ Produit {produit_id} non trouvé")
                        continue
                    
                    # Ajouter au dictionnaire de la commande
                    if produit_id in commande_data["produits"]:
                        commande_data["produits"][produit_id]["quantite"] += quantite_totale
                        commande_data["produits"][produit_id]["source"] = "mixte"
                    else:
                        commande_data["produits"][produit_id] = {
                            "nom": prod_info["name"],
                            "quantite": quantite_totale,
                            "unite": unite,
                            "categorie": prod_info["categorie"],
                            "type": prod_info["type"],
                            "source": "formule"
                        }
                    
                    # Mettre à jour les totaux du jour
                    planning[delivery_date]["totaux"][produit_id]["quantite"] += quantite_totale
                    planning[delivery_date]["totaux"][produit_id]["unite"] = unite
                    planning[delivery_date]["totaux"][produit_id]["nom"] = prod_info["name"]
                    planning[delivery_date]["totaux"][produit_id]["categorie"] = prod_info["categorie"]
                    planning[delivery_date]["totaux"][produit_id]["type"] = prod_info["type"]
            
            # Ajouter la commande au planning
            planning[delivery_date]["commandes"].append(commande_data)
        
        # =========================================
        # ÉTAPE 6: FINALISATION
        # =========================================
        
        print("\n📦 Étape 6: Finalisation...")
        
        # Trier les commandes par heure
        for date_key in planning:
            planning[date_key]["commandes"].sort(key=lambda x: x.get("heure", ""))
        
        # Convertir en format JSON-friendly
        planning_dict = {}
        for date_key, data in planning.items():
            planning_dict[date_key] = {
                "commandes": data["commandes"],
                "totaux": dict(data["totaux"])
            }
        
        print(f"\n{'='*60}")
        print(f"✅ Planning généré avec succès!")
        print(f"   {len(commandes_filtrees)} commandes")
        print(f"   {len(planning_dict)} jours")
        print(f"{'='*60}\n")
        
        return {
            "periode": {
                "debut": date_debut,
                "fin": date_fin
            },
            "commandes_count": len(commandes_filtrees),
            "planning": planning_dict,
            "commandes_non_validees": [
                {
                    "id": c["id"],
                    "nom_client": c["nom_client"],
                    "delivery_date": c["delivery_date"],
                    "delivery_hour": c.get("delivery_hour", ""),
                    "nombre_couverts": c.get("nombre_couverts", 0)
                }
                for c in commandes_non_validees
            ]
        }
    
    except Exception as e:
        print(f"\n❌ ERREUR PLANNING:")
        print(f"   {str(e)}")
        print(f"\n📋 Traceback:")
        traceback.print_exc()
        print(f"{'='*60}\n")
        
        raise HTTPException(
            status_code=500, 
            detail=f"Erreur lors de la génération du planning: {str(e)}"
        )