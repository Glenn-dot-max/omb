# 🧱 Phase B — Les fondations

> Retour à la [feuille de route](../../ROADMAP.md) · Statut : ⚪ à faire · Durée estimée : **4 à 6 semaines** à plein temps (le socle Vue est fait avant, à l'étape V) · Fin visée : fin janvier 2027
> Intervention du développeur senior : **S1 avant B2** (novembre 2026), **S2 en fin de phase** — voir [`dev-senior.md`](../dev-senior.md).

## 🎯 Objectif

Poser une seule fois, proprement, ce dont **tous** les modules auront besoin : plusieurs traiteurs dans la même application, des salariés qui utilisent une tablette, des enregistrements infalsifiables, des fichiers, un catalogue qui distingue l'acheté du vendu — avec un filet de sécurité (migrations, base de test, CI) pour faire évoluer la base sans crainte.

## Ce que les modules exigent des fondations

| Besoin des modules | Ce que ça impose |
|---|---|
| Tablette en cuisine (pointage, scan, relevés) | Interface tactile séparée, identification rapide par **code PIN**, tolérance aux coupures Wi-Fi |
| Employés qui pointent | Notion de **salarié** distincte d'un **compte utilisateur** |
| Hygiène, traçabilité, heures | Enregistrements **non modifiables** + **journal d'audit** |
| Recettes, prix fournisseurs | **Nouveau catalogue** : articles achetés ≠ produits vendus ; **fournisseurs** |
| Photos d'étiquettes, factures fournisseurs | **Stockage de fichiers** |
| Vente à d'autres traiteurs | **Organisations et sites**, **cloisonnement automatique** |

---

## B1 — Le filet de sécurité (~1 semaine)

- [ ] **Migrations versionnées** avec l'outil en ligne de commande `supabase` : le `schema.sql` récupéré lors de la migration vers Francfort devient la première migration ; chaque changement de structure = un fichier commité.
- [ ] **Base de test séparée** (projet Supabase de test, ou base locale recréée depuis les migrations) — fin des tests locaux sur la base de production.
- [ ] **CI** : GitHub Actions lance `pytest` à chaque push / pull request.
- [ ] **Environnement local aligné sur la production** (Python 3.13, mêmes versions de bibliothèques — tâche 4.3 de `SPRINTS.md`).

## B2 — Organisations, sites et personnes (~2 semaines) ⭐ décision clé

```
Organisation (OMB, Traiteur X…)
 ├── Paramètres (nom, logo, couleurs, fuseau horaire, modules activés…)
 ├── Sites (= les franchises d'OMB ; 1 seul site pour un petit traiteur)
 ├── Comptes utilisateurs (email + mot de passe) : admins, gérants, bureau
 └── Salariés (nom, poste, site, code PIN tablette) — reliés à un compte ou non
```

- [ ] Tables `organisations` et `sites` ; `organisation_id` (et `site_id` quand pertinent) sur toutes les tables métier.
- [ ] **Migration progressive d'OMB** : OMB = organisation n°1, ses franchises = ses sites (ajouter la nouvelle structure → copier les données → basculer le code → supprimer l'ancien). L'application reste en service pendant toute l'opération.
- [ ] **Rôles** : super-admin plateforme · admin d'organisation · gérant de site · bureau · employé (tablette uniquement).
- [ ] **Salariés ≠ comptes** : un commis pointe avec un code PIN, sans email ni mot de passe.
- [ ] Suppression des tables inutilisées (`workspaces`, `workspace_members`, `workspace_invitations`, `franchise_permissions`, colonne `excluded_products` — backlog B8).

## B3 — Le cloisonnement automatique (~1 semaine)

- [ ] Une **dépendance FastAPI centrale** fournit le contexte (organisation, site, rôle) et des requêtes déjà filtrées : plus aucun filtre écrit à la main dans les routes.
- [ ] **Règles RLS** par `organisation_id` dans la base (deuxième barrière).
- [ ] **Test d'isolation générique** : pour chaque route, une organisation ne voit ni ne modifie rien d'une autre.
- [ ] Adapter `GET /auth/me` (créée dans le socle Vue, tâche 1.10) pour renvoyer aussi l'organisation et le site.
- [ ] Uniformiser 403/404 pour une ressource d'une autre organisation → toujours 404 (tâche 2.3c).

