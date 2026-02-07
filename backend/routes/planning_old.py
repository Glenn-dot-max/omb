from fastapi import APIRouter, HTTPException
from database import get_supabase_client
from datetime import datetime, date
from typing import List, Dict, Any
from collections import defaultdict

router = APIRouter(prefix="/planning", tags=["planning"])
supabase = get_supabase_client()

@router.get("/production")
async def get_planning_production(date_debut: str, date_fin: str, type_formule: str = "toutes"):
    """
    Génère le planning de production pour une période donnée.

    Args: 
        date_debut: Date de début au format 'YYYY-MM-DD'.
        date_fin: Date de fin au format 'YYYY-MM-DD'.
        type_formule: Type de formule à filtrer ('toutes', 'Brunch', 'Non-Brunch').

    Returns:
        Planning de production avec produits organisés par commande.
    """

    try:
        # =========================================
        # 1. RÉCUPÉRER LES COMMANDES DE LA PÉRIODE
        # =========================================

        response = supabase.table("carnet_commande")\
            .select("*")\
            .gte("delivery_date", date_debut)\
            .lte("delivery_date", date_fin)\
            .order("delivery_date")\
            .execute()
        
        commandes = response.data

        if not commandes:
            return {
                "periode": {"debut": date_debut, "fin": date_fin},
                "commandes_count": 0,
                "planning": {}
            }
        
        # =========================================
        # 2. STRUCTURE DES DONNÉES POUR AGRÉGATION 
        # =========================================

        # Structure: {date: {"commandes": [...], "totaux": {...}}}
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

        # Pour récupérer les infos produits 
        produits_infos = {}

        # =========================================
        # 3. POUR CHAQUE COMMANDE
        # =========================================

        for commande in commandes:
            commande_id = commande["id"]
            delivery_date = commande["delivery_date"]
            nom_client = commande['nom_client']

            commande_data = {
                "id": commande_id,
                "client": nom_client,
                "heure": commande.get("delivery_hour", ""),
                "couverts": commande.get("nombre_couverts", 0),
                "produits": {}
            }

            # ----------------------------------------
            # VÉRIFICATION DU TYPE DE FORMULE
            # ----------------------------------------

            if type_formule != "toutes":
                formules_check = supabase.table("commande_formules")\
                    .select("formule_id")\
                    .eq("commande_id", commande_id)\
                    .execute()
                
                if not formules_check.data:
                    continue  # Pas de formules associées
                
                formule_correspond = False
                for fc in formules_check.data:
                    formule_info = supabase.table("formules")\
                        .select("type_formule")\
                        .eq("id", fc["formule_id"])\
                        .execute()
                    
                    if formule_info.data:
                        type_f = formule_info.data[0]["type_formule"]
                        if type_f == type_formule:
                            formule_correspond = True
                            break
                        
                if not formule_correspond:
                    continue  # Aucune formule ne correspond au type demandé

            # ----------------------------------------
            # 3a. PRODUITS DIRECTS de la commande
            # ----------------------------------------

            produits_directs = supabase.table("commande_produits")\
                .select("*")\
                .eq("commande_id", commande_id)\
                .execute()
            
            for cp in produits_directs.data:
                produit_id = cp["produit_id"]
                quantite = cp["quantite"]
                unite = cp["unite"]

                # Récupérer les infos du produit si pas encore fait
                if produit_id not in produits_infos:
                    prod_response = supabase.table("produits")\
                        .select("name, categorie_id, type_id")\
                        .eq("id", produit_id)\
                        .execute()
                    
                    if prod_response.data:
                        prod_data = prod_response.data[0]
                        
                        # Récupérer le nom de la catégorie
                        categorie_name = "Autre"
                        if prod_data.get("categorie_id"):
                            cat_response = supabase.table("categories")\
                                .select("name")\
                                .eq("id", prod_data["categorie_id"])\
                                .execute()
                            if cat_response.data:
                                categorie_name = cat_response.data[0]["name"]
                        
                        # Récupérer le nom du type
                        type_name = "Autre"
                        if prod_data.get("type_id"):
                            type_response = supabase.table("types")\
                                .select("name")\
                                .eq("id", prod_data["type_id"])\
                                .execute()
                            if type_response.data:
                                type_name = type_response.data[0]["name"]
                        
                        produits_infos[produit_id] = {
                            "name": prod_data["name"],
                            "categorie": categorie_name,
                            "type": type_name
                        }
                    else:
                        produits_infos[produit_id] = {
                            "name": "Produit inconnu",
                            "categorie": "Autre",
                            "type": "Autre"
                        }

                # Ajouter au planning
                prod_info = produits_infos[produit_id]

                # 1. Ajouter à la commande en cours
                if produit_id in commande_data["produits"]:
                    # Produit déjà présent → additionner (cas mixte)
                    commande_data["produits"][produit_id]["quantite"] += quantite
                    commande_data["produits"][produit_id]["source"] = "suppl"
                else:
                    # Nouveau produit → créer
                    commande_data["produits"][produit_id] = {
                        "nom": prod_info["name"],
                        "quantite": quantite,
                        "unite": unite,
                        "categorie": prod_info["categorie"],
                        "type": prod_info["type"],
                        "source": "suppl"
                    }
                
                # 2. Mettre à jour les totaux du jour
                planning[delivery_date]["totaux"][produit_id]["quantite"] += quantite
                planning[delivery_date]["totaux"][produit_id]["unite"] = unite
                planning[delivery_date]["totaux"][produit_id]["nom"] = prod_info["name"]
                planning[delivery_date]["totaux"][produit_id]["categorie"] = prod_info["categorie"]
                planning[delivery_date]["totaux"][produit_id]["type"] = prod_info["type"]
                
            # ----------------------------------------
            # 3b. PRODUITS VIA FORMULES de la commande
            # ----------------------------------------

            formules_commande = supabase.table("commande_formules")\
                .select("*")\
                .eq("commande_id", commande_id)\
                .execute()
            
            for cf in formules_commande.data:
                formule_id = cf["formule_id"]
                quantite_finale = cf["quantite_finale"]

                # Récupérer les produits de cette formule
                formule_produits = supabase.table("formule_produits")\
                    .select("*")\
                    .eq("formule_id", formule_id)\
                    .execute()
                
                for fp in formule_produits.data:
                    produit_id = fp["produit_id"]
                    quantite_par_personne = fp["quantite"]
                    unite = fp["unite"]

                    # Calculer la quantité totale pour cette commande
                    quantite_totale = quantite_par_personne * quantite_finale

                    # Récupérer les infos du produit
                    if produit_id not in produits_infos:
                        prod_response = supabase.table("produits")\
                            .select("name, categorie_id, type_id")\
                            .eq("id", produit_id)\
                            .execute()
                        
                        if prod_response.data:
                            prod_data = prod_response.data[0]
                            
                            # Récupérer le nom de la catégorie
                            categorie_name = "Autre"
                            if prod_data.get("categorie_id"):
                                cat_response = supabase.table("categories")\
                                    .select("name")\
                                    .eq("id", prod_data["categorie_id"])\
                                    .execute()
                                if cat_response.data:
                                    categorie_name = cat_response.data[0]["name"]
                            
                            # Récupérer le nom du type
                            type_name = "Autre"
                            if prod_data.get("type_id"):
                                type_response = supabase.table("types")\
                                    .select("name")\
                                    .eq("id", prod_data["type_id"])\
                                    .execute()
                                if type_response.data:
                                    type_name = type_response.data[0]["name"]
                            
                            produits_infos[produit_id] = {
                                "name": prod_data["name"],
                                "categorie": categorie_name,
                                "type": type_name
                            }
                        else:
                            produits_infos[produit_id] = {
                                "name": "Produit inconnu",
                                "categorie": "Autre",
                                "type": "Autre"
                            }

                    # Ajouter au planning
                    prod_info = produits_infos[produit_id]

                    # 1. Ajouter à la commande en cours
                    if produit_id in commande_data["produits"]:
                        # Produit déjà présent (cas mixte formule + suppl)
                        commande_data["produits"][produit_id]["quantite"] += quantite_totale
                        commande_data["produits"][produit_id]["source"] = "suppl"
                    else:
                        # Nouveau produit
                        commande_data["produits"][produit_id] = {
                            "nom": prod_info["name"],
                            "quantite": quantite_totale,
                            "unite": unite,
                            "categorie": prod_info["categorie"],
                            "type": prod_info["type"],
                            "source": "formule"
                        }

                    # 2. Mise à jour des totaux du jour
                    planning[delivery_date]["totaux"][produit_id]["quantite"] += quantite_totale
                    planning[delivery_date]["totaux"][produit_id]["unite"] = unite
                    planning[delivery_date]["totaux"][produit_id]["nom"] = prod_info["name"]
                    planning[delivery_date]["totaux"][produit_id]["categorie"] = prod_info["categorie"]
                    planning[delivery_date]["totaux"][produit_id]["type"] = prod_info["type"]
            
            # ----------------------------------------
            # 3c. AJOUTER LA COMMANDE AU PLANNING
            # ----------------------------------------
            
            planning[delivery_date]["commandes"].append(commande_data)

        # =========================================
        # 4. TRIER LES COMMANDES PAR HEURE
        # =========================================

        # Trier les commandes de chaque jour par heure de livraison
        for date_key in planning:
            planning[date_key]["commandes"].sort(key=lambda x: x.get("heure", ""))

        # =========================================
        # 5. CONVERTIR EN FORMAT JSON-FRIENDLY
        # =========================================

        planning_dict = {}
        for date_key, data in planning.items():
            planning_dict[date_key] = {
                "commandes": data["commandes"],
                "totaux": dict(data["totaux"])
            }
       
        # =========================================
        # 6. RETOURNER LE RÉSULTAT FINAL
        # =========================================

        return {
            "periode": {
                "debut": date_debut,
                "fin": date_fin
            },
            "commandes_count": len(commandes),
            "planning": planning_dict
        }
    
    except Exception as e:
        print(f"Erreur planning: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erreur lors de la génération du planning: {str(e)}")