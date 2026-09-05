from fastapi import APIRouter, HTTPException, Depends
from auth import get_current_user, is_catalog_admin, CATALOG_ADMIN_ROLES
from database import get_supabase_client
from models import FormuleCreate, FormuleUpdate, ToggleFranchisesRequest
from fastapi.encoders import jsonable_encoder
from typing import List
import re

router = APIRouter(prefix="/formules", tags=["formules"])
supabase = get_supabase_client()


def normalize_formule_name(name: str) -> str:
    if not name:
        return ""
    return re.sub(
        r"\s*\(([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\)\s*$",
        "",
        name,
        flags=re.IGNORECASE,
    ).strip()

@router.get("/")
async def get_formules(current_user: dict = Depends(get_current_user)):
    """
    Get all formules:
    - TECH_ADMIN: toutes les formules avec info sur les franchises liées
    - Franchise: uniquement les formules actives pour leur franchise
    """

    if current_user.get("role") in CATALOG_ADMIN_ROLES:
        response = supabase.table("formules")\
            .select("*")\
            .order("name")\
            .execute()

        formules = response.data

        all_franchises = supabase.table("franchises").select("id, nom").execute()
        total_franchises = len(all_franchises.data)
        franchise_map = {f["id"]: f["nom"] for f in all_franchises.data}

        all_liens_data = []
        page_size = 1000
        offset = 0

        while True:
            liens_page = supabase.table("franchise_formules")\
                .select("formule_id, franchise_id")\
                .eq("active", True)\
                .range(offset, offset + page_size - 1)\
                .execute()

            if not liens_page.data:
                break

            all_liens_data.extend(liens_page.data)

            if len(liens_page.data) < page_size:
                break

            offset += page_size

        from collections import defaultdict
        liens_par_formule = defaultdict(list)
        for lien in all_liens_data:
            liens_par_formule[lien["formule_id"]].append(lien["franchise_id"])

        for formule in formules:
            franchise_ids = liens_par_formule.get(formule["id"], [])
            franchises_liees = [franchise_map[fid] for fid in franchise_ids if fid in franchise_map]
            nb_franchises_actives = len(franchises_liees)
            formule["nb_franchises"] = nb_franchises_actives
            formule["total_franchises"] = total_franchises
            formule["is_limited"] = nb_franchises_actives < total_franchises
            formule["franchises"] = sorted(franchises_liees)
            formule["franchise_ids"] = franchise_ids

        return formules

    franchise_id = current_user["franchise_id"]

    franchise_formules = supabase.table("franchise_formules")\
        .select("formule_id")\
        .eq("franchise_id", franchise_id)\
        .eq("active", True)\
        .execute()

    if not franchise_formules.data:
        return []

    formule_ids = [fp["formule_id"] for fp in franchise_formules.data]

    formules = supabase.table("formules")\
        .select("*")\
        .in_("id", formule_ids)\
        .order("name")\
        .execute()

    all_franchises = supabase.table("franchises").select("id").execute()
    total_franchises = len(all_franchises.data)

    all_liens = supabase.table("franchise_formules")\
        .select("formule_id")\
        .in_("formule_id", formule_ids)\
        .eq("active", True)\
        .execute()

    from collections import Counter
    nb_par_formule = Counter(lien["formule_id"] for lien in all_liens.data)

    for formule in formules.data:
        formule["nb_franchises"] = nb_par_formule.get(formule["id"], 0)
        formule["total_franchises"] = total_franchises
        formule["is_limited"] = formule["nb_franchises"] < total_franchises
        formule["franchises"] = []

    return formules.data


