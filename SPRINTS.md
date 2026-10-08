# Suivi des sprints — OMB

> Fichier de suivi personnel, pas un livrable applicatif. Sert de fil conducteur entre nos sessions (Glenn + Claude).
> Dernière refonte du plan : **2026-10-07** (audit du 2026-09-06 revérifié sur `v8` + avis GPT intégré + vision produit multi-traiteurs).

---

## 📍 Où on en est (à mettre à jour à chaque session)

- **Production** : Render déploie la branche `v8` (commit `cae6824`). Index SQL (`supabase-scripts/create_indexes.sql`) appliqués dans Supabase.
- **Branche de travail** : `sprint/1-nettoyage-backend` = `v8` + 1 commit de nettoyage (`c593fd8`). 43 tests verts.
- **Prochaine tâche** : Sprint 0 → tâche 0.1 (vérifier RLS dans Supabase).
- **En attente d'une réponse de Glenn** : voir « Questions ouvertes » (Q1 bloque la tâche 2.1).

---

## Règles de travail

- Claude explique **quoi faire** (fichier, action précise, commande exacte) **puis pourquoi** (pédagogique). C'est Glenn qui écrit le code et lance les commandes.
- Claude ne modifie jamais le dépôt et n'exécute aucune commande qui change l'état (git, fichiers) sans demande explicite, tâche par tâche. La lecture (git log/show, grep, pytest) est autorisée.
- **Une tâche = un test + un commit.** On écrit le test qui prouve la correction avant de passer à la suite. `pytest` doit rester vert.
- **Une branche par sprint**, créée depuis `v8`. En fin de sprint : fusion dans `v8` → Render déploie.
- On coche au fur et à mesure. Une tâche reportée/écartée est notée comme telle, pas juste cochée.

**Légende** : `[ ]` à faire · `[~]` en cours · `[x]` fait · `[-]` écarté/reporté (avec raison)

**Commande de test** (depuis `backend/`) : `venv/bin/python -m pytest -q`

---

## 🧭 Vision produit (décidée le 2026-10-07)

Développé d'abord pour **Oh My Brunch et ses franchises**, puis **commercialisé à d'autres traiteurs**.
Principe : *construire pour OMB, concevoir pour plusieurs clients*. Pas de dette qui bloque la commercialisation.

Modèle cible :
```
Plateforme (super-admin)
 └── Organisation (le client : OMB, Traiteur X…)
      ├── Paramètres (nom, logo, couleurs, fuseau, types de prestation…)
      ├── Catalogue (produits, formules)
      ├── Sites (= franchises OMB ; 1 seul site pour un petit traiteur)
      │    └── Personnalisations du catalogue par site (actif, prix…)
      ├── Clients, commandes, planning (rattachés à un site)
      └── Utilisateurs + rôles (admin orga, gérant site, employé)
```

Les 5 règles :
1. Rien de spécifique à OMB dans le code → tout dans les paramètres de l'organisation.
2. Chaque donnée a un `organisation_id`, le filtrage est **automatique** (jamais à la main par route) + RLS en filet.
3. Personnaliser par site **sans dupliquer** les produits (fin du suffixe UUID dans les noms).
4. Le schéma de la base est versionné dans le code (migrations).
5. Interface en composants ; theming par variables CSS (même disposition, couleurs/logo par client).

**Hors scope pour l'instant** : abonnements, paiement, inscription publique, microservices.

---

## ❓ Questions ouvertes

- **Q1** — Quand une franchise clique « archiver » une commande : archivage (récupérable) ou suppression définitive ? Aujourd'hui : supprimée pour une franchise, archivée pour un admin (`commandes.py`, `PATCH /{id}/archive`).
- **Q2** — Les produits/formules créés par une franchise doivent-ils rester invisibles aux autres franchises ? (Détermine la correction de la tâche 2.2.)
- **Q3** — Le dépôt `Glenn-dot-max/omb` reste-t-il public ?
- **Q4** — `main` a 6 commits absents de `v8` (`73386cf`, `01515f8`, `dbb9c3f`, `0224c67`, `fc3e66c`, `4f4b536`). Leur contenu semble déjà dans `v8` sous d'autres commits → à vérifier avant de réaligner `main` (tâche 4.7).

---

# PHASE A — Sécuriser et fiabiliser l'existant

## Sprint 0 — Accès et secrets (hors code, dashboard Supabase)

> Nuance retenue (avis GPT) : la clé `anon` est faite pour être publique ; le vrai risque, ce sont les permissions (RLS). La clé `service_role` actuelle n'a jamais été committée.

