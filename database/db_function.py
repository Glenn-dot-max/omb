# database/db_function.py
from .db_connection_pg import get_conn
from typing import Optional, List, Dict, Tuple

# ========== CATÉGORIES =============
def get_categories() -> List[Dict]:
    with get_conn() as c:
        c.execute("SELECT id, nom FROM categories ORDER BY nom")
        results = c.fetchall()
        return [{'id': r[0], 'nom': r[1]} for r in results]
    

def add_category(nom: str) -> bool:
    try:
        with get_conn() as c:
            c.execute("INSERT INTO categories (nom) VALUES (%s)", (nom,))
            return True
    except:
        return False

def delete_category(category_id: int) -> bool:
    try:
        with get_conn() as c:
            c.execute("SELECT COUNT(*) FROM produits WHERE categorie_id = %s", (category_id,))
            count = c.fetchone()[0]
            if count > 0:
                return False
            c.execute("DELETE FROM categories WHERE id = %s", (category_id,))
            return True
    except:
        return False

def update_category(category_id: int, nouveau_nom: str) -> bool:
    try:
        with get_conn() as c:
            c.execute("UPDATE categories SET nom = %s WHERE id = %s", (nouveau_nom, category_id))
            return True
    except:
        return False

# ========== TYPES =============

def get_types() -> List[Dict]:
    with get_conn() as c:
        c.execute("SELECT id, nom FROM types ORDER BY nom")
        results = c.fetchall()
        return [{'id': r[0], 'nom': r[1]} for r in results]

def add_type(nom: str) -> bool:
    try:
        with get_conn() as c:
            c.execute("INSERT INTO types (nom) VALUES (%s)", (nom,))
            return True
    except:
        return False

def delete_type(type_id: int) -> bool:
    try:
        with get_conn() as c:
            c.execute("SELECT COUNT(*) FROM produits WHERE type_id = %s", (type_id,))
            count = c.fetchone()[0]
            if count > 0:
                return False
            c.execute("DELETE FROM types WHERE id = %s", (type_id,))
            return True
    except:
        return False

def update_type(type_id: int, nouveau_nom: str) -> bool:
    try:
        with get_conn() as c:
            c.execute("UPDATE types SET nom = %s WHERE id = %s", (nouveau_nom, type_id))
            return True
    except:
        return False

# ========== UNITÉS =============

def get_unites() -> List[Dict]:
    with get_conn() as c:
        c.execute("SELECT id, nom FROM unite ORDER BY nom")
        results = c.fetchall()
        return [{'id': r[0], 'nom': r[1]} for r in results]
    
def add_unite(nom: str) -> bool:
    try:
        with get_conn() as c:
            c.execute("INSERT INTO unite (nom) VALUES (%s)", (nom,))
            return True
    except:
        return False

# ========== PRODUITS =============

def get_produits() -> List[Dict]:
    with get_conn() as c:
        c.execute("""
            SELECT p.id, p.produit, c.nom as categorie, t.nom as type
            FROM produits p
            LEFT JOIN categories c ON p.categorie_id = c.id
            LEFT JOIN types t ON p.type_id = t.id
            ORDER BY p.produit
        """)
        results = c.fetchall()
        return [{'id': r[0], 'nom': r[1], 'categorie': r[2], 'type': r[3]} for r in results]

def add_produit(nom: str, categorie_id: Optional[int], type_id: Optional[int]) -> bool:
    try:
        with get_conn() as c:
            c.execute("INSERT INTO produits (produit, categorie_id, type_id) VALUES (%s, %s, %s)", (nom, categorie_id, type_id))
            return True
    except:
        return False

def delete_produit(produit_id: int) -> bool:
    try:
        with get_conn() as c:
            c.execute("DELETE FROM produits WHERE id = %s", (produit_id,))
            return True
    except:
        return False

# ========== FORMULES =============
def create_formule(nom: str, type_formule: str = "Non-Brunch") -> Optional[int]:
    try:
        with get_conn() as c:
            c.execute("INSERT INTO formules (nom_formule, type_formule) VALUES (%s, %s) RETURNING id", (nom, type_formule))
            result = c.fetchone()
            return result[0] if result else None
    except:
        return None
    