@router.get("/restorable-shared")
async def get_restorable_shared_formules(
    franchise_id: str,
    current_user: dict = Depends(is_catalog_admin),
):
    """Liste des formules partagées qu'un admin catalogue peut réattribuer à une franchise."""

    inactive_links = supabase.table("franchise_formules")\
        .select("formule_id")\
        .eq("franchise_id", franchise_id)\
        .eq("active", False)\
        .execute()

    if not inactive_links.data:
        return []

    formule_ids = [row["formule_id"] for row in inactive_links.data if row.get("formule_id")]
    if not formule_ids:
        return []

    formules_resp = supabase.table("formules")\
        .select("id, name, nombre_couverts")\
        .in_("id", formule_ids)\
        .order("name")\
        .execute()

    if not formules_resp.data:
        return []

    active_links = supabase.table("franchise_formules")\
        .select("formule_id")\
        .in_("formule_id", formule_ids)\
        .eq("active", True)\
        .execute()

    from collections import Counter
    active_count_by_formule = Counter(row["formule_id"] for row in active_links.data)

    restorable = []
    for formule in formules_resp.data:
        active_elsewhere = active_count_by_formule.get(formule["id"], 0)
        if active_elsewhere >= 1:
            formule["active_other_franchises"] = active_elsewhere
            restorable.append(formule)

    return restorable


@router.get("/{formule_id}")
async def get_formule(formule_id: str, current_user: dict = Depends(get_current_user)):
    """Get a single formule by ID"""
    response = supabase.table("formules")\
        .select("*")\
        .eq("id", formule_id)\
        .execute()

    if not response.data:
        raise HTTPException(status_code=404, detail="Formule not found")
    return response.data[0]

@router.post("/")
async def create_formule(formule: FormuleCreate, current_user: dict = Depends(get_current_user)):
    """
    Create a new formule

    TECH_ADMIN:
    - franchise_ids = None ou [] : ajouter à TOUTES les franchises
    - franchise_ids = ["id1"] : ajouter uniquement à cette franchise
    - franchise_ids = ["id1", "id2"] : ajouter à ces franchises
    
    FRANCHISE:
    - Crée la formule uniquement pour SA franchise (ignore franchise_ids)
    """

    formule_data = formule.model_dump(exclude={"franchise_ids"})

    print(f"🆕 Creating Formule: {formule_data}")

    if current_user.get("role") in CATALOG_ADMIN_ROLES:
        # TECH_ADMIN : on garde un nom globalement unique
        existing = supabase.table("formules")\
            .select("id")\
            .eq("name", formule.name)\
            .execute()

        if existing.data:
            raise HTTPException(status_code=409, detail="Une formule avec ce nom existe déjà")

        response = supabase.table("formules").insert(formule_data).execute()
        if not response.data:
            raise HTTPException(status_code=400, detail="Failed to create Formule")

        nouvelle_formule = response.data[0]
        franchise_ids = formule.franchise_ids if hasattr(formule, 'franchise_ids') else None

        if not franchise_ids:
            franchises = supabase.table("franchises").select("id").execute()
            franchise_ids = [f["id"] for f in franchises.data]
            print(f"✅ TECH_ADMIN : Ajout à TOUTES les franchises ({len(franchise_ids)})")
        else:
            print(f"✅ TECH_ADMIN : Ajout aux franchises spécifiées ({len(franchise_ids)})")
    
    else:
        # FRANCHISE : autoriser la recréation d'un nom déjà désactivé pour cette franchise
        franchise_id = current_user["franchise_id"]

        same_name_formules = supabase.table("formules")\
            .select("id")\
            .eq("name", formule.name)\
            .execute()

        reusable_formule_id = None
        has_active_with_same_name = False

        if same_name_formules.data:
            same_name_ids = [f["id"] for f in same_name_formules.data]
            same_name_links = supabase.table("franchise_formules")\
                .select("formule_id, active")\
                .in_("formule_id", same_name_ids)\
                .eq("franchise_id", franchise_id)\
                .execute()

            for link in same_name_links.data:
                if link.get("active") is True:
                    has_active_with_same_name = True
                    break
                if link.get("active") is False and reusable_formule_id is None:
                    reusable_formule_id = link["formule_id"]

        if has_active_with_same_name:
            raise HTTPException(
                status_code=409,
                detail="Une formule active avec ce nom existe déjà pour votre franchise"
            )

        if reusable_formule_id:
            # Réutiliser l'ancienne formule désactivée comme une nouvelle création
            updated = supabase.table("formules")\
                .update({
                    "name": formule_data["name"],
                    "nombre_couverts": formule_data["nombre_couverts"],
                })\
                .eq("id", reusable_formule_id)\
                .execute()

            # Nettoyer les anciens produits pour repartir sur une création "propre"
            supabase.table("formule_produits")\
                .delete()\
                .eq("formule_id", reusable_formule_id)\
                .execute()

            # Réactiver le lien franchise
            supabase.table("franchise_formules")\
                .update({"active": True})\
                .eq("formule_id", reusable_formule_id)\
                .eq("franchise_id", franchise_id)\
                .execute()

            print(f"✅ FRANCHISE : Formule réactivée et réinitialisée ({reusable_formule_id})")

            return jsonable_encoder(updated.data[0] if updated.data else {
                "id": reusable_formule_id,
                **formule_data,
            })

        # Sinon on crée une nouvelle formule; si collision globale, fallback suffixé franchise
        try:
            response = supabase.table("formules").insert(formule_data).execute()
        except Exception:
            safe_name = f"{formule_data['name']} ({franchise_id})"
            response = supabase.table("formules").insert({
                **formule_data,
                "name": safe_name,
            }).execute()

        if not response.data:
            raise HTTPException(status_code=400, detail="Failed to create Formule")

        nouvelle_formule = response.data[0]
        franchise_ids = [franchise_id]
        print(f"✅ FRANCHISE : Ajout uniquement à la franchise de l'utilisateur ({franchise_id})")

    liens_crees = 0
    if franchise_ids:
        liens_data = [
            {
                "franchise_id": franchise_id,
                "formule_id": nouvelle_formule["id"],
                "active": True
            }
            for franchise_id in franchise_ids
        ]
        try:
            liens_response = supabase.table("franchise_formules").insert(liens_data).execute()
            liens_crees = len(liens_response.data) if liens_response.data else 0
        except Exception as e:
            print(f"⚠️ Erreur création liens franchise_formules: {str(e)}")

    print (f"✅ Formule créée et activée pour {liens_crees} franchise(s)")

    return jsonable_encoder(nouvelle_formule)