- [ ] **0.1** Vérifier RLS sur **toutes** les tables (Table Editor → chaque table → RLS activé ; Policies : aucune policy qui ouvre l'accès au rôle `anon`). Priorité : `users`, `carnet_commande`, `franchises`.
- [ ] **0.2** Comptes présents en clair dans `backend/scripts/` (`catalog.admin@ohmybrunch.com` / `ChangeMe123!`, `paris@test.com` / `Paris1234`, mot de passe `Admin2026!` dans `generate_password.py`) : s'ils existent encore, **réinitialiser leur mot de passe depuis l'admin** (ne pas tester les identifiants), désactiver les comptes de test inutiles.
- [ ] **0.3** Rotation des clés **seulement après 0.1**. ⚠️ Avec les clés legacy, régénérer change aussi la `service_role` → mettre à jour `SUPABASE_KEY` sur Render immédiatement après, sinon le backend tombe.
- [ ] **0.4** Ancien projet `vaevkhnkfjpfqqcbslvi` : vérifier s'il existe et ce qu'il contient. Désactiver/révoquer les accès plutôt que supprimer à l'aveugle.
- [ ] **0.5** Répondre à Q3 (public/privé). Passer en privé limite les nouvelles consultations mais ne répare pas l'exposition passée.
- [-] **0.6** Purge de l'historique git (`git filter-repo`) — reporté, optionnel, après 0.3.

## Sprint 1 — Bugs backend et authentification

Branche : `sprint/1-nettoyage-backend` (en cours).

- [ ] **1.1 Reset de mot de passe cassé** — `backend/models.py` : supprimer la 2e classe `ResetPasswordRequest` (lignes ~328-329) qui écrase la première (celle avec `token` + règles du mot de passe). Aujourd'hui `auth.py:197` lit `payload.token` → erreur 500.
  - Test : `POST /auth/reset-password` avec un faux token → 400 (pas 500) ; mot de passe trop faible → 422.
- [ ] **1.2 `password_hash` renvoyé au navigateur** — `backend/routes/admin.py`, `get_users` et `get_user` : remplacer `select("*, franchises(nom)")` par la liste explicite des colonnes utiles.
  - Test : la réponse ne contient pas la clé `password_hash`.
- [ ] **1.3 Mot de passe en clair dans la réponse** — `admin.py`, `reset_password` : retirer `"new_password"` du `return` (confirmé : `admin.js` ne l'utilise pas).
  - Test : la réponse ne contient pas le mot de passe envoyé.
- [ ] **1.4 Sessions non révoquées** — `backend/auth.py`, `get_current_user` :
  - élargir le `select("active")` existant à `active, role, franchise_id, password_changed_at` ;
  - utiliser `role` et `franchise_id` **de la base**, pas du token (aujourd'hui un changement de rôle/franchise met jusqu'à 7 jours à s'appliquer) ;
  - refuser un token dont la date d'émission (`iat`, à ajouter dans `create_access_token`) est antérieure à `password_changed_at`.
  - Tests : token émis avant changement de mot de passe → 401 ; rôle modifié en base → pris en compte immédiatement.
- [ ] **1.5 `FormuleCreate` sans validation** — `models.py` : `class FormuleCreate(FormuleBase)` en gardant `franchise_ids`.
  - Test : nom vide, `nombre_couverts=-5`, nom avec `<b>` → 422.
- [ ] **1.6 Bug latent `delivery_hour`** — `backend/routes/commandes.py`, `create_commande` et `update_commande` : écrire explicitement `commande_data['delivery_hour'] = delivery_hour_str` (aujourd'hui ça marche uniquement par effet de bord de `serialize_commande`).
  - Test : la commande créée a un `delivery_hour` au format `HH:MM`.
- [ ] **1.7 Code mort** — supprimer `routes/franchise_catalogue.py` + son import dans `main.py` ; supprimer les `import re` inutilisés dans `produits.py` et `formules.py` ; supprimer la fixture `admin_headers` en double dans `tests/conftest.py`.
  - Test : suite verte.
- [ ] **1.8** Fusionner la branche dans `v8` → déploiement Render → vérifier en prod le parcours « mot de passe oublié ».

## Sprint 2 — Isolation entre franchises et perte de données

- [ ] **2.1 Archivage destructif** (priorité haute) — `commandes.py`, `PATCH /{commande_id}/archive` : pour un non-admin, le code fait `.delete()`. Selon Q1 : remplacer par le même `update({"archived": True, "archived_at": …})` que pour l'admin (en gardant le filtre `franchise_id`).
  - Test : après archivage par une franchise, la commande existe toujours avec `archived = True`.
- [ ] **2.2 IDOR produits/formules** — `routes/produits.py` (`get_produit`) et `routes/formules.py` (`get_formule`) : pour un non-admin, vérifier que l'ID est rattaché à sa franchise (`franchise_produits` / `franchise_formules`), sinon 404. Dépend de Q2.
  - Tests dans `tests/test_multi_tenant_isolation.py` : franchise A demande un produit/formule de B → 404.
- [ ] **2.3** Passer en revue **toutes** les routes qui prennent un `{id}` et vérifier le filtre franchise (liste à établir, cocher route par route).
- [ ] **2.4** Pagination de la liste des commandes — basse priorité tant que les volumes restent faibles.

## Sprint 3 — Frontend : XSS

> Nuance retenue : ce n'est pas le nombre d'`innerHTML` qui compte, mais le parcours des **données saisies par un utilisateur** jusqu'à l'affichage. Préférer `textContent` ; `escapeHtml()` pour les gabarits HTML ; attention aux attributs `onclick="…"` et aux URL.

- [ ] **3.1** Créer `frontend/js/utils/escape.js` avec `escapeHtml()` (une seule fonction partagée), chargé dans toutes les pages.
- [ ] **3.2** Inventaire : lister chaque `innerHTML` qui affiche une donnée utilisateur (noms de produits/formules/clients, notes, emails). Ordre : produits → formules → commandes (`commandes-modals.js`) → admin → planning.
- [ ] **3.3** Corriger fichier par fichier (`textContent` ou `escapeHtml`), un commit par fichier.
- [ ] **3.4** Test manuel : créer un produit nommé `<img src=x onerror=alert(1)>` → doit s'afficher comme du texte, sans pop-up, sur toutes les pages.
- [ ] **3.5** Discussion : token JWT dans `localStorage` vs cookie `httpOnly` (le risque baisse fortement une fois 3.3 et 1.4 faits).

## Sprint 4 — Hygiène du dépôt

- [ ] **4.1** Scripts `backend/scripts/` : lire email/mot de passe via `input()`/`getpass` ou variable d'environnement, plus rien en dur.
- [ ] **4.2** `requirements-dev.txt` pour `pytest` (garder `httpx` en prod : dépendance de Supabase).
- [ ] **4.3** Recréer le venv local en **Python 3.11** (aujourd'hui 3.9, alors que Render tourne en 3.11).
- [ ] **4.4** Renommer `backend/routes/_init_.py` → `__init__.py`.
- [ ] **4.5** CSS dupliqué dans `frontend/css/style.css` (`.actions-bar`, `.filters-section`, `.filter-select`, `.loader`, `.toast`) — peut se faire avec le Sprint T.
- [ ] **4.6** `render.yaml` : déclarer les secrets avec `sync: false`.
- [ ] **4.7** Réaligner `main` sur `v8` après vérification de Q4.

---

# PHASE B — Fondations multi-traiteurs

> Chaque étape se fait par petites migrations, OMB tourne en continu : ajouter la nouvelle structure → copier les données → basculer le code → supprimer l'ancien.

## Sprint 5 — Filet de sécurité : migrations, base de test, CI

- [ ] **5.1** Installer le CLI Supabase, exporter le schéma actuel en première migration (`supabase/migrations/`), committer.
- [ ] **5.2** Base de test (projet Supabase séparé ou local via `supabase start`) recréée depuis les migrations.
- [ ] **5.3** CI GitHub Actions : `pytest` à chaque push et sur chaque pull request vers `v8`.
- [ ] **5.4** Tests manquants sur l'existant avant de toucher au modèle : `formules.py` (création, duplication, copie par franchise), `admin.py`, `planning.py`.

## Sprint 6 — Organisations et sites

- [ ] **6.1** Concevoir sur papier les tables `organisations`, `sites`, rôles (valider avec Glenn avant de coder).
- [ ] **6.2** Migration : créer `organisations` ; créer l'organisation OMB ; `franchises` → `sites` (ou renommage progressif) avec `organisation_id`.
- [ ] **6.3** Ajouter `organisation_id` à toutes les tables métier, rempli avec OMB.
- [ ] **6.4** Rôles : super-admin plateforme (actuel `TECH_ADMIN`), admin organisation, gérant de site, employé.

## Sprint 7 — Cloisonnement automatique

- [ ] **7.1** Une dépendance FastAPI centrale qui fournit le contexte (organisation, site, rôle) et des requêtes déjà filtrées. Plus aucun `.eq("franchise_id", …)` écrit à la main dans les routes.
- [ ] **7.2** Policies RLS par `organisation_id` en deuxième barrière.
- [ ] **7.3** Test d'isolation **générique** : pour chaque route, un utilisateur de l'organisation A ne voit/modifie rien de B.

## Sprint 8 — Catalogue par site sans duplication

- [ ] **8.1** Table `site_produits` / `site_formules` : `actif`, `prix_personnalise`, etc. Le produit reste unique.
- [ ] **8.2** Migrer les copies existantes (noms avec suffixe UUID) vers ce modèle.
- [ ] **8.3** Supprimer la logique de copie et `normalize_name`.

## Sprint 9 — Paramétrage par organisation (dé-OMB-iser le code)

- [ ] **9.1** Emails : expéditeur et textes depuis l'organisation (`email_service.py` contient « Oh My Brunch » en dur).
- [ ] **9.2** Fuseau horaire (`Europe/Paris` ×6), types de prestation et règle « mariage → coefficient » (`commandes-modals.js`) en paramètres.
- [ ] **9.3** `main.py` (titre API), `config.py` (URL `omb-frontend.onrender.com`) → neutres / configurables.

## Sprint T — Theming (marque blanche) — *peut démarrer à tout moment, indépendant du reste*

État actuel : 0 variable CSS, ~385 couleurs en dur dans le CSS, ~92 dans les pages HTML, ~100 dans le JS, « Oh My Brunch » en dur dans 11 fichiers.

- [ ] **T.1** Recenser les ~10 couleurs principales et leur donner un **rôle** (`--color-primary`, `--color-primary-text`, `--color-brand-dark`, `--color-danger`…). Regrouper les variantes involontaires (`#f5c05c` / `#f5c842` / `#f4a460`…).
- [ ] **T.2** Créer `frontend/css/theme.css` (valeurs OMB par défaut), le charger en premier dans toutes les pages.
- [ ] **T.3** Remplacer les couleurs en dur par `var(--…)` : `style.css`, puis `admin.css`, `login.css` (aucun changement visuel attendu).
- [ ] **T.4** Idem pour les `style="…"` des pages HTML et les couleurs dans le JS.
- [ ] **T.5** Remplacer nom et logo par `data-brand-name` / `data-brand-logo`.
- [ ] **T.6** `frontend/js/theme.js` : `applyTheme(theme)` + cache `localStorage` (pas de flash au chargement). Test avec un thème bleu écrit en dur.
- [ ] **T.7** (avec Sprint 6) Colonnes thème sur `organisations`, logos dans Supabase Storage, route `GET /organisation/theme`, couleur de texte calculée automatiquement pour le contraste.
- [ ] **T.8** (commercialisation) Sous-domaine par client pour thémer la page de connexion ; manifest PWA par organisation.

---

# PHASE C — Construire et commercialiser

## Sprint 10 — Nouvelles fonctionnalités

- [ ] **10.1** Choisir le framework (recommandation : Vue) et l'intégrer pour les **nouveaux** écrans.
- [ ] **10.2** Migrer les écrans existants au fil des modifications (pas de réécriture d'un coup).

## Sprint 11 — Infra Hetzner (avant la bascule)

- [ ] **11.1** TLS effectif + en-têtes de sécurité (dont CSP) dans `nginx/nginx.conf`.
- [ ] **11.2** Dockerfile : utilisateur non-root + `HEALTHCHECK` (ne concerne pas Render, qui utilise le runtime Python natif).

---

# ✅ Terminé

## Sprint 1bis — Nettoyage structurel (DRY) — terminé le 2026-09-08 (commit `c593fd8`, pas encore dans `v8`)

- [x] `serialize_date` supprimée de `commande_produits.py` (2 bugs de refactoring corrigés en route) + 3 tests.
- [x] `serialize_date` supprimée de `commande_formules.py` + 2 tests.
- [x] `commandes.py` : 8 appels sur 10 supprimés ; `serialize_commande` conservée volontairement (voir tâche 1.6).
- [x] Helpers `get_or_404` / `verify_commande_ownership` dans `utils.py` + 5 tests ; appliqués à `commande_produits.py` (bug `select="commande_id"` trouvé et corrigé, 3 tests ajoutés) et `commande_formules.py` (6 remplacements, 3 tests ajoutés).
- [x] `normalize_name()` fusionnée dans `utils.py`, appliquée aux 4 usages.
- [x] `fetch_all_paginated()` dans `utils.py`, appliquée dans `produits.py` et `formules.py`.
- [-] Fusion structurelle `produits.py` / `formules.py` → remplacée par le Sprint 8.

---

## Journal

- **2026-09-06** — Audit complet + recoupement avec une revue Copilot. Plan de sprints défini.
- **2026-09-08** — Vérification des clés Supabase leakées (`service_role` actuelle jamais committée). Création de `sprint/1-nettoyage-backend`. Sprint 1bis réalisé et commité (`c593fd8`).
- **2026-10-07** — Revérification complète sur `v8` (version en prod). Nouveaux points : mots de passe en clair dans les scripts, archivage destructif, sessions non révoquées (rôle/franchise lus depuis le token, validité 7 jours). Avis GPT intégré (nuances sur la clé `anon`, rotation legacy, XSS, `httpx`, Dockerfile, divergence `main`/`v8`). Vision produit multi-traiteurs décidée → ajout des Phases B et C et du Sprint T (theming). Plan refondu dans ce fichier.
