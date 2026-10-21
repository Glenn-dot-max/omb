# 🤝 M6 — CRM commercial

> Retour à la [feuille de route](../../ROADMAP.md) · Statut : ⚪ à faire · Durée estimée : **3 à 5 semaines** · Fin visée : à recalculer (dates retirées le 2026-10-21)
> Prérequis : [M4 — Clients, devis, factures](04-facturation-clients.md) (les clients et les devis existent déjà ; le CRM les enrichit).

## 🎯 Objectif

Donner aux **commerciaux** un outil pour suivre leurs **prospects**, leurs **opportunités** et leurs **relances**, relié aux devis, commandes et factures — sans ressaisie.

## 👥 Utilisateurs

- **Commerciaux** : prospects, rendez-vous, relances, devis.
- **Responsable commercial / direction** : pipeline, objectifs, statistiques.

## 📦 Périmètre version 1

- [ ] **Prospects** (devenant clients) et **contacts**.
- [ ] **Opportunités** dans un **pipeline** (étapes paramétrables : premier contact → devis envoyé → négociation → gagné / perdu) avec montant estimé.
- [ ] **Activités** : appels, emails, rendez-vous, notes ; **relances** avec date et rappel.
- [ ] Lien opportunité → **devis** → **commande** → **facture** (M4).
- [ ] **Tableau de bord** : pipeline par commercial, taux de transformation, chiffre d'affaires signé.

## ⏭️ Plus tard

- Objectifs par commercial, commissions.
- Synchronisation agenda / emails.
- Campagnes (avec consentement).
- Statistiques avancées (→ backlog B6, page Historique et KPI).

## 🗃️ Données (premier jet)

`prospects` (ou statut sur `clients`) · `opportunites` · `etapes_pipeline` · `activites` · `relances` · liens vers `devis` (M4).

## ⚖️ Points à faire valider

- **RGPD** : base légale de la prospection, information des personnes, **durées de conservation** des prospects inactifs, droit d'accès et d'effacement.

## ❓ Questions ouvertes

- Combien de commerciaux, et sur quels sites ?
- Quelles étapes de vente aujourd'hui (mariage, entreprise, particulier) ?
- Outil utilisé actuellement (tableur, autre CRM) à reprendre ?

## 📓 Informations reçues

- **2026-10-13** — Demande de Glenn : un **système CRM pour les commerciaux**. Placé côté bureau, après M4.