@router.delete("/{formule_id}")
async def delete_formule(formule_id: str, current_user: dict = Depends(get_current_user)):
    """
    Delete/Deactivate a formule
    - TECH_ADMIN: supprime complètement la formule
    - FRANCHISE: désactive la formule uniquement pour sa franchise (active = FALSE)
    """

    print(f"🗑️ DELETE REQUEST - Formule ID: {formule_id}")

    # Vérifier que la formule existe
    existing = supabase.table("formules")\
        .select("*")\
        .eq("id", formule_id)\
        .execute()
    
    if not existing.data:
        raise HTTPException(status_code=404, detail="Formule not found")
    
    # 🔓 TECH_ADMIN : suppression complète
    if current_user.get("role") in CATALOG_ADMIN_ROLES:
        print(f"✅ TECH_ADMIN : Suppression complète de la formule {formule_id}")
        
        try:
            # Supprimer les liens franchise_formules d'abord
            supabase.table("franchise_formules")\
                .delete()\
                .eq("formule_id", formule_id)\
                .execute()
            
            # Puis supprimer la formule
            response = supabase.table("formules")\
                .delete()\
                .eq("id", formule_id)\
                .execute()
            
            print(f"✅ Formule supprimée complètement : {formule_id}")

            return {
                "success": True,
                "message": "Formule supprimée définitivement",
                "deleted_id": formule_id
            }
        
        except Exception as e:
            print(f"❌ Delete error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Erreur lors de la suppression: {str(e)}")
    
    # 🔒 FRANCHISE : désactivation uniquement pour sa franchise
    else:
        franchise_id = current_user["franchise_id"]
        
        # Vérifier que le lien existe pour cette franchise
        lien = supabase.table("franchise_formules")\
            .select("*")\
            .eq("formule_id", formule_id)\
            .eq("franchise_id", franchise_id)\
            .execute()
        
        if not lien.data:
            raise HTTPException(status_code=404, detail="Formule not found pour cette franchise")
        
        try:
            # Vérifier si la formule est une copie propre à cette franchise
            all_links = supabase.table("franchise_formules")\
                .select("franchise_id")\
                .eq("formule_id", formule_id)\
                .execute()

            is_franchise_owned = (
                len(all_links.data) == 1
                and all_links.data[0].get("franchise_id") == franchise_id
            )

            if is_franchise_owned:
                # Nettoyage complet en base (copie franchise)
                supabase.table("formule_produits")\
                    .delete()\
                    .eq("formule_id", formule_id)\
                    .execute()

                supabase.table("franchise_formules")\
                    .delete()\
                    .eq("formule_id", formule_id)\
                    .execute()

                supabase.table("formules")\
                    .delete()\
                    .eq("id", formule_id)\
                    .execute()

                print(f"✅ FRANCHISE : Copie formule supprimée définitivement {formule_id}")

                return {
                    "success": True,
                    "message": "Votre copie de formule a été supprimée définitivement",
                    "deleted_id": formule_id,
                    "hard_deleted": True,
                }

            # Sinon, comportement normal: simple désactivation
            supabase.table("franchise_formules")\
                .update({"active": False})\
                .eq("formule_id", formule_id)\
                .eq("franchise_id", franchise_id)\
                .execute()

            print(f"✅ FRANCHISE : Formule désactivée pour la franchise {franchise_id}")

            return {
                "success": True,
                "message": "Formule désactivée pour votre franchise (toujours visible pour les autres)",
                "deleted_id": formule_id,
                "hard_deleted": False,
            }
        
        except Exception as e:
            print(f"❌ Deactivate error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Erreur lors de la désactivation: {str(e)}")