## B4 — L'interface tablette (~1 semaine)

> Le **socle Vue + Vite** (connexion, client API, composants de base, couleurs en variables) est construit **avant** la Phase B, pendant le Sprint V (décision du 2026-10-19), avec la migration des écrans existants. Ici, on ajoute seulement ce qui est propre à la tablette.

- [x] ~~Vue + Vite pour tous les nouveaux écrans~~ → Sprint V.
- [ ] **Deux interfaces** :
  - **bureau** : navigateur, souris, écrans riches ;
  - **tablette** : plein écran (application installable), gros boutons tactiles, identification par **code PIN**, quelques écrans simples, retour visuel clair (« enregistré ✅ » / « pas de réseau ⚠️ »).
- [ ] **Tolérance aux coupures Wi-Fi sur la tablette** : version 1 = message clair et nouvel essai ; version 2 = file d'attente hors ligne (à décider avec S1).

## B5 — Les briques communes (~1 semaine)

- [ ] **Stockage de fichiers** (Supabase Storage) : photos d'étiquettes, factures fournisseurs, fiches techniques — par organisation.
- [ ] **Journal d'audit** : qui a fait quoi, quand, depuis quel appareil.
- [ ] **Enregistrements inaltérables** pour l'hygiène, les pointages et les factures : une correction crée un nouvel enregistrement qui remplace le précédent, en conservant l'original et le motif.
- [ ] **Nouveau catalogue** (voir ci-dessous).

## Le nouveau catalogue : ce qu'on achète et ce qu'on vend

Aujourd'hui, les « produits » sont des choses **vendues** (« Mini burger guacamole »). Les recettes, les prix fournisseurs et la traçabilité ont besoin de ce qu'on **achète**.

```
Fournisseur ──→ Article acheté (ingrédient) : référence fournisseur, code-barres (EAN), conditionnement, prix, allergènes
                      │ (grammage)
                      ▼
               Recette / fiche technique (sous-recettes possibles : pâte, sauce…)
                      │
                      ▼
               Produit vendu / Formule  ← existe déjà
                      │
                      ▼
               Commande → Production → lots d'articles utilisés (traçabilité)
```

- [ ] Tables `fournisseurs`, `articles` (achetés), liens articles ↔ fournisseurs (référence, conditionnement, prix, historique).
- [ ] Lien futur produits/formules ↔ recettes (construit dans M3, mais prévu dès maintenant dans le modèle).
- [ ] Profiter du nouveau modèle pour régler la **personnalisation par site sans duplication** (fin des copies de produits suffixées par un identifiant — ancien Sprint 8 de `SPRINTS.md`).

---

## ✅ Critères de fin de phase

- Une deuxième organisation de test peut être créée, avec ses sites, et **ne voit rien** d'OMB (test d'isolation générique vert).
- OMB fonctionne exactement comme avant pour ses franchises.
- La CI est verte ; la base de test se recrée depuis les migrations en une commande.
- Un salarié de test peut s'identifier par code PIN sur la tablette (écran vide mais fonctionnel).
- Revue S2 du développeur senior faite et ses remarques traitées.

## ❓ Questions ouvertes

- Hors ligne sur la tablette : v1 « réseau obligatoire » ou file d'attente dès le départ ? (selon la qualité du Wi-Fi dans les cuisines des franchises)
- Un salarié peut-il travailler sur plusieurs sites ?
- Qui gère les salariés : le gérant de site, l'admin d'organisation, les deux ?
- Garde-t-on le vocabulaire « franchise » à l'écran pour OMB (paramètre d'organisation) ?

## 📓 Informations reçues

- **2026-10-13** — Priorités de Glenn : hygiène + traçabilité par scan, tablette de pointage, recettes avec grammages et prix fournisseurs, puis IA sur les factures fournisseurs. Les fondations sont dimensionnées pour ces besoins.
