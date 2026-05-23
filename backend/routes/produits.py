from fastapi import APIRouter, HTTPException, Depends
from auth import get_current_user, CATALOG_ADMIN_ROLES
from database import get_supabase_client 
from models import ProduitCreate, ProduitUpdate, ToggleFranchisesRequest
from fastapi.encoders import jsonable_encoder
from typing import List
import re

router = APIRouter(prefix="/produits", tags=["produits"])
supabase = get_supabase_client()


def normalize_produit_name(name: str) -> str:
    if not name:
        return ""
    return re.sub(
        r"\s*\(([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\)\s*$",
        "",
        name,
        flags=re.IGNORECASE,
    ).strip()

@router.get("/")
async def get_produits(current_user: dict = Depends(get_current_user)):
    """
    Get all produits:
    - TECH_ADMIN: tous les produits avec info sur les franchises liées
    - Franchise: uniquement les produits actifs pour leur franchise
    """

    if current_user.get("role") in CATALOG_ADMIN_ROLES:
        # 1️⃣ Récupérer tous les produits
        response = supabase.table("produits")\
            .select("*")\
            .order("name")\
            .execute()
        
        produits = response.data

        # 2️⃣ Récupérer toutes les franchises (UNE SEULE REQUÊTE)
        all_franchises = supabase.table("franchises").select("id, nom").execute()
        total_franchises = len(all_franchises.data)

        # Créer un dictionnaire {id: nom} pour accès rapide
        franchise_map = {str(f["id"]): f["nom"] for f in all_franchises.data}

        # 3️⃣ Récupérer TOUS les liens en plusieurs pages (pagination)
        from collections import defaultdict
        all_liens_data = []
        page_size = 1000
        offset = 0

        while True:
            liens_page = supabase.table("franchise_produits")\
                .select("produit_id, franchise_id")\
                .eq("active", True)\
                .range(offset, offset + page_size - 1)\
                .execute()
            
            if not liens_page.data:
                break
            
            all_liens_data.extend(liens_page.data)
            
            if len(liens_page.data) < page_size:
                break
            
            offset += page_size

        # 4️⃣ Regrouper les liens par produit_id
        liens_par_produit = defaultdict(list)
        for lien in all_liens_data:
            produit_id_str = str(lien["produit_id"])
            franchise_id_str = str(lien["franchise_id"])
            liens_par_produit[produit_id_str].append(franchise_id_str)
    
        enriched_produits = []

        for produit in produits:
            produit_id_str = str(produit["id"])
            franchise_ids = liens_par_produit.get(produit_id_str, [])

            franchises_liees = [
                franchise_map[fid] for fid in franchise_ids
                if fid in franchise_map
            ]

            nb_franchises_actives = len(franchises_liees)

            enriched_produit = {
                **produit,
                "nb_franchises": nb_franchises_actives,
                "total_franchises": total_franchises,
                "is_limited": 0 < nb_franchises_actives < total_franchises,
                "franchises": sorted(franchises_liees),
                "franchise_ids": franchise_ids,
            }

            enriched_produits.append(enriched_produit)

        return enriched_produits
    
    # Pour les utilisateurs franchisés
    franchise_id = current_user["franchise_id"]

    franchise_produits = supabase.table("franchise_produits")\
        .select("produit_id")\
        .eq("franchise_id", franchise_id)\
        .eq("active", True)\
        .execute()
    
    if not franchise_produits.data:
        return []
    
    produit_ids = [fp["produit_id"] for fp in franchise_produits.data]

    produits_resp = supabase.table("produits")\
        .select("*")\
        .in_("id", produit_ids)\
        .order("name")\
        .execute()

    produits = produits_resp.data

    all_franchises = supabase.table("franchises").select("id").execute()
    total_franchises = len(all_franchises.data)

    all_liens = supabase.table("franchise_produits")\
        .select("produit_id")\
        .in_("produit_id", produit_ids)\
        .eq("active", True)\
        .execute()

    from collections import Counter
    nb_par_produit = Counter(str(lien["produit_id"]) for lien in all_liens.data)

    for produit in produits:
        produit_id_str = str(produit["id"])
        produit["nb_franchises"] = nb_par_produit.get(produit_id_str, 0)
        produit["total_franchises"] = total_franchises
        produit["is_limited"] = 0 < produit["nb_franchises"] < total_franchises
        produit["franchises"] = []

    return produits

@router.get("/{produit_id}")
async def get_produit(produit_id: str, current_user: dict = Depends(get_current_user)):
    """Get a single produit by ID"""
    response = supabase.table("produits")\
        .select("*")\
        .eq("id", produit_id)\
        .execute()
    
    if not response.data:
        raise HTTPException(status_code=404, detail="Produit not found")
    return response.data[0]