@router.patch("/{formule_id}/franchises")
async def toggle_formule_franchises(formule_id: str, request: ToggleFranchisesRequest, current_user: dict = Depends(is_catalog_admin)):
    """
    Activer/Désactiver une formule pour certaines franchises (TECH_ADMIN only)

    Body:
    {
        "franchise_ids": ["id1", "id2"],
        "active": true
    }
    """

    # Vérifier que la formule existe
    existing = supabase.table("formules")\
        .select("*")\
        .eq("id", formule_id)\
        .execute()
    
    if not existing.data:
        raise HTTPException(status_code=404, detail="Formule not found")
    
    print(f"🔄 TECH_ADMIN : {'Activation' if request.active else 'Désactivation'} de la formule {formule_id} pour les franchises {request.franchise_ids}")

    modifications = 0
    creations = 0
    erreurs = []

    for franchise_id in request.franchise_ids:
        try:
            lien_existant = supabase.table("franchise_formules")\
                .select("*")\
                .eq("formule_id", formule_id)\
                .eq("franchise_id", franchise_id)\
                .execute()
            
            if lien_existant.data:
                supabase.table("franchise_formules")\
                    .update({"active": request.active})\
                    .eq("formule_id", formule_id)\
                    .eq("franchise_id", franchise_id)\
                    .execute()
                modifications += 1
                print(f"✅ Modifié franchise {franchise_id}")
            else:
                if request.active:
                    supabase.table("franchise_formules").insert({
                        "franchise_id": franchise_id,
                        "formule_id": formule_id,
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
        "message": f"Formule {'activée' if request.active else 'désactivée'} pour les franchises sélectionnées",
        "formule_id": formule_id,
        "modifications": modifications,
        "creations": creations,
        "erreurs": erreurs
    }


@router.post("/{formule_id}/restore-original")
async def restore_shared_original_formule(formule_id: str, current_user: dict = Depends(get_current_user)):
    """
    Restaure la version partagée d'une formule pour un utilisateur franchisé.
    - Désactive la formule actuelle (copie franchise)
    - Réactive une ancienne version partagée
    """

    if current_user.get("role") in CATALOG_ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Action réservée aux utilisateurs franchisés")

    franchise_id = current_user["franchise_id"]

    # Vérifier que la formule actuelle est active pour la franchise
    current_link = supabase.table("franchise_formules")\
        .select("formule_id")\
        .eq("formule_id", formule_id)\
        .eq("franchise_id", franchise_id)\
        .eq("active", True)\
        .execute()

    if not current_link.data:
        raise HTTPException(status_code=404, detail="Formule active introuvable pour votre franchise")

    current_formule = supabase.table("formules")\
        .select("id, name")\
        .eq("id", formule_id)\
        .execute()

    if not current_formule.data:
        raise HTTPException(status_code=404, detail="Formule actuelle introuvable")

    current_base_name = normalize_formule_name(current_formule.data[0].get("name", ""))

    # Chercher les anciennes formules inactives pour cette franchise
    inactive_links = supabase.table("franchise_formules")\
        .select("formule_id")\
        .eq("franchise_id", franchise_id)\
        .eq("active", False)\
        .execute()

    if not inactive_links.data:
        raise HTTPException(status_code=404, detail="Aucune version partagée à restaurer")

    inactive_ids = [row["formule_id"] for row in inactive_links.data if row.get("formule_id")]
    if not inactive_ids:
        raise HTTPException(status_code=404, detail="Aucune version partagée à restaurer")

    inactive_formules = supabase.table("formules")\
        .select("id, name")\
        .in_("id", inactive_ids)\
        .execute()

    if not inactive_formules.data:
        raise HTTPException(status_code=404, detail="Aucune formule candidate à restaurer")

    best_candidate = None
    best_score = (-1, -1)  # (name_match, active_count)

    for candidate in inactive_formules.data:
        candidate_id = candidate["id"]
        candidate_base_name = normalize_formule_name(candidate.get("name", ""))
        name_match = 1 if candidate_base_name == current_base_name else 0

        active_count_resp = supabase.table("franchise_formules")\
            .select("franchise_id")\
            .eq("formule_id", candidate_id)\
            .eq("active", True)\
            .execute()

        active_count = len(active_count_resp.data)

        # On privilégie une vraie formule partagée
        if active_count < 2:
            continue

        score = (name_match, active_count)
        if score > best_score:
            best_score = score
            best_candidate = candidate

    if not best_candidate:
        raise HTTPException(
            status_code=404,
            detail="Aucune version partagée correspondante n'a été trouvée"
        )

    restored_formule_id = best_candidate["id"]

    # Si la formule actuelle est une copie propre franchise, la supprimer complètement
    current_all_links = supabase.table("franchise_formules")\
        .select("franchise_id")\
        .eq("formule_id", formule_id)\
        .execute()

    is_franchise_owned_current = (
        len(current_all_links.data) == 1
        and current_all_links.data[0].get("franchise_id") == franchise_id
    )

    if is_franchise_owned_current:
        supabase.table("formule_produits")\
            .delete()\
            .eq("formule_id", formule_id)\
            .execute()

        supabase.table("franchise_formules")\
            .delete()\
            .eq("formule_id", formule_id)\
            .execute()

        supabase.table("formules")\
            .delete()\
            .eq("id", formule_id)\
            .execute()
    else:
        # Sinon simple désactivation du lien courant
        supabase.table("franchise_formules")\
            .update({"active": False})\
            .eq("formule_id", formule_id)\
            .eq("franchise_id", franchise_id)\
            .execute()

    # Réactiver la formule partagée pour cette franchise
    supabase.table("franchise_formules")\
        .update({"active": True})\
        .eq("formule_id", restored_formule_id)\
        .eq("franchise_id", franchise_id)\
        .execute()

    return {
        "success": True,
        "message": "Version partagée restaurée",
        "restored_formule_id": restored_formule_id,
        "disabled_formule_id": formule_id,
        "hard_deleted_current": is_franchise_owned_current,
    }

@router.patch("/{formule_id}")
async def update_formule(formule_id: str, formule: FormuleUpdate, current_user: dict = Depends(get_current_user)):
    """
    Update an existing formule
    - TECH_ADMIN: peut modifier n'importe quelle formule
    - FRANCHISE: peut modifier. Si formule partagée, crée une copie exclusive avec copie des produits
    """

    print(f"✏️ UPDATE REQUEST - Formule ID: {formule_id}")

    # Vérifier que la formule existe
    existing = supabase.table("formules")\
        .select("*")\
        .eq("id", formule_id)\
        .execute()
    
    if not existing.data:
        raise HTTPException(status_code=404, detail="Formule not found")
    
    if current_user.get("role") in CATALOG_ADMIN_ROLES:
        print(f"✅ TECH_ADMIN : Modification globale autorisée")
        
        response = supabase.table("formules")\
            .update(formule.model_dump(exclude_unset=True))\
            .eq("id", formule_id)\
            .execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Formule not found")
        
        print(f"✅ Formule modifiée : {formule_id}")
        return response.data[0]

    else:
        # 🔒 FRANCHISE : Logique de copie pour formules partagées
        franchise_id = current_user["franchise_id"]

        liens = supabase.table("franchise_formules")\
            .select("franchise_id")\
            .eq("formule_id", formule_id)\
            .execute()
        
        if not liens.data:
            raise HTTPException(status_code=404, detail="Formule not found")
        
        # Vérifier que l'utilisateur a accès à cette formule
        has_access = any(lien["franchise_id"] == franchise_id for lien in liens.data)
        if not has_access:
            raise HTTPException(status_code=403, detail="Vous n'avez pas accès à cette formule.")
        
        # Si formule partagée (plusieurs franchises), créer une copie exclusive
        if len(liens.data) > 1:
            print(f"⚠️ FRANCHISE : Formule partagée - Création d'une copie exclusive")
            
            # Créer la nouvelle formule, en gérant les conflits de nom
            base_name = formule.name or existing.data[0]["name"]
            new_formule_data = {
                "name": base_name,
                "nombre_couverts": formule.nombre_couverts or existing.data[0]["nombre_couverts"],
            }

            try:
                new_formule_response = supabase.table("formules").insert(new_formule_data).execute()
            except Exception:
                # Si le nom existe déjà, on génère un nom franchise-safe
                fallback_name = f"{base_name} ({franchise_id})"
                new_formule_data["name"] = fallback_name
                new_formule_response = supabase.table("formules").insert(new_formule_data).execute()
            
            if not new_formule_response.data:
                raise HTTPException(status_code=500, detail="Erreur lors de la création de la copie")
            
            new_formule_id = new_formule_response.data[0]["id"]
            print(f"✅ Nouvelle formule créée : {new_formule_id}")
            
            # Copier les produits de l'ancienne formule vers la nouvelle
            old_formule_produits = supabase.table("formule_produits")\
                .select("*")\
                .eq("formule_id", formule_id)\
                .execute()
            
            if old_formule_produits.data:
                for produit in old_formule_produits.data:
                    try:
                        supabase.table("formule_produits").insert({
                            "formule_id": new_formule_id,
                            "produit_id": produit["produit_id"],
                            "quantite": produit["quantite"],
                            "unite": produit.get("unite", "")
                        }).execute()
                    except Exception as e:
                        print(f"⚠️ Erreur copie produit {produit['produit_id']}: {str(e)}")
            
            print(f"✅ {len(old_formule_produits.data)} produit(s) copiés")
            
            # Désactiver l'ancienne formule pour cette franchise
            supabase.table("franchise_formules")\
                .update({"active": False})\
                .eq("formule_id", formule_id)\
                .eq("franchise_id", franchise_id)\
                .execute()
            
            print(f"✅ Ancienne formule désactivée pour la franchise")
            
            # Activer la nouvelle formule pour cette franchise
            supabase.table("franchise_formules").insert({
                "franchise_id": franchise_id,
                "formule_id": new_formule_id,
                "active": True
            }).execute()
            
            print(f"✅ FRANCHISE : Copie exclusive créée et activée")
            
            return {
                **new_formule_response.data[0],
                "is_new_copy": True,
                "message": "Une copie exclusive a été créée pour votre franchise"
            }
        
        else:
            # Modification simple si exclusive
            print(f"✅ FRANCHISE : Modification autorisée (formule exclusive)")
            
            response = supabase.table("formules")\
                .update(formule.model_dump(exclude_unset=True))\
                .eq("id", formule_id)\
                .execute()
            
            if not response.data:
                raise HTTPException(status_code=404, detail="Formule not found")
            
            print(f"✅ Formule modifiée : {formule_id}")
            
            return {
                **response.data[0],
                "is_new_copy": False
            }