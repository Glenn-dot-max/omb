# 🤖 M5 — Reconnaissance des factures fournisseurs par IA

> Retour à la [feuille de route](../../ROADMAP.md) · Statut : ⚪ à faire · Durée estimée : **3 à 4 semaines** · Fin visée : fin août 2027
> Prérequis : [M3 — Recettes et prix fournisseurs](03-recettes-prix-fournisseurs.md) (articles, fournisseurs, historique des prix) et le stockage de fichiers ([Phase B](00-fondations.md)).

## 🎯 Objectif

Mettre à jour les **prix fournisseurs** (et donc les coûts des recettes) **sans ressaisie** : on dépose une facture fournisseur, l'IA en extrait les lignes et propose les articles correspondants, un humain valide.

## 🔄 Fonctionnement

1. **Dépôt** de la facture : photo prise avec la tablette, ou PDF reçu par email.
2. **Extraction** par un modèle d'IA capable de lire des documents : fournisseur, date, numéro, et pour chaque ligne référence, désignation, quantité, prix unitaire.
3. **Correspondance** de chaque ligne avec un article de la base : d'abord par **référence fournisseur** ou **code-barres**, puis par **ressemblance du nom**.
4. **Écran de validation humaine** : correspondances proposées, avec un niveau de confiance ; l'utilisateur confirme ou corrige. **Jamais de mise à jour des prix sans validation** (une IA peut se tromper sur un chiffre).
5. **Apprentissage** : chaque correspondance validée est mémorisée (« chez ce fournisseur, la référence X = l'article Y ») → reconnaissance de plus en plus fiable.
6. **Mise à jour** des prix (historique conservé) et recalcul des coûts de recettes.

## 📦 Périmètre version 1

- [ ] Dépôt photo / PDF, stockage du document original.
- [ ] Extraction des lignes par IA.
- [ ] Correspondance automatique (référence → code-barres → ressemblance du nom).
- [ ] Écran de validation et de correction.
- [ ] Mémoire des correspondances par fournisseur.
- [ ] Mise à jour des prix + historique + recalcul des coûts.

## ⏭️ Plus tard

- Réception des factures directement depuis la **plateforme de réception des factures électroniques** (déjà structurées → plus besoin de lecture par IA pour ces fournisseurs).
- Rapprochement avec les **réceptions de marchandises** (M1) : quantités reçues vs facturées.
- Alertes de hausse de prix.

## 🗃️ Données (premier jet)

`factures_fournisseurs` (fichier, statut, fournisseur) · `lignes_facture_fournisseur` (données extraites, article proposé, confiance, statut de validation) · `correspondances_fournisseur` (référence → article, appris) · alimentation de `historique_prix` (M3).

## ⚖️ Points à faire valider

- **Coût d'utilisation de l'IA** par facture traitée (à chiffrer au moment de la construction, selon le fournisseur d'IA et le volume).
- **Données envoyées au service d'IA** : contrat, localisation des traitements, RGPD (les factures fournisseurs contiennent surtout des données d'entreprise).
- Fiabilité : la validation humaine reste obligatoire.

## ❓ Questions ouvertes

- Combien de factures fournisseurs par mois et par site ?
- Principalement des PDF ou des factures papier ?
- Quels fournisseurs en priorité ?

## 📓 Informations reçues

- **2026-10-13** — Demande de Glenn : à terme, une **reconnaissance de factures avec IA** pour reconnaître les produits liés aux factures dans la base de données.
