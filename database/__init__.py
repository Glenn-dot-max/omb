# database/__init__.py
from .db_schema import init_db_if_needed
from .db_connection_pg import get_conn
from .db_function import (
    # Catégories
    get_categories,
    add_category,
    delete_category,
    update_category,
    # Types
    get_types,
    add_type,
    delete_type,
    update_type,
    # Unités
    get_unites,
    add_unite,
    # Produits
    get_produits,
    add_produit,
    delete_produit,
    # Formules
    create_formule,
    get_all_formules_with_details,
    get_formules,
    delete_formule,
    add_produit_to_formule,
    get_formule_details,
    remove_produit_from_formule,
    update_quantite_in_formule,
    # Commandes
    create_commande,
    get_commandes,
    delete_commande,
    update_commande,
    add_formule_to_commande,
    get_produits_formule_avec_calcul,
    add_produit_to_commande,
    get_produit_by_id,
    remove_produit_from_commande,
    update_quantite_produit_commande,
    get_commande_details,
    # Archives
    archiver_commande,
    get_archives,
    get_archive_details,
    delete_archive,
    restaurer_archive
)

__all__ = [
    'init_db_if_needed',
    'get_conn',
    'get_categories',
    'add_category',
    'delete_category',
    'update_category',
    'get_types',
    'add_type',
    'delete_type',
    'update_type',
    'get_unites',
    'add_unite',
    'get_produits',
    'get_produit_by_id',
    'add_produit',
    'delete_produit',
    'create_formule',
    'get_formules',
    'delete_formule',
    'add_produit_to_formule',
    'get_formule_details',
    'remove_produit_from_formule',
    'update_quantite_in_formule',
    'get_all_formules_with_details',
    'create_commande',
    'get_commandes',
    'delete_commande',
    'update_commande',
    'add_formule_to_commande',
    'get_produits_formule_avec_calcul'
    'add_produit_to_commande',
    'remove_produit_from_commande',
    'update_quantite_produit_commande',
    'get_commande_details',
    'archiver_commande',
    'get_archives',
    'get_archive_details',
    'delete_archive',
    'restaurer_archive'
]