def get_formules() -> List[Dict]:
    with get_conn() as c:
        c.execute("SELECT id, nom_formule, CURRENT_TIMESTAMP as date_creation, type_formule FROM formules ORDER BY nom_formule")
        results = c.fetchall()
        return [{'id': r[0], 'nom': r[1], 'date_creation': r[2], 'type_formule': r[3] if len(r) > 3 else 'Non-Brunch'} for r in results]

def update_formule(formule_id: int, type_formule: str) -> bool:
    """Met à jour le type d'une formule"""
    try:
        with get_conn() as c:
            c.execute("UPDATE formules SET type_formule = %s WHERE id = %s", (type_formule, formule_id))
            return True
    except Exception as e:
        print(f"Erreur update_formule: {e}")
        return False
    

def get_all_formules_with_details() -> Dict[int, Dict]:
    """
    Récupère TOUTES les formules avec leurs produits en UNE SEULE requête
    Retourne: {formule_id: {'nom': ..., 'date_creation': ..., 'produits': [...]}}
    """
    with get_conn() as c:
        # Récupérer toutes les formules
        c.execute("SELECT id, nom_formule, CURRENT_TIMESTAMP as date_creation, type_formule FROM formules ORDER BY nom_formule")
        formules = c.fetchall()
        
        # Récupérer TOUS les produits de TOUTES les formules en 1 requête
        c.execute("""
            SELECT
                fp.formule_id,
                fp.id, 
                p.id as produit_id, 
                p.produit, 
                fp.quantite, 
                u.nom as unite
            FROM formule_produits fp
            JOIN produits p ON fp.produit_id = p.id
            JOIN unite u ON fp.unite_id = u.id
            ORDER BY fp.formule_id, p.produit
        """)
        all_produits = c.fetchall()
        
        # Organiser par formule_id
        formules_dict = {}
        for f in formules:
            formules_dict[f[0]] = {
                'id': f[0],
                'nom': f[1],
                'date_creation': f[2],
                'type_formule': f[3] if len(f) > 3 else 'Non-Brunch',
                'produits': []
            }
        
        # Ajouter les produits à leur formule
        for p in all_produits:
            formule_id = p[0]
            if formule_id in formules_dict:
                formules_dict[formule_id]['produits'].append({
                    'id': p[1],
                    'produit_id': p[2],
                    'nom': p[3],
                    'quantite': p[4],
                    'unite': p[5]
                })
        
        return formules_dict
    
    
def delete_formule(formule_id: int) -> bool:
    try:
        with get_conn() as c:
            c.execute("DELETE FROM formules WHERE id = %s", (formule_id,))
            return True
    except:
        return False

def add_produit_to_formule(formule_id: int, produit_id: int, quantite: float, unite_id: int) -> bool:
    try:
        with get_conn() as c:
            c.execute("""
                INSERT INTO formule_produits (formule_id, produit_id, quantite, unite_id)
                VALUES (%s, %s, %s, %s)
            """, (formule_id, produit_id, quantite, unite_id))
            return True
    except:
        return False

def get_formule_details(formule_id: int) -> List[Dict]:
    with get_conn() as c:
        c.execute("""
            SELECT
                fp.id, p.id as produit_id, p.produit, fp.quantite, u.nom as unite
            FROM formule_produits fp
            JOIN produits p ON fp.produit_id = p.id
            JOIN unite u ON fp.unite_id = u.id
            WHERE fp.formule_id = %s
            ORDER BY p.produit
        """, (formule_id,))
        results = c.fetchall()
        return [{'id': r[0], 'produit_id': r[1], 'nom': r[2], 'quantite': r[3], 'unite': r[4]} for r in results]

def remove_produit_from_formule(formule_id: int, produit_id: int) -> bool:
    try:
        with get_conn() as c:
            c.execute("DELETE FROM formule_produits WHERE formule_id = %s AND produit_id = %s",
                     (formule_id, produit_id))
            return True
    except:
        return False

def update_quantite_in_formule(formule_id: int, produit_id: int, nouvelle_quantite: float) -> bool:
    try:
        with get_conn() as c:
            c.execute("""
                UPDATE formule_produits
                SET quantite = %s
                WHERE formule_id = %s AND produit_id = %s
            """, (nouvelle_quantite, formule_id, produit_id))
            return True
    except:
        return False