@router.post("/")
async def create_produit(produit: ProduitCreate, current_user: dict = Depends(get_current_user)):
    """
    Create a new produit

    TECH_ADMIN:
    - franchise_ids = None ou [] : ajouter à TOUTES les franchises
    - franchise_ids = ["id1"] : ajouter uniquement à cette franchise
    - franchise_ids = ["id1", "id2"] : ajouter à ces franchises
    
    FRANCHISE:
    - Crée le produit uniquement pour SA franchise (ignore franchise_ids)
    """

    produit_data = produit.model_dump(exclude={"franchise_ids"})
    produit_data["is_global"] = True

    print(f"🆕 Creating Produit: {produit_data}")

    if current_user.get("role") in CATALOG_ADMIN_ROLES:
        # TECH_ADMIN : nom globalement unique
        existing = supabase.table("produits")\
            .select("id")\
            .eq("name", produit.name)\
            .execute()

        if existing.data:
            raise HTTPException(status_code=409, detail="Un produit avec ce nom existe déjà")

        response = supabase.table("produits").insert(produit_data).execute()
        if not response.data:
            raise HTTPException(status_code=400, detail="Failed to create Produit")

        nouveau_produit = response.data[0]
        franchise_ids = produit.franchise_ids

        if not franchise_ids:
            franchises = supabase.table("franchises").select("id").execute()
            franchise_ids = [f["id"] for f in franchises.data]
            print(f"✅ TECH_ADMIN : Ajout à TOUTES les franchises ({len(franchise_ids)})")
        else:
            print(f"✅ TECH_ADMIN : Ajout aux franchises spécifiées ({len(franchise_ids)})")
    
    else:
        # FRANCHISE : autoriser recréation d'un nom désactivé pour sa franchise
        franchise_id = current_user["franchise_id"]

        same_name_produits = supabase.table("produits")\
            .select("id, name")\
            .eq("name", produit.name)\
            .execute()

        reusable_produit_id = None
        has_active_with_same_name = False

        if same_name_produits.data:
            same_name_ids = [p["id"] for p in same_name_produits.data]
            same_name_links = supabase.table("franchise_produits")\
                .select("produit_id, active")\
                .in_("produit_id", same_name_ids)\
                .eq("franchise_id", franchise_id)\
                .execute()

            for link in same_name_links.data:
                if link.get("active") is True:
                    has_active_with_same_name = True
                    break
                if link.get("active") is False and reusable_produit_id is None:
                    reusable_produit_id = link["produit_id"]

        if has_active_with_same_name:
            raise HTTPException(
                status_code=409,
                detail="Un produit actif avec ce nom existe déjà pour votre franchise"
            )

        if reusable_produit_id:
            updated = supabase.table("produits")\
                .update({
                    "name": produit_data["name"],
                    "categorie_id": produit_data.get("categorie_id"),
                    "type_id": produit_data.get("type_id"),
                })\
                .eq("id", reusable_produit_id)\
                .execute()

            supabase.table("franchise_produits")\
                .update({"active": True})\
                .eq("produit_id", reusable_produit_id)\
                .eq("franchise_id", franchise_id)\
                .execute()

            print(f"✅ FRANCHISE : Produit réactivé et mis à jour ({reusable_produit_id})")

            return jsonable_encoder(updated.data[0] if updated.data else {
                "id": reusable_produit_id,
                **produit_data,
            })

        # Sinon on crée un nouveau produit ; si collision globale, fallback suffixé franchise
        try:
            response = supabase.table("produits").insert(produit_data).execute()
        except Exception:
            safe_name = f"{normalize_produit_name(produit_data['name'])} ({franchise_id})"
            response = supabase.table("produits").insert({
                **produit_data,
                "name": safe_name,
            }).execute()

        if not response.data:
            raise HTTPException(status_code=400, detail="Failed to create Produit")

        nouveau_produit = response.data[0]
        franchise_ids = [franchise_id]
        print(f"✅ FRANCHISE : Ajout uniquement à la franchise de l'utilisateur ({franchise_id})")

    liens_crees = 0
    for franchise_id in franchise_ids:
        try:
            supabase.table("franchise_produits").insert({
                "franchise_id": franchise_id,
                "produit_id": nouveau_produit["id"],
                "active": True
            }).execute()
            liens_crees += 1
        except Exception as e:
            print(f"⚠️ Erreur ajout franchise {franchise_id}: {str(e)}")

    print(f"✅ Produit créé et activé pour {liens_crees} franchise(s)")

    return jsonable_encoder(nouveau_produit)

