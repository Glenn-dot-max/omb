from fastapi import APIRouter, HTTPException, Depends
from auth import get_current_user, is_tech_admin
from database import get_supabase_client
from models import FormuleCreate, FormuleUpdate, ToggleFranchisesRequest
from fastapi.encoders import jsonable_encoder
from typing import List

router = APIRouter(prefix="/formules", tags=["formules"])
supabase = get_supabase_client()

@router.get("/")
async def get_formules(current_user: dict = Depends(get_current_user)):
    """
    Get all formules:
    - TECH_ADMIN: toutes les formules avec info sur les franchises liées
    - Franchise: uniquement les formules actives pour leur franchise
    """

    if current_user.get("role") == "TECH_ADMIN":
        # 1️⃣ Récupérer toutes les formules
        response = supabase.table("formules")\
            .select("*")\
            .order("name")\
            .execute()
        
        formules = response.data

        # 2️⃣ Récupérer toutes les franchises (UNE SEULE REQUÊTE)
        all_franchises = supabase.table("franchises").select("id, nom").execute()
        total_franchises = len(all_franchises.data)
        
        # Créer un dictionnaire {id: nom} pour accès rapide
        franchise_map = {f["id"]: f["nom"] for f in all_franchises.data}

        # 3️⃣ Récupérer TOUS les liens franchise_formules actifs (UNE SEULE REQUÊTE)
        all_liens = supabase.table("franchise_formules")\
            .select("formule_id, franchise_id")\
            .eq("active", True)\
            .execute()
        
        # 4️⃣ Regrouper les liens par formule_id
        from collections import defaultdict
        liens_par_formule = defaultdict(list)
        for lien in all_liens.data:
            liens_par_formule[lien["formule_id"]].append(lien["franchise_id"])
        
        # 5️⃣ Ajouter les métadonnées à chaque formule (EN MÉMOIRE)
        for formule in formules:
            franchise_ids = liens_par_formule.get(formule["id"], [])
            
            # Récupérer les noms des franchises
            franchises_liees = [
                franchise_map[fid] for fid in franchise_ids 
                if fid in franchise_map
            ]
            
            nb_franchises_actives = len(franchises_liees)
            
            # Ajouter les métadonnées
            formule["nb_franchises"] = nb_franchises_actives
            formule["total_franchises"] = total_franchises
            formule["is_limited"] = nb_franchises_actives < total_franchises
            formule["franchises"] = sorted(franchises_liees)
        
        return formules
    
    # Pour les utilisateurs franchisés
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
    
    return formules.data

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

    # Vérifier si la formule existe déjà
    existing = supabase.table("formules")\
        .select("*")\
        .eq("name", formule.name)\
        .execute()
    
    if existing.data:
        raise HTTPException(status_code=409, detail="Une formule avec ce nom existe déjà")
    
    formule_data = formule.model_dump(exclude={"franchise_ids"})

    print(f"🆕 Creating Formule: {formule_data}")

    # Créer la formule
    response = supabase.table("formules").insert(formule_data).execute()

    if not response.data:
        raise HTTPException(status_code=400, detail="Failed to create Formule")
    
    nouvelle_formule = response.data[0]

    if current_user.get("role") == "TECH_ADMIN":
        franchise_ids = formule.franchise_ids if hasattr(formule, 'franchise_ids') else None

        if not franchise_ids:
            franchises = supabase.table("franchises").select("id").execute()
            franchise_ids = [f["id"] for f in franchises.data]
            print(f"✅ TECH_ADMIN : Ajout à TOUTES les franchises ({len(franchise_ids)})")
        else:
            print(f"✅ TECH_ADMIN : Ajout aux franchises spécifiées ({len(franchise_ids)})")
    
    else:
        franchise_ids = [current_user["franchise_id"]]
        print(f"✅ FRANCHISE : Ajout uniquement à la franchise de l'utilisateur ({current_user['franchise_id']})")

    liens_crees = 0
    for franchise_id in franchise_ids:
        try:
            supabase.table("franchise_formules").insert({
                "franchise_id": franchise_id,
                "formule_id": nouvelle_formule["id"],
                "active": True
            }).execute()
            liens_crees += 1
        except Exception as e:
            print(f"⚠️ Erreur ajout franchise {franchise_id}: {str(e)}")

    print(f"✅ Formule créée et activée pour {liens_crees} franchise(s)")

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
    if current_user.get("role") == "TECH_ADMIN":
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
            # Désactiver la formule pour cette franchise
            supabase.table("franchise_formules")\
                .update({"active": False})\
                .eq("formule_id", formule_id)\
                .eq("franchise_id", franchise_id)\
                .execute()
            
            print(f"✅ FRANCHISE : Formule désactivée pour la franchise {franchise_id}")
            
            return {
                "success": True,
                "message": "Formule désactivée pour votre franchise (toujours visible pour les autres)",
                "deleted_id": formule_id
            }
        
        except Exception as e:
            print(f"❌ Deactivate error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Erreur lors de la désactivation: {str(e)}")

@router.patch("/{formule_id}/franchises")
async def toggle_formule_franchises(formule_id: str, request: ToggleFranchisesRequest, current_user: dict = Depends(is_tech_admin)):
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

@router.patch("/{formule_id}")
async def update_formule(formule_id: str, formule: FormuleUpdate, current_user: dict = Depends(get_current_user)):
    """
    Update an existing formule
    - TECH_ADMIN: peut modifier n'importe quelle formule
    - FRANCHISE: peut modifier uniquement si formule exclusive à sa franchise
    """

    print(f"✏️ UPDATE REQUEST - Formule ID: {formule_id}")

    # Vérifier que la formule existe
    existing = supabase.table("formules")\
        .select("*")\
        .eq("id", formule_id)\
        .execute()
    
    if not existing.data:
        raise HTTPException(status_code=404, detail="Formule not found")
    
    if current_user.get("role") == "TECH_ADMIN":
        print(f"✅ TECH_ADMIN : Modification globale autorisée")

    else:
        franchise_id = current_user["franchise_id"]

        liens = supabase.table("franchise_formules")\
            .select("franchise_id")\
            .eq("formule_id", formule_id)\
            .execute()
        
        if not liens.data:
            raise HTTPException(status_code=404, detail="Formule not found")
        
        if len(liens.data) > 1:
            raise HTTPException(status_code=403, detail="Cette formule est partagée avec d'autres franchises. Seul TECH_ADMIN peut la modifier.")
        
        if liens.data[0]["franchise_id"] != franchise_id:
            raise HTTPException(status_code=403, detail="Vous n'avez pas la permission de modifier cette formule partagée.")
        
        print(f"✅ FRANCHISE : Modification autorisée pour la franchise {franchise_id}")

    response = supabase.table("formules")\
        .update(formule.model_dump(exclude_unset=True))\
        .eq("id", formule_id)\
        .execute()
    
    if not response.data:
        raise HTTPException(status_code=404, detail="Formule not found")
    
    print(f"✅ Formule modifiée : {formule_id}")

    return response.data[0]