# ========== COMMANDES =============

def create_commande(nom_client: str, nb_couverts: int, service: int,
                   date: str, heure: str, notes: str = "") -> Optional[int]:
    try:
        with get_conn() as c:
            c.execute("""
                INSERT INTO carnet_commande (nom_client, nombre_couverts, service, delivery_date, delivery_hour, notes)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (nom_client, nb_couverts, service, date, heure, notes))
            result = c.fetchone()
            return result[0] if result else None
    except Exception as e:
        print(f"Erreur create_commande: {e}")
        return None

def get_commandes() -> List[Dict]:
    with get_conn() as c:
        c.execute("""
            SELECT id, nom_client, nombre_couverts, service, delivery_date, delivery_hour, notes
            FROM carnet_commande
            ORDER BY delivery_date ASC, delivery_hour ASC
        """)
        results = c.fetchall()
        return [{'id': r[0], 'client': r[1], 'couverts': r[2], 'service': r[3], 
                'date': r[4], 'heure': r[5], 'notes': r[6]} for r in results]

def delete_commande(commande_id: int) -> bool:
    try:
        with get_conn() as c:
            c.execute("DELETE FROM carnet_commande WHERE id = %s", (commande_id,))
            return True
    except:
        return False

def update_commande(commande_id: int, nom_client: str, nb_couverts: int, service: int,
                   date: str, heure: str, notes: str = "") -> bool:
    try:
        with get_conn() as c:
            c.execute("""
                UPDATE carnet_commande
                SET nom_client = %s, nombre_couverts = %s, service = %s,
                    delivery_date = %s, delivery_hour = %s, notes = %s
                WHERE id = %s
            """, (nom_client, nb_couverts, service, date, heure, notes, commande_id))
            return True
    except:
        return False

def add_formule_to_commande(commande_id: int, formule_id: int, nb_couverts: int) -> bool:
    """
    Enregistre qu'une formule a été utilisée pour une commande
    Les produits sont ajoutés séparément via add_produit_to_commande()
    """
    try:
        with get_conn() as c:
            c.execute("""
                INSERT INTO commande_formules 
                (commande_id, formule_id, quantite_recommandee, quantite_finale)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (commande_id, formule_id) 
                DO UPDATE SET quantite_recommandee = EXCLUDED.quantite_recommandee,
                             quantite_finale = EXCLUDED.quantite_finale
            """, (commande_id, formule_id, nb_couverts, nb_couverts))
            return True
    except Exception as e:
        print(f"Erreur: {e}")
        return False
    
def get_produits_formule_avec_calcul(formule_id: int, nb_couverts: int) -> List[Dict]:
    """
    Récupère les produits d'une formule avec quantités calculées
    """
    with get_conn() as c:
        c.execute("""
            SELECT
                p.id,
                p.produit,
                fp.quantite as qte_par_personne,
                u.nom as unite,
                u.id as unite_id
            FROM formule_produits fp
            JOIN produits p ON fp.produit_id = p.id
            JOIN unite u ON fp.unite_id = u.id
            WHERE fp.formule_id = %s
            ORDER BY p.produit
        """, (formule_id,))
        results = c.fetchall()

        produits = []
        for r in results:
            qte_recommandee = r[2] * nb_couverts
            produits.append({
                'id': r[0],
                'nom': r[1],
                'qte_par_personne': r[2],
                'qte_recommandee': qte_recommandee,
                'unite': r[3], 
                'unite_id': r[4]
            })
        return produits

def get_produit_by_id(produit_id: int) -> Optional[Dict]:
    """
    Récupère un produit par son ID avec sa catégorie
    """
    with get_conn() as c:
        c.execute("""
            SELECT p.id, p.produit, c.nom as categorie, t.nom as type
            FROM produits p
            LEFT JOIN categories c ON p.categorie_id = c.id
            LEFT JOIN types t ON p.type_id = t.id
            WHERE p.id = %s
        """, (produit_id,))
        result = c.fetchone()
        
        if result:
            return {
                'id': result[0],
                'nom': result[1],
                'categorie': result[2] or 'Sans catégorie',
                'type': result[3]
            }
        return None

def add_produit_to_commande(commande_id: int, produit_id: int, quantite: float, unite_id: int) -> bool:
    """
    Ajoute un produit supplémentaire à une commmande
    """
    try:
        with get_conn() as c:
            # Vérifier si le produit existe déjà pour cette commande
            c.execute("""
                SELECT id FROM commande_produits
                WHERE commande_id = %s AND produit_id = %s
            """, (commande_id, produit_id))
            result = c.fetchone()

            if result:
                # UPDATE si existe déjà
                c.execute("""
                    UDPATE commande_produits
                    SET quantite = %s, unite_id = %s
                    WHERE commande_id = %s AND produit_id = %s
                """, (quantite, unite_id, commande_id, produit_id))
            else:
                # INSERT sinon
                c.execute("""
                    INSERT INTO commande_produits (commande_id, produit_id, quantite, unite_id)
                    VALUES (%s, %s, %s, %s)
                """, (commande_id, produit_id, quantite, unite_id))
        return True
    except Exception as e:
        print(f"Erreur add_produit_to_commande: {e}")
        return False

def add_produit_to_commande_1(commande_id: int, produit_id: int, quantite: float, unite_id: int) -> bool:
    """
    Ajoute un produit supplémentaire à une commande
    """
    try:
        with get_conn() as c:
            c.execute("""
                INSERT INTO commande_produits (commande_id, produit_id, quantite, unite_id)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (commande_id, produit_id) 
                DO UPDATE SET quantite = EXCLUDED.quantite, unite_id = EXCLUDED.unite_id
            """, (commande_id, produit_id, quantite, unite_id))
            return True
    except Exception as e:
        print(f"Erreur add_produit_to_commande: {e}")
        return False

def remove_produit_from_commande(commande_id: int, produit_id: int) -> bool:
    """
    Retire un produit supplémentaire d'une commande
    """
    try:
        with get_conn() as c:
            c.execute("""
                DELETE FROM commande_produits 
                WHERE commande_id = %s AND produit_id = %s
            """, (commande_id, produit_id))
            return True
    except:
        return False

def update_quantite_produit_commande(commande_id: int, produit_id: int, nouvelle_quantite: float) -> bool:
    """
    Met à jour la quantité d'un produit dans une commande
    """
    try:
        with get_conn() as c:
            c.execute("""
                UPDATE commande_produits
                SET quantite = %s
                WHERE commande_id = %s AND produit_id = %s
            """, (nouvelle_quantite, commande_id, produit_id))
            return True
    except:
        return False

def get_commande_details(commande_id: int) -> Dict:
    """
    Récupère tous les détails d'une commande (formules + produits)
    """
    with get_conn() as c:
        # Info commande
        c.execute("""
            SELECT nom_client, nombre_couverts, service, delivery_date, delivery_hour, notes
            FROM carnet_commande WHERE id = %s
        """, (commande_id,))
        cmd = c.fetchone()
        
        if not cmd:
            return {}
        
        # Formules
        c.execute("""
            SELECT cf.formule_id, f.nom_formule, cf.quantite_recommandee, cf.quantite_finale
            FROM commande_formules cf
            JOIN formules f ON cf.formule_id = f.id
            WHERE cf.commande_id = %s
        """, (commande_id,))
        formules = c.fetchall()
        
        # Produits supplémentaires
        c.execute("""
            SELECT cp.produit_id, p.produit, cp.quantite, u.nom, cp.unite_id
            FROM commande_produits cp
            JOIN produits p ON cp.produit_id = p.id
            LEFT JOIN unite u ON cp.unite_id = u.id
            WHERE cp.commande_id = %s
        """, (commande_id,))
        produits = c.fetchall()
        
        return {
            'client': cmd[0],
            'couverts': cmd[1],
            'service': cmd[2],
            'date': cmd[3],
            'heure': cmd[4],
            'notes': cmd[5],
            'formules': formules,
            'produits': produits
        }

# ========== ARCHIVES =============

def archiver_commande(commande_id: int, statut: str = 'Livrée') -> bool:
    """
    Archive une commande avec tous ses détails
    """
    try:
        with get_conn() as c:
            # Récupérer les infos de la commande
            details = get_commande_details(commande_id)
            if not details:
                return False
            
            # Insérer dans archives
            c.execute("""
                INSERT INTO commandes_archivees 
                (commande_id_origine, nom_client, nombre_couverts, service, 
                 delivery_date, delivery_hour, statut, notes)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (commande_id, details['client'], details['couverts'], details['service'],
                 details['date'], details['heure'], statut, details['notes']))
            
            archive_id = c.fetchone()[0]
            
            # Archiver formules
            for formule in details['formules']:
                c.execute("""
                    INSERT INTO archives_formules 
                    (archive_id, formule_nom, quantite_recommandee, quantite_finale)
                    VALUES (%s, %s, %s, %s)
                """, (archive_id, formule[1], formule[2], formule[3]))
            
            # Archiver produits
            for produit in details['produits']:
                c.execute("""
                    INSERT INTO archives_produits 
                    (archive_id, produit_nom, quantite, unite)
                    VALUES (%s, %s, %s, %s)
                """, (archive_id, produit[1], produit[2], produit[3]))
            
            # Supprimer la commande originale
            c.execute("DELETE FROM carnet_commande WHERE id = %s", (commande_id,))
            
            return True
    except Exception as e:
        print(f"Erreur archivage: {e}")
        return False