@router.delete("/{produit_id}")
async def delete_produit(produit_id: str, current_user: dict = Depends(get_current_user)):
    """
    Delete/Deactivate a produit
    - TECH_ADMIN: supprime complètement le produit
    - FRANCHISE: désactive le produit uniquement pour sa franchise (active = FALSE)
    """

    print(f"🗑️ DELETE REQUEST - Produit ID: {produit_id}")

    # Vérifier que le produit existe
    existing = supabase.table("produits")\
        .select("*")\
        .eq("id", produit_id)\
        .execute()
    
    if not existing.data:
        raise HTTPException(status_code=404, detail="Produit not found")
    
    # 🔓 TECH_ADMIN : suppression complète
    if current_user.get("role") in CATALOG_ADMIN_ROLES:
        print(f"✅ TECH_ADMIN : Suppression complète du produit {produit_id}")
        
        try:
            # Supprimer les liens franchise_produits d'abord
            supabase.table("franchise_produits")\
                .delete()\
                .eq("produit_id", produit_id)\
                .execute()
            
            # Puis supprimer le produit
            response = supabase.table("produits")\
                .delete()\
                .eq("id", produit_id)\
                .execute()
            
            print(f"✅ Produit supprimé complètement : {produit_id}")

            return {
                "success": True,
                "message": "Produit supprimé définitivement",
                "deleted_id": produit_id
            }
        
        except Exception as e:
            print(f"❌ Delete error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Erreur lors de la suppression: {str(e)}")
    
    # 🔒 FRANCHISE : désactivation uniquement pour sa franchise
    else:
        franchise_id = current_user["franchise_id"]
        
        # Vérifier que le lien existe pour cette franchise
        lien = supabase.table("franchise_produits")\
            .select("*")\
            .eq("produit_id", produit_id)\
            .eq("franchise_id", franchise_id)\
            .execute()
        
        if not lien.data:
            raise HTTPException(status_code=404, detail="Produit not found pour cette franchise")
        
        try:
            # Vérifier si c'est un produit propre à cette franchise
            all_links = supabase.table("franchise_produits")\
                .select("franchise_id")\
                .eq("produit_id", produit_id)\
                .execute()

            is_franchise_owned = (
                len(all_links.data) == 1
                and all_links.data[0].get("franchise_id") == franchise_id
            )

            if is_franchise_owned:
                supabase.table("franchise_produits")\
                    .delete()\
                    .eq("produit_id", produit_id)\
                    .execute()

                supabase.table("produits")\
                    .delete()\
                    .eq("id", produit_id)\
                    .execute()

                print(f"✅ FRANCHISE : Copie produit supprimée définitivement {produit_id}")

                return {
                    "success": True,
                    "message": "Votre copie de produit a été supprimée définitivement",
                    "deleted_id": produit_id,
                    "hard_deleted": True,
                }

            # Sinon simple désactivation pour la franchise
            supabase.table("franchise_produits")\
                .update({"active": False})\
                .eq("produit_id", produit_id)\
                .eq("franchise_id", franchise_id)\
                .execute()
            
            print(f"✅ FRANCHISE : Produit désactivé pour la franchise {franchise_id}")
            
            return {
                "success": True,
                "message": "Produit désactivé pour votre franchise (toujours visible pour les autres)",
                "deleted_id": produit_id,
                "hard_deleted": False,
            }
        
        except Exception as e:
            print(f"❌ Deactivate error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Erreur lors de la désactivation: {str(e)}")


@router.patch("/{produit_id}/franchises")
async def toggle_produit_franchises(produit_id: str, request: ToggleFranchisesRequest, current_user: dict = Depends(get_current_user)):
    """
    Activer/ Désactiver un produit pour certaines franchises (TECH_ADMIN only)

    Body:
    {
        "franchise_ids": ["id1", "id2"],
        "active": true
    }
    """

    if current_user.get("role") not in CATALOG_ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Only TECH_ADMIN/CATALOG_ADMIN can toggle franchises")

    # Vérifier que le produit existe
    existing = supabase.table("produits")\
        .select("*")\
        .eq("id", produit_id)\
        .execute()
    
    if not existing.data:
        raise HTTPException(status_code=404, detail="Produit not found")
    
    print(f"🔄 TECH_ADMIN : {'Activation' if request.active else 'Désactivation'} du produit {produit_id} pour les franchises {request.franchise_ids}")

    modifications = 0
    creations = 0
    erreurs = []

    for franchise_id in request.franchise_ids:
        try:
            lien_existant = supabase.table("franchise_produits")\
                .select("*")\
                .eq("produit_id", produit_id)\
                .eq("franchise_id", franchise_id)\
                .execute()
            
            if lien_existant.data:
                supabase.table("franchise_produits")\
                    .update({"active": request.active})\
                    .eq("produit_id", produit_id)\
                    .eq("franchise_id", franchise_id)\
                    .execute()
                modifications += 1
                print(f"✅ Modifié franchise {franchise_id}")
            else:
                if request.active:
                    supabase.table("franchise_produits").insert({
                        "franchise_id": franchise_id,
                        "produit_id": produit_id,
                        "active": True
                    }).execute()
                    creations += 1
                    print(f"✅ Créé lien pour franchise {franchise_id}")
                else:
                    print(f"⚠️ Aucun lien à désactiver pour la franchise {franchise_id}")

        except Exception as e:
            erreurs.append(f"Franchise {franchise_id}: {str(e)}")
            print(f"❌ Erreur pour franchise {franchise_id} - {str(e)}")

    return {
        "success": True,
        "message": f"Produit {'activé' if request.active else 'désactivé'} pour les franchises sélectionnées",
        "produit_id": produit_id,
        "modifications": modifications,
        "creations": creations,
        "erreurs": erreurs
    }


