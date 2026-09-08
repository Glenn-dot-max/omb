# Suivi des sprints — Audit sécurité/qualité OMB

> Fichier de suivi personnel, pas un livrable applicatif. Sert de fil conducteur entre nos sessions.
> Audit complet : voir l'artifact "Audit OMB" (2026-09-06, mis à jour avec les points confirmés de Copilot).

**Règles de travail :**
- Pour chaque tâche : Claude explique quoi faire + pourquoi (pédagogique), c'est Glenn qui écrit le code.
- Claude ne modifie jamais le dépôt sans demande explicite, tâche par tâche — et n'exécute aucune commande (git, tests, etc.) lui-même : il donne la commande exacte, c'est Glenn qui la lance.
- **Tests écrits au fil de l'eau** : dès qu'un fichier est nettoyé/corrigé, on écrit les tests correspondants avant de passer au suivant, plutôt que de tout reporter au Sprint 5. Objectif : à terme, une régression se voit dans les résultats de `pytest`, pas en testant chaque endpoint à la main.
- On coche au fur et à mesure. Si une tâche est reportée/écartée, le noter plutôt que de juste cocher.
- Branche de travail en cours : `sprint/1-nettoyage-backend` (créée à partir de `v8`, qui reste intacte).

---

## Sprint 0 — Colmater la fuite (hors code) 🟠 EN COURS — sévérité revue à la baisse

Clarification du 2026-09-08 après décodage direct des clés trouvées dans l'historique git :
- La clé **`service_role` actuelle** (projet actif `wrkowwyndayumpcrwwxo`) a été recherchée de façon exhaustive (valeur exacte) dans tout l'historique git, toutes branches — **jamais trouvée committée**.
- Ce qui a fuité pour ce même projet actif, c'est sa clé **`anon`** (dans `supabase-scripts/.env.new`) — moins critique qu'une fuite de `service_role`, mais à régénérer.
- Une clé `anon` d'un **second projet** (`vaevkhnkfjpfqqcbslvi`, dans le tout premier `.env` committé) a aussi fuité — à vérifier si ce projet existe encore.

- [ ] Régénérer la clé `anon` du projet actif (`wrkowwyndayumpcrwwxo`) — onglet "Legacy anon, service_role API keys" du dashboard Supabase
- [ ] Vérifier les policies RLS sur `carnet_commande` et `users` : confirmer que le rôle `anon` n'y a aucun accès
- [ ] Vérifier si le projet `vaevkhnkfjpfqqcbslvi` existe encore ; si oui, régénérer sa clé aussi ou le désactiver s'il est abandonné
- [ ] Décider si le dépôt `Glenn-dot-max/omb` doit rester public ou passer en privé
- [ ] (Optionnel, pas urgent) purge de l'historique git avec `git filter-repo` ou BFG une fois les clés tournées

---

## Sprint 1bis — Nettoyage structurel (DRY) — EN COURS sur `sprint/1-nettoyage-backend`

Repéré en revue du 2026-09-06 : plusieurs duplications exactes qui rendent le code plus dur à lire et à corriger. Fait avant/en parallèle du Sprint 1 pour simplifier les correctifs de sécurité à venir.

- [~] **`serialize_date`/`serialize_commande` redondantes** avec l'encodeur JSON global déjà configuré dans `main.py` (`CustomJSONResponse`/`UUIDEncoder`) :
  - [x] `backend/routes/commande_produits.py` — fonction supprimée, 3 `return` corrigés (2 bugs de refactoring trouvés et corrigés au passage : ordre `return`/`execute()` inversé, faute de frappe `model=` au lieu de `mode=`)
  - [x] Tests `tests/test_commande_produits.py` — 3 tests (GET succès, GET 404, POST succès), tous verts
  - [x] `backend/routes/commande_formules.py` — fonction supprimée, 2 appels corrigés proprement (aucun bug cette fois), tests écrits (`tests/test_commande_formules.py`, 2 tests)
  - [x] `backend/routes/commandes.py` — 8 des 10 appels supprimés (ceux sur du `response.data` déjà revenu de Supabase). **Fonction `serialize_commande` volontairement conservée** : 2 appels restants (`create_commande` ligne ~154, `update_commande` ligne ~318) font un vrai travail non-redondant, voir bug ci-dessous. Tests existants (`test_commandes.py`) toujours verts, pas de nouveaux tests ajoutés (couverture déjà partielle sur ce fichier, contrairement aux deux précédents).

**Nettoyage `serialize_date`/`serialize_commande` : terminé.** Prochaine étape du Sprint 1bis → helpers `get_or_404`/`verify_commande_ownership` dans `backend/utils.py`.