def get_archives() -> List[Dict]:
    """
    Récupère toutes les commandes archivées
    """
    with get_conn() as c:
        c.execute("""
            SELECT id, nom_client, nombre_couverts, service, delivery_date, 
                   delivery_hour, statut, date_archivage
            FROM commandes_archivees
            ORDER BY date_archivage DESC
        """)
        results = c.fetchall()
        return [{'id': r[0], 'client': r[1], 'couverts': r[2], 'service': r[3],
                'date': r[4], 'heure': r[5], 'statut': r[6], 'date_archivage': r[7]} 
                for r in results]

def get_archive_details(archive_id: int) -> Dict:
    """
    Récupère les détails d'une archive
    """
    with get_conn() as c:
        # Info archive
        c.execute("""
            SELECT nom_client, nombre_couverts, service, delivery_date, 
                   delivery_hour, statut, notes, date_archivage
            FROM commandes_archivees WHERE id = %s
        """, (archive_id,))
        arch = c.fetchone()
        
        if not arch:
            return {}
        
        # Formules archivées
        c.execute("""
            SELECT formule_nom, quantite_recommandee, quantite_finale
            FROM archives_formules WHERE archive_id = %s
        """, (archive_id,))
        formules = c.fetchall()
        
        # Produits archivés
        c.execute("""
            SELECT produit_nom, quantite, unite
            FROM archives_produits WHERE archive_id = %s
        """, (archive_id,))
        produits = c.fetchall()
        
        return {
            'client': arch[0],
            'couverts': arch[1],
            'service': arch[2],
            'date': arch[3],
            'heure': arch[4],
            'statut': arch[5],
            'notes': arch[6],
            'date_archivage': arch[7],
            'formules': formules,
            'produits': produits
        }

def delete_archive(archive_id: int) -> bool:
    """
    Supprime une archive
    """
    try:
        with get_conn() as c:
            c.execute("DELETE FROM commandes_archivees WHERE id = %s", (archive_id,))
            return True
    except:
        return False

def restaurer_archive(archive_id: int) -> Optional[int]:
    """
    Restaure une archive en commande active
    """
    try:
        with get_conn() as c:
            # Récupérer l'archive
            details = get_archive_details(archive_id)
            if not details:
                return None
            
            # Créer la commande
            c.execute("""
                INSERT INTO carnet_commande 
                (nom_client, nombre_couverts, service, delivery_date, delivery_hour, notes)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (details['client'], details['couverts'], details['service'],
                 details['date'], details['heure'], details['notes']))
            
            commande_id = c.fetchone()[0]
            
            # Note: Les formules et produits ne peuvent pas être restaurés exactement
            # car on n'a que les noms, pas les IDs
            
            # Supprimer l'archive
            c.execute("DELETE FROM commandes_archivees WHERE id = %s", (archive_id,))
            
            return commande_id
    except Exception as e:
        print(f"Erreur restauration: {e}")
        return None