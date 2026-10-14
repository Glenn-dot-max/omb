# 🧾 M4 — Clients, devis, factures et facture électronique

> Retour à la [feuille de route](../../ROADMAP.md) · Statut : ⚪ à faire · Durée estimée : **7 à 9 semaines** (périmètre élargi le 2026-10-14 : devis → planning, remplacement d'EBP) · Fin visée : **début juin 2027**
> ⚠️ **Démarrage au plus tard début avril 2027** (échéance légale de septembre 2027). Revue senior : **S4** avant mise en production.

## 🎯 Objectif

Gérer les **clients**, faire des **devis** qui deviennent des **commandes**, émettre des **factures** conformes, et les transmettre au format électronique via une **plateforme agréée**, avant l'obligation de septembre 2027.

## 📅 Le contexte réglementaire (à revérifier sur impots.gouv.fr et avec l'expert-comptable)

- **Depuis septembre 2026** : toutes les entreprises doivent pouvoir **recevoir** des factures électroniques → OMB doit avoir choisi une plateforme de réception (ce n'est pas le rôle de l'application).
- **À partir de septembre 2027** : les PME et micro-entreprises doivent **émettre** leurs factures sous forme électronique.
- Les factures **ne sont pas envoyées directement à l'État** : elles transitent par des **plateformes agréées**, qui gèrent aussi l'**e-reporting**. Devenir soi-même plateforme agréée demande une certification très lourde → **hors de question**.
- **Schéma retenu** : l'application **crée** la facture (format normalisé **Factur-X**, **UBL** ou **CII**) et l'**envoie à une plateforme agréée via son API**.

## 👥 Utilisateurs

- **Bureau / commerciaux** : clients, devis, suivi.
- **Comptabilité** : factures, avoirs, paiements, exports.

## 📦 Périmètre version 1

- [ ] **Clients** (entreprises et particuliers), contacts, adresses de facturation / livraison.
- [ ] **Devis** : à partir des produits/formules (prix, et coûts issus de M3), conditions, validité, **versions**, **un seul site par devis** ; statuts *brouillon → envoyé → accepté par le client → validé par le commerce* ; **la validation interne crée (ou met à jour) la commande → planning de production** ; modification possible jusqu'au jour même, avec **notification aux équipes cuisine**.
- [ ] **Remplacement de la gestion commerciale EBP** : reprise des clients (import CSV), nouvelle série de numérotation, bascule en début d'exercice.
- [ ] **Factures** depuis une ou plusieurs commandes ; **mentions obligatoires** ; **numérotation continue sans trou** ; TVA.
- [ ] **Avoirs** (une facture émise ne se modifie jamais : on la corrige par un avoir).
- [ ] **PDF** + format électronique (**Factur-X**) ; **conservation 10 ans**, inaltérable.
- [ ] **Intégration d'une plateforme agréée** (API) : envoi, suivi des statuts.
- [ ] **Paiements** : statut payé / partiel / en retard, relances simples.
- [ ] **Export comptable** vers le logiciel de l'expert-comptable.

## ⏭️ Plus tard

- Échéanciers (les **acomptes ne sont pas gérés** : décision d'OMB du 2026-10-14).
- Paiement en ligne.
- Relances automatiques avancées (→ M6 CRM).

## 🗃️ Données (premier jet, à valider en S4)

`clients` / `contacts` · `devis` / `lignes_devis` · `factures` / `lignes_facture` (inaltérables) · `avoirs` · `sequences_numerotation` (par organisation, sans trou) · `paiements` · `envois_plateforme` (statuts).

## ⚖️ Points à faire valider (expert-comptable + S4)

- Mentions obligatoires, règles de TVA (taux selon prestations, service sur place / livraison).
- Numérotation, avoirs, conservation, inaltérabilité.
- **Choix de la plateforme agréée** (tarifs, API, accompagnement, formats acceptés) — à faire **dès début 2027**.
- RGPD pour les données clients.
- ❓ (comptable) **Logiciel d'encaissement certifié** : l'enregistrement de paiements de particuliers dans OMB nous soumet-il à l'obligation de certification (loi anti-fraude TVA) ? À trancher **avant** de concevoir les paiements.
- ❓ (comptable) Remplacer **EBP** : comptabilité externalisée chez le comptable, avec quel format d'export (journal des ventes) ? Date de bascule (début d'exercice) ? Conservation des données EBP ?

## ❓ Questions ouvertes

- Qui facture : chaque franchise (site) ou l'organisation ?
- Les franchises ont-elles chacune leur propre numéro SIRET et leur propre numérotation ?
- Quelle plateforme le comptable recommande-t-il ?
- ❓ (franchises) Où la cuisine doit-elle voir les **notifications de modification** : planning, tablette, email, SMS ?
- ❓ (franchises) Quels modules **EBP** sont utilisés aujourd'hui (gestion commerciale, comptabilité, paie) et par qui (OMB ou le comptable) ?

## 📓 Informations reçues

- **2026-10-13** — Demande de Glenn : gestion des factures avec **envoi par API** pour le traitement des factures électroniques, pour **septembre 2027**. Placé avant M5 à cause de l'échéance légale.
- **2026-10-14** — Demande d'OMB : un devis créé ou modifié puis **validé par le commerce** part **directement au planning de production**. Réponses : validation = **accord du client + validation interne** ; devis non validés **absents** du planning ; **pas de délai** de modification (jusqu'au matin même) mais **notification aux équipes cuisine** ; **un seul site par devis** ; **acompte non géré**. Conception : la validation crée/met à jour une **commande liée au devis**, et le planning (déjà calculé à partir des commandes) l'affiche ; modification = nouvelle version + re-validation. Piste si besoin : sortir « clients + devis → commande » de M4 en un module plus tôt.
- **2026-10-14** — OMB utilise aujourd'hui **EBP**. Piste retenue : OMB remplace la **gestion commerciale** (M4), la **comptabilité** est confiée à l'expert-comptable (export + plateforme agréée). Bascule progressive, en début d'exercice. Périmètre de M4 élargi → estimation portée à **7 à 9 semaines**.
