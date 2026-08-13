-- Index sur carnet_commande (le plus important — utilisé par planning + commandes)
CREATE INDEX IF NOT EXISTS idx_carnet_commande_franchise_id 
    ON carnet_commande(franchise_id);

CREATE INDEX IF NOT EXISTS idx_carnet_commande_delivery_date 
    ON carnet_commande(delivery_date);

CREATE INDEX IF NOT EXISTS idx_carnet_commande_franchise_date 
    ON carnet_commande(franchise_id, delivery_date);

CREATE INDEX IF NOT EXISTS idx_carnet_commande_archived 
    ON carnet_commande(archived);

-- Index sur franchise_produits (utilisé par get_produits + planning)
CREATE INDEX IF NOT EXISTS idx_franchise_produits_franchise_active 
    ON franchise_produits(franchise_id, active);

-- Index sur franchise_formules (utilisé par get_formules)
CREATE INDEX IF NOT EXISTS idx_franchise_formules_franchise_active 
    ON franchise_formules(franchise_id, active);

-- Index sur commande_formules (utilisé par le planning)
CREATE INDEX IF NOT EXISTS idx_commande_formules_commande_id 
    ON commande_formules(commande_id);

-- Index sur commande_produits (utilisé par le planning)
CREATE INDEX IF NOT EXISTS idx_commande_produits_commande_id 
    ON commande_produits(commande_id);

-- Index sur formule_produits (utilisé par le planning)
CREATE INDEX IF NOT EXISTS idx_formule_produits_formule_id 
    ON formule_produits(formule_id);