- [ ] **Bug latent découvert (pas corrigé, hors scope du nettoyage du jour)** : dans `create_commande` et `update_commande` (`backend/routes/commandes.py`), `delivery_hour_str` est calculé mais jamais réécrit dans le dict envoyé à Supabase — ça ne casse rien aujourd'hui uniquement parce que `serialize_commande()` convertit `delivery_hour` (objet `time`) en texte comme effet de bord. Fragile : si quelqu'un supprime ce wrapper sans le savoir, ça casse la création/modification de commandes. À corriger proprement plus tard (écrire explicitement `commande_data['delivery_hour'] = delivery_hour_str`), avec un test qui vérifie le format de `delivery_hour` en sortie.
- [x] Helpers `get_or_404`/`verify_commande_ownership` créés dans `backend/utils.py`, avec tests directs (`tests/test_utils.py`, 5 tests)
  - [x] Appliqués à `backend/routes/commande_produits.py` — **bug réel trouvé et corrigé au passage** : `get_or_404` appelé sans `select="commande_id"` (gardait la valeur par défaut `"id""`), aurait fait planter `PUT`/`DELETE` en production avec un `KeyError`. Non détecté par les tests initiaux (aucun test n'existait encore sur ces 2 endpoints) — 3 tests ajoutés après coup (`test_update_commande_produit_success/not_found`, `test_delete_commande_produit_success`) pour combler le trou.
  - [x] Appliqué à `backend/routes/commande_formules.py` — 6 remplacements, `select="commande_id"` correct partout dès le premier essai (leçon du bug précédent bien retenue). 3 tests ajoutés pour les endpoints qui n'en avaient aucun (`delete`, `get_exclusions`, `update_exclusions`) avant de passer à la suite.
- [x] Fusionné `normalize_produit_name`/`normalize_formule_name` en `normalize_name()` dans `utils.py`, appliqué aux 4 usages (2 dans `produits.py`, 2 dans `formules.py`). Ménage restant (non urgent) : `import re` désormais inutilisé dans ces deux fichiers, à supprimer à l'occasion.
- [ ] Helper `fetch_all_paginated(table, filters, select)` — boucle de pagination dupliquée entre `produits.py` et `formules.py` — PROCHAIN
- [ ] Fusionner `normalize_produit_name`/`normalize_formule_name` (identiques) en une seule `normalize_name()` dans `utils.py`
- [ ] Helper `fetch_all_paginated(table, filters, select)` — boucle de pagination dupliquée entre `produits.py` et `formules.py`
- [ ] (Plus tard, pas avant le Sprint 5) réflexion sur la fusion structurelle `produits.py`/`formules.py` — trop risqué sans couverture de tests

## Sprint 1 — Bugs backend rapides (modèles Pydantic / FastAPI)

- [ ] Doublon `ResetPasswordRequest` dans `backend/models.py` (casse le reset de mot de passe)
- [ ] `FormuleCreate` n'hérite pas de `FormuleBase` → validation manquante (`backend/models.py`)
- [ ] `password_hash` renvoyé par `GET /admin/users` et `/admin/users/{id}` (`backend/routes/admin.py`)
- [ ] Mot de passe en clair renvoyé par `POST /admin/users/{id}/reset-password` (`backend/routes/admin.py`)
- [ ] Routeur mort `backend/routes/franchise_catalogue.py` (jamais branché dans `main.py`) → à supprimer
- [ ] Fixture `admin_headers` dupliquée dans `backend/tests/conftest.py`

## Sprint 2 — Isolation multi-tenant restante

- [ ] `GET /produits/{id}` non scopé par franchise (IDOR) — `backend/routes/produits.py`
- [ ] `GET /formules/{id}` non scopé par franchise (IDOR) — `backend/routes/formules.py`
- [ ] `PATCH /commandes/{id}/archive` supprime au lieu d'archiver pour les non-admins — `backend/routes/commandes.py`
- [ ] Pagination manquante sur `carnet_commande`/`produits`/`formules` (tables principales)

## Sprint 3 — Frontend : XSS et sécurité du token

- [ ] `innerHTML` non échappé — `frontend/js/produits/produits-render.js`
- [ ] `innerHTML` non échappé — `frontend/js/formules/formules-render.js`
- [ ] `innerHTML` non échappé — `frontend/js/admin.js`
- [ ] Discussion : migration du token JWT (actuellement `localStorage`) vers cookie `httpOnly`

## Sprint 4 — Nettoyage / hygiène du dépôt

- [ ] Scripts avec mots de passe en clair à sortir du repo (`create_catalog_admin.py`, `create_user_paris.py`, `generate_password.py`)
- [ ] Séparer `requirements.txt` (prod) et un `requirements-dev.txt` (pytest, httpx)
- [ ] Renommer `backend/routes/_init_.py` → `__init__.py`
- [ ] CSS dupliqué dans `frontend/css/style.css` (`.actions-bar`, `.filters-section`, `.filter-select`, `.loader`, `.toast`)
- [ ] Dockerfile : utilisateur non-root + `HEALTHCHECK`
- [ ] `render.yaml` : déclarer les secrets en `sync: false`

## Sprint 5 — Tests

- [ ] Couverture de `backend/routes/formules.py` (zéro test, module le plus complexe — logique de copie franchise)
- [ ] Couverture de `backend/routes/admin.py` et `backend/routes/planning.py`

## Sprint 6 — Plus tard (pas urgent avant la bascule Hetzner post-oct. 2026)

- [ ] TLS effectif + en-têtes de sécurité dans `nginx/nginx.conf`

---

## Journal

- **2026-09-06** — Audit complet réalisé + recoupé avec une revue Copilot (3 points confirmés, 1 erreur corrigée). Plan de sprints défini. Démarrage Sprint 0.
- **2026-09-08** — Vérification approfondie des clés Supabase leakées : décodage direct des JWT trouvés en historique, recherche exhaustive de la clé `service_role` actuelle (jamais committée). Sévérité du Sprint 0 revue à la baisse. Création de la branche `sprint/1-nettoyage-backend`. Démarrage du nettoyage structurel (Sprint 1bis) : `commande_produits.py` nettoyé de `serialize_date` (2 bugs de refactoring corrigés en cours de route), écriture du premier test automatisé en cours.