@router.patch("/{produit_id}")
async def update_produit(produit_id: str, produit: ProduitUpdate, current_user: dict = Depends(get_current_user)):
    """
    Update an existing produit
    - TECH_ADMIN: peut modifier n'importe quel produit
    - FRANCHISE: peut modifier. Si produit partagé, crée une copie exclusive
    """

    print(f"✏️ UPDATE REQUEST - Produit ID: {produit_id}")

    # Vérifier que le produit existe
    existing = supabase.table("produits")\
        .select("*")\
        .eq("id", produit_id)\
        .execute()
    
    if not existing.data:
        raise HTTPException(status_code=404, detail="Produit not found")
    
    if current_user.get("role") in CATALOG_ADMIN_ROLES:
        print(f"✅ TECH_ADMIN : Modification globale autorisée")

        response = supabase.table("produits")\
            .update(produit.model_dump(exclude_unset=True))\
            .eq("id", produit_id)\
            .execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Produit not found")
        
        print(f"✅ Produit modifié : {produit_id}")
        return response.data[0]

    franchise_id = current_user["franchise_id"]

    liens = supabase.table("franchise_produits")\
        .select("franchise_id")\
        .eq("produit_id", produit_id)\
        .eq("active", True)\
        .execute()
    
    if not liens.data:
        raise HTTPException(status_code=404, detail="Produit not found")

    has_access = any(str(lien["franchise_id"]) == str(franchise_id) for lien in liens.data)
    if not has_access:
        raise HTTPException(status_code=403, detail="Vous n'avez pas accès à ce produit.")

    # Produit partagé => créer une copie exclusive
    if len(liens.data) > 1:
        print("⚠️ FRANCHISE : Produit partagé - Création d'une copie exclusive")

        existing_product = existing.data[0]
        payload = produit.model_dump(exclude_unset=True)
        base_name = payload.get("name") or existing_product["name"]
        new_produit_data = {
            "name": base_name,
            "categorie_id": payload.get("categorie_id", existing_product.get("categorie_id")),
            "type_id": payload.get("type_id", existing_product.get("type_id")),
            "is_global": True,
        }

        try:
            new_produit_response = supabase.table("produits").insert(new_produit_data).execute()
        except Exception:
            fallback_name = f"{normalize_produit_name(base_name)} ({franchise_id})"
            new_produit_data["name"] = fallback_name
            new_produit_response = supabase.table("produits").insert(new_produit_data).execute()

        if not new_produit_response.data:
            raise HTTPException(status_code=500, detail="Erreur lors de la création de la copie")

        new_produit_id = new_produit_response.data[0]["id"]

        # Désactiver l'ancien produit pour cette franchise
        supabase.table("franchise_produits")\
            .update({"active": False})\
            .eq("produit_id", produit_id)\
            .eq("franchise_id", franchise_id)\
            .execute()

        # Activer la copie pour cette franchise
        supabase.table("franchise_produits").insert({
            "franchise_id": franchise_id,
            "produit_id": new_produit_id,
            "active": True
        }).execute()

        print(f"✅ FRANCHISE : Copie exclusive créée et activée ({new_produit_id})")

        return {
            **new_produit_response.data[0],
            "is_new_copy": True,
            "message": "Une copie exclusive a été créée pour votre franchise"
        }

    # Produit exclusif à la franchise => update direct
    response = supabase.table("produits")\
        .update(produit.model_dump(exclude_unset=True))\
        .eq("id", produit_id)\
        .execute()

    if not response.data:
        raise HTTPException(status_code=404, detail="Produit not found")

    print(f"✅ FRANCHISE : Produit exclusif modifié {produit_id}")
    return response.data[0]
