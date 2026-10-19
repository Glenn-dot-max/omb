# ⏱️ M2 — Tablette : pointage, heures, plannings, rapports

> Retour à la [feuille de route](../../ROADMAP.md) · Statut : ⚪ à faire · Durée estimée : **4 à 5 semaines** · Fin visée : fin juin 2027 (après M4, ordre revu le 2026-10-19)
> Prérequis : [Phase B](00-fondations.md) (salariés + code PIN, interface tablette, inaltérabilité, journal d'audit). Revue senior : **S3** avant mise en production.

## 🎯 Objectif

Un **terminal de pointage sur tablette** dans chaque site, des **plannings** préparés au bureau, et des **rapports d'heures** prêts à transmettre à la paie — sans calculer les salaires nous-mêmes.

## 👥 Utilisateurs

- **Salariés** (tablette, code PIN) : pointent, consultent leur planning.
- **Gérant de site** (bureau) : prépare les plannings, valide les heures, corrige avec motif.
- **Bureau / admin d'organisation** : rapports multi-sites, export vers la paie.

## 📦 Périmètre version 1

- [ ] **Pointage** sur la tablette : arrivée, départ, début et fin de pause — identification par **code PIN**.
- [ ] Gestion des oublis : pointage manquant signalé, **correction par le gérant avec motif** (l'original est conservé).
- [ ] **Plannings** par site et par semaine (bureau), consultables sur la tablette.
- [ ] **Rapports** : heures par salarié / semaine / mois / site, **heures supplémentaires**, écarts planning ↔ réel, retards et absences.
- [ ] **Export vers la paie** (CSV ou format du logiciel de paie du comptable).

## ⏭️ Plus tard

- Demandes de congés et d'absences, validation.
- Échanges de créneaux entre salariés.
- Notifications (planning publié, modification).
- Coût de la main-d'œuvre par commande ou par production (relié à M3 et M4).

## 🗃️ Données (premier jet, à valider en S1)

`salaries` (Phase B) · `pointages` (salarié, type, horodatage, appareil, inaltérable) · `corrections_pointage` (motif, auteur) · `plannings` / `creneaux` · `periodes_paie` (validation, export).

## 🖥️ Écrans

- **Tablette** : grand pavé numérique (code PIN) → bouton unique contextuel (« Commencer ma journée » / « Pause » / « Fin de journée »), confirmation visuelle claire, affichage du planning du jour.
- **Bureau** : éditeur de planning (glisser-déposer), validation hebdomadaire, rapports, export.

## ⚖️ Points à faire valider

- **CNIL** : la **biométrie** (empreinte, reconnaissance faciale) pour le pointage est très strictement encadrée → **code PIN** retenu. Informer les salariés du dispositif ; définir les **durées de conservation**.
- **Droit du travail** et **convention collective** applicable (temps de pause, repos, heures supplémentaires, majorations) — avec l'expert-comptable ou un juriste.
- **Format d'export** attendu par le logiciel de paie utilisé.

## ❓ Questions ouvertes

- Quelle convention collective s'applique aux équipes d'OMB ?
- Quel logiciel de paie utilise le comptable ?
- Faut-il empêcher le pointage en dehors des heures planifiées, ou seulement le signaler ?
- Un salarié peut-il pointer sur plusieurs sites ?

## 📓 Informations reçues

- **2026-10-13** — Demande de Glenn : un outil sur **terminal (tablette)** pour gérer les **heures**, le **pointage**, et **donner des rapports**.
