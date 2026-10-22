-- V5.4a : historique des modifications des commandes (qui, quoi, quand, ce qui a changé).
-- Rempli uniquement par le backend. Pas de clé étrangère vers carnet_commande : l'historique
-- doit rester quand une commande est supprimée (la suppression y est elle-même notée).
-- À lancer dans Supabase → SQL Editor, AVANT de déployer le backend V5.4a.
CREATE TABLE IF NOT EXISTS public.commande_historique (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  commande_id uuid NOT NULL,
  franchise_id uuid,
  user_id uuid,
  user_email text,
  action text NOT NULL CHECK (action IN ('creation', 'modification', 'validation', 'suppression')),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS commande_historique_commande_idx
  ON public.commande_historique (commande_id, created_at DESC);

-- Comme les autres tables : accès direct fermé, seul le backend (clé de service) lit et écrit
ALTER TABLE public.commande_historique ENABLE ROW LEVEL SECURITY;
