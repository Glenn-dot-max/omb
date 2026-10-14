# 📖 M3 — Recettes, grammages et prix fournisseurs

> Retour à la [feuille de route](../../ROADMAP.md) · Statut : ⚪ à faire · Durée estimée : **4 à 5 semaines** · Fin visée : début avril 2027
> Prérequis : [Phase B](00-fondations.md) (nouveau catalogue : articles achetés, fournisseurs). Prépare [M5 — IA factures fournisseurs](05-ia-factures-fournisseurs.md) et le chiffrage des devis ([M4](04-facturation-clients.md)).

## 🎯 Objectif

Des **fiches techniques** avec les **grammages**, reliées aux **prix fournisseurs**, pour connaître automatiquement le **coût matière** de chaque produit, formule et commande — et les **allergènes**.

## 👥 Utilisateurs

- **Chef / responsable de production** : crée et ajuste les recettes.
- **Gérant / bureau** : saisit les prix fournisseurs, suit les coûts et les marges.
- **Équipe en cuisine** (tablette, plus tard) : consulte les fiches techniques.

## 📦 Périmètre version 1

### Fournisseurs et prix
- [ ] **Fournisseurs** et leurs **articles** : référence fournisseur, code-barres, **conditionnement** (« carton de 6 × 1 L »).
- [ ] **Prix par conditionnement**, ramené automatiquement au **prix au kilo / au litre / à la pièce**.
- [ ] **Historique des prix** (date, source : saisie manuelle ou facture).

### Recettes / fiches techniques
- [ ] Liste des articles avec **grammage par portion** (ou par lot de production), **sous-recettes** (pâte, sauce…), nombre de portions.
- [ ] **Pertes / rendement** (épluchage, cuisson) — coefficient par article ou par étape.
- [ ] Étapes de préparation (texte, photos).
- [ ] **Lien recette ↔ produit vendu / formule** (le catalogue existant).

### Calculs automatiques
- [ ] **Coût matière** par portion, par produit, par formule, et donc **par commande**.
- [ ] **Allergènes** calculés à partir des articles utilisés (14 allergènes majeurs).
- [ ] Recalcul automatique quand un prix fournisseur change.

### Sorties
- [ ] **Fiche technique imprimable** (PDF).

## ⏭️ Plus tard

- **Besoins en ingrédients** pour une période de commandes (base de la **gestion des achats** et des bons de commande fournisseurs).
- Valeurs nutritionnelles.
- Comparaison des prix entre fournisseurs pour un même article.
- Fiches techniques consultables sur la tablette en cuisine.

## 🗃️ Données (premier jet, à valider en S1)

`fournisseurs` · `articles` · `articles_fournisseurs` (référence, conditionnement, prix courant) · `historique_prix` · `recettes` · `lignes_recette` (article ou sous-recette, grammage, perte) · `recettes_produits` (lien avec le catalogue vendu) · `allergenes` / `articles_allergenes`.

## ⚖️ Points à faire valider

- **Allergènes** : l'information sur les 14 allergènes majeurs est une obligation réglementaire ; si l'application l'affiche, elle doit être **fiable**. Une erreur aurait des conséquences graves → bien indiquer que la donnée dépend de la saisie des articles, et prévoir une validation humaine des fiches.

## ❓ Questions ouvertes

- Les franchises partagent-elles les mêmes recettes (définies par OMB), avec des prix fournisseurs différents par site ?
- Grammage par portion ou par lot de production (ex. « pour 50 pièces ») ?
- Quels fournisseurs principaux, et leurs factures sont-elles en PDF ou papier ? (prépare M5)

## 📓 Informations reçues

- **2026-10-13** — Demande de Glenn : faire les **recettes avec le grammage**, avec la possibilité d'**entrer les prix fournisseurs**, et à terme une **reconnaissance de factures par IA** (→ M5).
