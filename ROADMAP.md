# 🗺️ OMB — Feuille de route produit

> Vue d'ensemble du produit : où on en est, ce qu'on construit, dans quel ordre, et quand.
> Le détail de chaque module est dans [`docs/modules/`](docs/modules/), les interventions du développeur senior dans [`docs/dev-senior.md`](docs/dev-senior.md).
> Le suivi des tâches techniques en cours est dans [`SPRINTS.md`](SPRINTS.md), les idées non prioritaires dans [`BACKLOG.md`](BACKLOG.md).
>
> Dernière mise à jour : **2026-10-19**. Ce fichier est alimenté au fil des informations données par Glenn.
>
> _L'ancienne roadmap technique (sprints d'août 2026, Docker/Hetzner) est conservée dans l'historique git (dernière version : commit `6b43933`, 2026-08-14)._

---

## 🎯 Vision

Une **solution complète de gestion pour traiteurs** : développée d'abord pour **Oh My Brunch et ses franchises**, puis **commercialisée à d'autres traiteurs**.

Principe directeur : **construire pour OMB, concevoir pour plusieurs clients** (multi-organisations dès les fondations, rien de spécifique à OMB dans le code).

Ordre de construction choisi par Glenn (2026-10-13) : **d'abord le terrain (la production), ensuite le bureau.**

```
                         BUREAU (ensuite)
   CRM commercial → Devis → ┐                    ┌→ Facture client → Plateforme agréée (e-facture)
                            ▼                    │
                         Commande  ──────→ Production ──→ Livraison
                            ▲                    ▲
                         TERRAIN (d'abord)       │
   Recettes / fiches techniques ─────────────────┤  (grammages, coûts, allergènes)
   Pack hygiène + traçabilité (scan des lots) ───┤  (réception, températures, nettoyage)
   Tablette : pointage, heures, plannings ───────┘
   Factures fournisseurs (IA) → prix des articles
```

---

## 📍 Où on en est (2026-10-19)

**En production** (Render, branche `v8`, base Supabase à **Francfort**) :

- Gestion des **commandes** (création, modification, duplication, archivage automatique), des **formules** et des **produits** par franchise, **planning de production** avec export Excel, **administration** (franchises, utilisateurs).
- Sécurité revue (Sprints 0, 1, 2) et **performances** fortement améliorées (Sprint P) : création d'une commande **~20 s → < 1 s**, création d'une formule **~4,5 s → ~1 s**, requêtes traitées en parallèle.
- **123 tests automatiques** côté backend.

**Ce qui reste à terminer sur l'existant** (détail dans `SPRINTS.md`) :

