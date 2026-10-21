# 👨‍💻 Interventions du développeur senior

> Retour à la [feuille de route](../ROADMAP.md) · Dernière mise à jour : 2026-10-13

## Pourquoi

Glenn développe en apprenant, avec l'aide d'une IA (explications, code, tests, relectures). Un développeur senior apporte ce qu'une IA ne garantit pas :

- un **regard extérieur sur l'ensemble** du projet, avec du recul ;
- l'**expérience de la production réelle** (sécurité éprouvée, pannes vécues, ce qui tient dans la durée) ;
- une **responsabilité professionnelle** sur l'architecture et la sécurité — important pour des factures légales, des données personnelles et des clients payants ;
- un **deuxième regard humain** qui attrape les erreurs (y compris celles de l'IA).

## 🎯 Profil recherché

- **Python / FastAPI** et **PostgreSQL** (idéalement Supabase).
- Expérience de **logiciels de gestion / SaaS**, idéalement de **facturation**.
- Connaissance du **multi-tenant** (plusieurs clients dans une même application) et de la **sécurité web**.
- **Posture de mentor** : explique ses remarques, accepte que Glenn code lui-même (ne réécrit pas tout).

## 📅 Plan des interventions

| #   | Quand                                                    | Durée       | Sujet                                                                                                                                                                                                                                    | Livrable attendu                                         | Statut         |
| --- | -------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | -------------- |
| S1  | **novembre 2026**, pendant le Sprint V, avant la Phase B | 1 jour      | Socle Vue (structure, client API, cohabitation avec l'ancien frontend) + architecture des fondations : organisations / sites / salariés, cloisonnement, nouveau catalogue (articles achetés vs produits vendus), tablette (hors ligne ?) | Modèle de données validé (ou corrigé), liste des risques | ⚪ à planifier |
| S2  | fin de Phase B (janvier 2027)                            | ½ à 1 jour  | Revue des fondations : migrations, RLS, tests d'isolation, socle Vue, tablette                                                                                                                                                           | Liste de corrections avant les modules                   | ⚪             |
| S3  | avant mise en production de M1 / M2                      | ½ jour      | Traçabilité, inaltérabilité des enregistrements, journal d'audit, pointage                                                                                                                                                               | Validation ou corrections                                | ⚪             |
| S4  | **avant mise en production de M4** (mai 2027)            | 1 jour      | Facturation : numérotation, avoirs, conservation, intégration de la plateforme agréée, sécurité                                                                                                                                          | Feu vert pour la facture électronique                    | ⚪             |
| S5  | avant le **premier client externe**                      | selon devis | **Audit de sécurité complet + test d'intrusion** (spécialiste en sécurité)                                                                                                                                                               | Rapport d'audit, corrections                             | ⚪             |
| —   | **chaque mois**                                          | ½ jour      | Revue de code des dernières semaines + questions accumulées                                                                                                                                                                              | Remarques, bonnes pratiques                              | ⚪             |

## 📋 Préparer chaque intervention

À envoyer avant le rendez-vous :

- [`ROADMAP.md`](../ROADMAP.md), la fiche du module concerné dans [`docs/modules/`](modules/), [`SPRINTS.md`](../SPRINTS.md), [`BACKLOG.md`](../BACKLOG.md), le `README.md` ;
- l'accès en lecture au dépôt GitHub ;
- la liste des questions (ci-dessous pour S1).

### Questions préparées pour S1 (architecture)

1. Modèle **organisation → sites → comptes / salariés** : est-ce le bon découpage ? Un salarié multi-sites ?
2. **Cloisonnement** : dépendance FastAPI centrale + RLS par `organisation_id` — suffisant ? Pièges à éviter avec la clé `service_role` côté backend ?
3. **Migration d'OMB** vers organisations/sites sans interruption de service : la démarche « ajouter → copier → basculer → supprimer » est-elle la bonne ?
4. **Catalogue** : séparer articles achetés / recettes / produits vendus ; personnalisation par site sans dupliquer les produits.
5. **Inaltérabilité** (hygiène, pointages, factures) : modèle « nouvel enregistrement + original conservé » ou autre ? Comment le garantir côté base ?
6. **Tablette** : PWA suffisante ? Hors ligne dès la v1 ou plus tard ? Identification par code PIN : sécurité ?
7. **Frontend** : Vue + Vite pour les nouveaux écrans, cohabitation avec l'existant en JavaScript sans framework — bonne stratégie ?
8. **Transactions** : les créations multi-tables passent aujourd'hui par plusieurs appels à l'API Supabase (annulation « manuelle » en cas d'échec) — faut-il passer par des fonctions SQL transactionnelles ?
9. **Tests** : beaucoup de mocks aujourd'hui — quand et comment introduire des tests sur une vraie base de test ?

## 📓 Journal des interventions

_(à compléter après chaque rendez-vous : date, intervenant, remarques, décisions, actions)_
