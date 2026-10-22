-- V5.1 : mariages (adultes / enfants / taux enfant) et repas du personnel.
-- Colonnes facultatives : l'ancien frontend continue de fonctionner sans les connaître.
-- À lancer dans Supabase → SQL Editor, AVANT de déployer le backend V5.1.
ALTER TABLE public.carnet_commande
  ADD COLUMN IF NOT EXISTS nb_adultes integer CHECK (nb_adultes >= 0),
  ADD COLUMN IF NOT EXISTS nb_enfants integer CHECK (nb_enfants >= 0),
  ADD COLUMN IF NOT EXISTS taux_enfant integer CHECK (taux_enfant BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS repas_personnel boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS nb_repas_personnel integer CHECK (nb_repas_personnel >= 0);