- **P8c** : supprimer les anciennes routes backend devenues inutiles.
- **Sprint 3 (revu)** : protection contre le XSS **côté backend** (refuser les balises à l'enregistrement) — l'ancien frontend n'est plus corrigé puisqu'il passe à Vue.
- **Sprint 4** : hygiène du code (scripts, dépendances, venv local en Python 3.13…).

**Décidé le 2026-10-19** : le frontend passe à **Vue.js** juste après (étape V). Règle : aucun travail sur l'ancien frontend qui deviendrait inutile avec Vue.

**Rien n'est encore commencé** sur Vue, les fondations multi-traiteurs (Phase B) ni les nouveaux modules.

---

## 🧱 Les étapes

| #   | Étape                                                                                                                   | Fiche                                                                               | Durée estimée (plein temps) | Fin visée           | Statut      |
| --- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | --------------------------- | ------------------- | ----------- |
| 0   | Finir l'existant (P8c, Sprint 3 revu, Sprint 4)                                                                         | [`SPRINTS.md`](SPRINTS.md)                                                          | ~1 semaine                  | fin octobre 2026    | 🟡 en cours |
| V   | **Passage du frontend à Vue.js**, migration progressive (pages simples, Admin, Planning, Commandes, connexion ; Produits/Formules avec le nouveau catalogue) | [`SPRINTS.md`](SPRINTS.md) (Sprint V) | 4 à 5 semaines | début décembre 2026 | 🟡 en cours |
| B   | **Fondations** : organisations/sites, salariés, cloisonnement, migrations, CI, interface tablette, briques communes, nouveau catalogue | [`00-fondations.md`](docs/modules/00-fondations.md)                   | 4 à 6 semaines              | fin janvier 2027    | ⚪ à faire  |
| M1  | 🏭 **Pack hygiène et traçabilité** (scan des lots)                                                                      | [`01-hygiene-tracabilite.md`](docs/modules/01-hygiene-tracabilite.md)               | 5 à 6 semaines              | mi-mars 2027        | ⚪ à faire  |
| M4  | 🏢 **Clients, devis (→ planning de production), factures + facture électronique, remplacement d'EBP**                   | [`04-facturation-clients.md`](docs/modules/04-facturation-clients.md)               | 7 à 9 semaines              | **fin mai 2027**    | ⚪ à faire  |
| M2  | 🏭 **Tablette : pointage, heures, plannings, rapports**                                                                 | [`02-tablette-pointage-heures.md`](docs/modules/02-tablette-pointage-heures.md)     | 4 à 5 semaines              | fin juin 2027       | ⚪ à faire  |
| M3  | 🏭 **Recettes, grammages et prix fournisseurs**                                                                         | [`03-recettes-prix-fournisseurs.md`](docs/modules/03-recettes-prix-fournisseurs.md) | 4 à 5 semaines              | fin juillet 2027    | ⚪ à faire  |
| M5  | 🏭 **Reconnaissance des factures fournisseurs par IA**                                                                  | [`05-ia-factures-fournisseurs.md`](docs/modules/05-ia-factures-fournisseurs.md)     | 3 à 4 semaines              | fin août 2027       | ⚪ à faire  |
| M6  | 🏢 **CRM commercial**                                                                                                   | [`06-crm-commercial.md`](docs/modules/06-crm-commercial.md)                         | 3 à 5 semaines              | automne 2027        | ⚪ à faire  |

**Total : environ 7 à 9 mois** à plein temps (8 h/jour, 5 jours/semaine), **plus ~30 % de marge** pour les imprévus.

**Ordre revu le 2026-10-19** : avec les ~5 semaines de l'étape V, M1 se termine vers mi-mars ; pour respecter la règle ci-dessous, **M4 passe juste après M1**, avant M2 et M3. Conséquence : les devis démarrent sans les coûts de revient (ils arriveront avec M3). ❓ (Glenn) Alternative : M2 avant M4, si on accepte un démarrage de M4 fin avril (moins de marge avant septembre 2027).

Légende : ⚪ à faire · 🟡 en cours · ✅ fait · ⏸️ en pause

### ⚠️ Règle de calendrier : la facturation électronique

La facture électronique devient obligatoire en **émission** pour les PME et micro-entreprises à partir de **septembre 2027** (réforme française — calendrier à revérifier sur impots.gouv.fr et avec l'expert-comptable). D'où :

- **Le module M4 démarre au plus tard début avril 2027**, quoi qu'il arrive. Si un module de production prend du retard, on termine ses détails **après** M4.
- C'est pour cette raison que M4 (bureau) passe **avant** M5 (IA factures fournisseurs), malgré l'ordre « terrain d'abord ».
- **Dès maintenant** : vérifier avec le comptable qu'OMB a bien choisi une plateforme pour la **réception** des factures électroniques (obligatoire pour toutes les entreprises depuis septembre 2026 — ce n'est pas à l'application de le faire).

---

## 🧭 Principes de construction

1. **Une seule chaîne de données** : client → devis → commande → production → facture. Chaque module se branche sur ce qui existe, sans dupliquer.
2. **Construire le cœur du métier, brancher le reste** :
   | Construire | Brancher (intégration) |
   |---|---|
   | Hygiène/traçabilité, pointage/plannings, recettes, devis, factures, CRM | Transmission des factures électroniques (**plateforme agréée** via API), **paie** (export des heures), **comptabilité** (export) |
3. **Les enregistrements sensibles ne s'effacent pas** (relevés d'hygiène, pointages, factures) : une correction crée un nouvel enregistrement, l'original est conservé, et un journal d'audit dit qui a fait quoi.
4. **Deux interfaces** : le **bureau** (navigateur) et la **tablette** (cuisine/atelier : tactile, code PIN, gros boutons).
5. **Tout le frontend en Vue** : l'existant migre pendant l'étape V (Produits/Formules avec le nouveau catalogue), les nouveaux écrans sont construits directement en Vue. Aucun travail sur l'ancien frontend qui deviendrait inutile.
6. **Même méthode qu'aujourd'hui** : un test, puis le code, puis un commit, une tâche à la fois ; chaque module est montré aux franchises dès qu'il est utilisable, avant d'être peaufiné.
7. **Chaque module activable par organisation** (pour la commercialisation, plus tard).

---

## 👨‍💻 Interventions du développeur senior

Revue par un développeur senior freelance aux moments clés + un suivi mensuel léger. Détail, questions préparées et budget indicatif dans [`docs/dev-senior.md`](docs/dev-senior.md).

| #   | Quand                                                 | Sujet                                                                                             |
| --- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| S1  | **novembre 2026**, pendant l'étape V, avant la Phase B | Socle Vue + architecture : organisations / sites / salariés / catalogue (articles achetés vs produits vendus) |
| S2  | fin de la Phase B (janvier 2027)                      | Revue des fondations : migrations, cloisonnement, RLS, tablette                                   |
| S3  | avant la mise en production de M1 (mars 2027), puis M2 | Traçabilité, inaltérabilité des enregistrements, pointage (conformité)                           |
| S4  | **avant la mise en production de M4** (mai 2027)      | Facturation : numérotation, avoirs, conservation, intégration de la plateforme agréée, sécurité   |
| S5  | avant le premier client externe                       | **Audit de sécurité complet + test d'intrusion** (par un spécialiste)                             |
| —   | **une demi-journée par mois**                         | Revue de code des dernières semaines et questions accumulées                                      |

---

## ✅ À préparer dès maintenant

- [ ] Trouver le développeur senior (profil : Python/FastAPI, PostgreSQL, idéalement SaaS/facturation, posture de mentor) — intervention S1 en novembre.
- [ ] Commander **une tablette et une douchette Bluetooth** de test, pour valider le scan dans la vraie cuisine avant M1.
- [ ] Récupérer auprès des franchises leurs **documents actuels** : relevés de températures, plans de nettoyage, fiches de réception, fiches techniques, plannings, feuilles d'heures.
- [ ] Rendez-vous avec l'**expert-comptable** : plateforme de réception des factures électroniques, choix de la plateforme pour l'émission, logiciel de paie utilisé (format d'export des heures), convention collective applicable ; **remplacement d'EBP** (comptabilité externalisée, format d'export, date de bascule) ; **logiciel d'encaissement certifié** : OMB y est-il soumis s'il enregistre des paiements de particuliers ?

---

## 📓 Journal des décisions

- **2026-10-07** — Vision : développé pour OMB et ses franchises, puis vendu à d'autres traiteurs. Modèle cible organisation → sites.
- **2026-10-10** — On reste sur Render (Hetzner/Docker abandonnés pour l'instant). Base Supabase déménagée à Francfort.
- **2026-10-13** — Sprint P (performances) déployé. Ambition élargie à une **solution complète pour traiteurs**. Ordre : **terrain d'abord** (hygiène + traçabilité par scan, tablette de pointage et heures, recettes avec grammages et prix fournisseurs, puis IA sur les factures fournisseurs), **bureau ensuite** (clients/devis/factures avec facture électronique, CRM). Glenn passe à **plein temps**. Règle : M4 (facturation) démarre au plus tard début avril 2027. Interventions d'un développeur senior planifiées.
- **2026-10-14** — Demandes d'OMB intégrées à M4 : **devis validé (client + commerce) → commande → planning de production**, modifiable jusqu'au jour même avec notification à la cuisine, un site par devis, pas d'acompte. OMB utilise **EBP** : M4 remplacera la gestion commerciale, la comptabilité sera confiée à l'expert-comptable. M4 estimé à 7 à 9 semaines (fin visée début juin 2027).
- **2026-10-19** — Ancien projet Supabase (Oregon) supprimé après vérification des logs (seulement des contrôles de santé, aucune requête `/rest/v1/`) et de `SUPABASE_URL` sur Render (pause impossible sur l'offre payante) ; dumps et sauvegarde d'environnement effacés de `~/omb-migration` (seul `schema.sql` conservé). P10 (cache busting) déployée le 2026-10-14.
- **2026-10-19** — **Passage du frontend à Vue.js** (conseil d'un développeur), en étape V juste après l'existant (~4 à 5 semaines). Règle : aucun travail sur l'ancien frontend qui deviendrait inutile (Sprint 3 revu : XSS bloqué côté backend). Produits/Formules migrées avec le nouveau catalogue. Calendrier décalé d'environ 5 semaines ; **M4 avancé juste après M1** pour démarrer avant début avril 2027.
