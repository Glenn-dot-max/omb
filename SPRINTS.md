# Suivi des sprints — OMB

> Fichier de suivi personnel, pas un livrable applicatif. Sert de fil conducteur entre nos sessions (Glenn + Claude).
> Dernière refonte du plan : **2026-10-07** (audit du 2026-09-06 revérifié sur `v8` + avis GPT intégré + vision produit multi-traiteurs).

---

## 📍 Où on en est (à mettre à jour à chaque session)

- **Production** : Render déploie la branche `v8` — **Sprint 1 déployé le 2026-10-09** (+ hotfix H1/H2 + correctifs formules), en **Python 3.13**. Index SQL (`supabase-scripts/create_indexes.sql`) appliqués dans Supabase.
- **Branche de travail** : aucune en cours — `sprint/2-isolation-franchses` = `v8` (en cours). 79 tests verts.
- **Prochaine étape** : Sprint 2 (branche à créer depuis `v8`). Bloqué par **Q1** (archiver ou supprimer).
- **Non prioritaire** : voir [BACKLOG.md](BACKLOG.md).

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
Principe : _construire pour OMB, concevoir pour plusieurs clients_. Pas de dette qui bloque la commercialisation.

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
- ~~**Q1**~~ — Répondu le 2026-10-10 : **archiver, ne jamais supprimer une commande passée** (prérequis de l'historique / KPI, `BACKLOG.md` B6). Note : la route d'archivage manuel n'est appelée par aucun bouton de l'interface ; l'archivage réel est automatique (`auto-archive`).
- **Q2** — Les produits/formules créés par une franchise doivent-ils rester invisibles aux autres franchises ? (Détermine la correction de la tâche 2.2.)
- **Q3** — Le dépôt `Glenn-dot-max/omb` reste-t-il public ?
- **Q4** — `main` a 6 commits absents de `v8` (`73386cf`, `01515f8`, `dbb9c3f`, `0224c67`, `fc3e66c`, `4f4b536`). Leur contenu semble déjà dans `v8` sous d'autres commits → à vérifier avant de réaligner `main` (tâche 4.7).

---

# PHASE A — Sécuriser et fiabiliser l'existant

## Sprint 0 — Accès et secrets (hors code, dashboard Supabase)

> Nuance retenue (avis GPT) : la clé `anon` est faite pour être publique ; le vrai risque, ce sont les permissions (RLS). La clé `service_role` actuelle n'a jamais été committée.

- [x] **0.1** Vérifier RLS sur **toutes** les tables (Table Editor → chaque table → RLS activé ; Policies : aucune policy qui ouvre l'accès au rôle `anon`). Priorité : `users`, `carnet_commande`, `franchises`.
- [x] **0.2** Comptes présents en clair dans `backend/scripts/` (`catalog.admin@ohmybrunch.com` / `ChangeMe123!`, `paris@test.com` / `Paris1234`, mot de passe `Admin2026!` dans `generate_password.py`) : s'ils existent encore, **réinitialiser leur mot de passe depuis l'admin** (ne pas tester les identifiants), désactiver les comptes de test inutiles.
- [x] **0.3** Rotation des clés **seulement après 0.1**. ⚠️ Avec les clés legacy, régénérer change aussi la `service_role` → mettre à jour `SUPABASE_KEY` sur Render immédiatement après, sinon le backend tombe.
- [x] **0.4** Ancien projet `vaevkhnkfjpfqqcbslvi` : vérifier s'il existe et ce qu'il contient. Désactiver/révoquer les accès plutôt que supprimer à l'aveugle.
- [ ] **0.5** Répondre à Q3 (public/privé). Passer en privé limite les nouvelles consultations mais ne répare pas l'exposition passée.
- [-] **0.6** Purge de l'historique git (`git filter-repo`) — reporté, optionnel, après 0.3.

## Sprint 1 — Bugs backend et authentification

Branche : `sprint/1-nettoyage-backend` (en cours).

- [x] **1.1 Reset de mot de passe cassé** — `backend/models.py` : supprimer la 2e classe `ResetPasswordRequest` (lignes ~328-329) qui écrase la première (celle avec `token` + règles du mot de passe). Aujourd'hui `auth.py:197` lit `payload.token` → erreur 500.
  - Test : `POST /auth/reset-password` avec un faux token → 400 (pas 500) ; mot de passe trop faible → 422.
- [x] **1.2 `password_hash` renvoyé au navigateur** — `backend/routes/admin.py`, `get_users` et `get_user` : remplacer `select("*, franchises(nom)")` par la liste explicite des colonnes utiles.
  - Test : la réponse ne contient pas la clé `password_hash`.
- [x] **1.3 Mot de passe en clair dans la réponse** — `admin.py`, `reset_password` : retirer `"new_password"` du `return` (confirmé : `admin.js` ne l'utilise pas).
  - Test : la réponse ne contient pas le mot de passe envoyé.
- [x] **1.4 Sessions non révoquées** — `backend/auth.py`, `get_current_user` :
  - élargir le `select("active")` existant à `active, role, franchise_id, password_changed_at` ;
  - utiliser `role` et `franchise_id` **de la base**, pas du token (aujourd'hui un changement de rôle/franchise met jusqu'à 7 jours à s'appliquer) ;
  - refuser un token dont la date d'émission (`iat`, à ajouter dans `create_access_token`) est antérieure à `password_changed_at`.
  - Tests : token émis avant changement de mot de passe → 401 ; rôle modifié en base → pris en compte immédiatement.
- [x] **1.5 `FormuleCreate` sans validation** — `models.py` : `class FormuleCreate(FormuleBase)` en gardant `franchise_ids`.
  - Ajustements décidés le 2026-10-08 : `FormuleUpdate` a le même trou (renommer une formule contourne la validation) → fonction commune `check_formule_name()` utilisée par les deux ; **autoriser l'apostrophe** (« Formule d'été »), n'interdire que `<` et `>` (la vraie protection XSS = échapper à l'affichage, Sprint 3).
  - Frontend : `getErrorMessage()` dans `frontend/js/auth.js` pour afficher lisiblement les erreurs 422 (liste) au lieu de `[object Object]`, utilisée dans les 4 helpers `apiPost`/`apiPatch`/…
  - Tests : `backend/tests/test_formules.py` (tests unitaires de modèle + `parametrize`) : nom vide, espaces, `<img …>`, couverts -5 / 0, nom > 200 car. → refusés ; apostrophe acceptée ; `FormuleUpdate` partiel OK ; `POST /formules/` avec HTML → 422.
- [x] **1.5b Même correction pour les produits** — `models.py` : `ProduitBase` interdit l'apostrophe (à autoriser, n'interdire que `<` `>`) et `ProduitUpdate` n'a aucun validateur de nom. ⚠️ Avant d'autoriser l'apostrophe : `produits-catalogue.js` injecte des noms (catégories/types) dans des `onclick="…'${name}'…"` → vérifier que les noms de produits ne le sont pas.
- [x] **1.6 Bug latent `delivery_hour`** — `backend/routes/commandes.py`, `create_commande` et `update_commande` : écrire explicitement `commande_data['delivery_hour'] = delivery_hour_str` (aujourd'hui ça marche uniquement par effet de bord de `serialize_commande`).
- Fait autrement que prévu : le bloc « heure de Paris » ne faisait rien (il recalculait la même date) → remplacé dans les 2 routes par `format_delivery_fields()` (conversion explicite date/heure → texte). Format de l'heure conservé : `HH:MM:SS`.
  - Test : la commande créée a un `delivery_hour` au format `HH:MM`.
- [x] **1.7 Code mort** — supprimer `routes/franchise_catalogue.py` + son import dans `main.py` ; supprimer les `import re` inutilisés dans `produits.py` et `formules.py` ; supprimer la fixture `admin_headers` en double dans `tests/conftest.py`.
  - Test : suite verte.
- [x] **1.8** Fusion dans `v8` + déploiement Render + tests en prod (2026-10-09). Parcours « mot de passe oublié » reporté → `BACKLOG.md` B1. Bugs trouvés pendant les tests et corrigés : modification d'une formule impossible depuis le 15 juin (champ `detail-formule-type` supprimé du HTML mais encore lu en JS), badge « toutes les franchises » affiché à tort après modification (réponse incomplète du serveur → fusion des objets).
- [ ] **1.9 Erreur `[Errno 11] Resource temporarily unavailable`** — 2026-10-08 à 16:24:59, 2 GET simultanés (`/commande-formules/commande/…` et `/commande-produits/commande/…`) en 500. Erreur réseau passagère backend → Supabase. Piste : connexion HTTP/2 partagée du client Supabase quand plusieurs requêtes partent en même temps. Enquêter (reproduire, voir si elle revient dans les logs Render, options : désactiver HTTP/2, réessai automatique). Le Hotfix H1 empêche déjà qu'elle fausse les données.

## 🚑 Hotfix H1 — Commande affichée vide en modification → doublons (incident du 2026-10-08)

**Statut** : diagnostiqué, **reporté** (contournement utilisateur suffisant pour l'instant). À faire sur une branche `hotfix/commande-formule-doublon` créée **depuis `v8`**, fusionnée dans `v8` (→ déploiement), puis `v8` fusionnée dans la branche de sprint.

**Incident** (commande `f4efe8e8…`, logs Render) : à l'ouverture de la modification, le chargement des formules et des produits a échoué (`[Errno 11]`, cf. 1.9). `getCommandeFormules` / `getCommandeProduits` (`frontend/js/api.js`) avalent l'erreur (`return []`) → la commande s'affiche **vide** → l'utilisateur ressaisit formule et produits → la base refuse les doublons (contraintes d'unicité, code `23505`) → le backend répond **500**.

**Contournement à donner à l'utilisateur** : si une commande s'ouvre vide en modification, **fermer, recharger la page (F5), rouvrir**. Ne pas ressaisir. Après l'incident, vérifier la commande ligne par ligne (les produits déjà présents ont gardé leur ancienne quantité ; pour changer une quantité : retirer la ligne puis la rajouter).

- [x] **H1.a Backend : doublon → 409 au lieu de 500** — `backend/main.py` : `from postgrest.exceptions import APIError` + un `@app.exception_handler(APIError)` placé avant le handler `Exception` : si `exc.code == "23505"` → 409 « Cet élément existe déjà (doublon). Rechargez la page… » ; sinon log + 500 générique.
  - Test : `backend/tests/test_errors.py` — `mock.insert().execute.side_effect = APIError({... "code": "23505" ...})` sur `POST /commande-produits/` et `POST /commande-formules/` → 409. (Vérifié sur une copie de `v8` : 2 échecs avant, 27 tests verts après.)
- [x] **H1.b Frontend : ne plus masquer les erreurs de chargement** (le vrai correctif) — `frontend/js/api.js`, `getCommandeFormules` et `getCommandeProduits` : `return [];` → `throw error;`. Les 3 appelants (détail, modification, duplication dans `commandes-modals.js`) ont déjà un `try/catch` qui affiche un message. Corrige aussi la duplication, qui aurait créé une copie vide sans prévenir.
- [x] **H1.c Frontend : enregistrement protégé** — `frontend/js/commandes/commandes-modals.js` :
  - renommer `handleSaveEditCommande` → `saveEditCommande`, et ajouter au-dessus un nouveau `handleSaveEditCommande` qui désactive le bouton `#save-edit-commande` pendant l'enregistrement (`try { await saveEditCommande(); } finally { saveBtn.disabled = false; }`) → plus de double clic ;
  - STEP 5 : mémoriser l'`id` renvoyé après chaque création (`formule.id = created.id`, `produit.id = created.id`) → un nouvel essai après un échec partiel ne renvoie pas ce qui est déjà enregistré ;
  - `catch` final : `showToast(error.message || "Erreur lors de la sauvegarde de la commande.", "error")`.
- [x] **H1.d Déploiement** (à faire **après H2**, les deux dans la même branche hotfix) — commit sur la branche hotfix, `git push -u origin hotfix/commande-formule-doublon`, puis `git switch v8 && git merge hotfix/commande-formule-doublon && git push` → tester en prod → `git switch sprint/1-nettoyage-backend && git merge v8`.

## 🚑 Hotfix H2 — La duplication d'une commande donne une copie incomplète (signalé le 2026-10-08)

**Statut** : diagnostiqué (lecture du code de `v8`), **à faire dans la même branche hotfix que H1**, avant H1.d.

**Cause** (`frontend/js/commandes/commandes-modals.js`, `handleDuplicateCommande`, ligne ~928) : bug de **références JavaScript** sur les « alias de compatibilité » de `frontend/js/commandes.js` (lignes ~34-40) :

- au chargement, `let tempFormules = AppState.tempFormules;` → les deux noms désignent **le même tableau** ;
- mais le reste du code **réaffecte** la variable (`tempFormules = [];` à l'ouverture/fermeture de la modale de création) → `tempFormules` pointe désormais vers un **autre** tableau que `AppState.tempFormules` ;
- la duplication fait `AppState.tempFormules = [];` puis `AppState.tempFormules.push(...)`, alors que l'affichage (`displayTempFormules`) et la création (`handleCreateCommande`) lisent `tempFormules` → les formules et produits copiés **ne sont ni affichés ni créés** (ou on voit des restes d'une saisie précédente). Même chose pour `tempProduits`.

**Causes secondaires** :

- une formule de la commande d'origine qui n'est plus dans `allFormules` (ex. désactivée depuis pour la franchise) est **ignorée sans prévenir** (`if (formuleData) { … }`) ;
- `getCommandeFormules` / `getCommandeProduits` renvoient `[]` en cas d'erreur (corrigé par H1.b).

- [x] **H2.a** Dans `handleDuplicateCommande` : remplacer `AppState.tempFormules = []; AppState.tempProduits = [];` par `tempFormules = []; tempProduits = [];`, et `AppState.tempFormules.push(` / `AppState.tempProduits.push(` par `tempFormules.push(` / `tempProduits.push(` → une seule variable utilisée partout, comme dans le reste du fichier.
- [x] **H2.b** Formule introuvable : au lieu de l'ignorer, compter les formules non reprises et afficher un avertissement (`showToast("⚠️ N formule(s) de la commande d'origine ne sont plus disponibles et n'ont pas été copiées.", "warning")`).
- [x] **H2.c Test manuel** (pas de tests frontend automatisés pour l'instant) : dupliquer une commande avec ≥ 2 formules (dont une avec exclusions) et ≥ 2 produits → la modale affiche tout → « Créer » → la nouvelle commande contient bien tout, avec les mêmes quantités et exclusions. Refaire le test **après** avoir ouvert puis fermé une fois la modale « Nouvelle commande » (c'est ce qui casse l'alias).
- [x] **H2.d (Sprint 4 / 10, pas dans le hotfix)** Supprimer les « alias de compatibilité » de `commandes.js` (`allFormules`, `editFormules`, etc. ont le même risque) : n'utiliser qu'`AppState.xxx` partout. Noter aussi : la route backend `POST /commandes/{id}/duplicate` et `duplicateCommande()` (`api.js`) ne sont appelées nulle part → code mort, à supprimer ou à réutiliser (dupliquer côté serveur serait plus fiable).

## Sprint 2 — Isolation entre franchises et perte de données

- [x] **2.1 Archivage destructif** — décision du 2026-10-10 : la route d'archivage **manuel** (`PATCH /commandes/{id}/archive`, qui supprimait pour les franchises) n'était appelée par aucun bouton → **supprimée** (backend + `archiveCommande()` dans `api.js`). L'archivage **automatique** (`auto-archive` + onglet « Archivées ») est conservé.
  - Test : `PATCH /commandes/{id}/archive` → 404, et aucune suppression.
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
- [ ] **4.3** Aligner le venv local sur la production : Render tourne en réalité en **Python 3.13** (vu dans les logs du 2026-10-08), alors que `render.yaml` demande 3.11 et que le venv local est en 3.9. Choisir une version, la fixer dans `render.yaml` (vérifier pourquoi elle n'est pas respectée) et recréer le venv local avec la même.
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
- [ ] **5.5** Corriger `test_franchise_catalogue_produits_allowed_for_catalog_admin` (`test_multi_tenant_isolation.py`) : `liens_response.date` → `.data`, et `mock_db.return_value.table.side_effect` → `mock_db.table.side_effect` (sa fausse table n'est jamais utilisée, le test passe « par chance »).

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

## Sprint T — Theming (marque blanche) — _peut démarrer à tout moment, indépendant du reste_

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
- **2026-10-08** — Sprint 0 fait (sauf 0.5). Tâches 1.1 (reset mot de passe : doublon de modèle + nom de champ `newPassword` côté frontend), 1.2, 1.3, 1.4 (rôle/franchise relus en base, tokens invalidés après changement de mot de passe, nouveau token renvoyé) faites, 56 tests verts. 1.5 préparée (ajustements : `FormuleUpdate`, apostrophe autorisée, `getErrorMessage`) + ajout 1.5b. **Incident prod** sur la commande `f4efe8e8…` : chargement en erreur masqué → commande affichée vide → doublons → 500. Diagnostic fait, Hotfix H1 planifié et reporté (contournement : recharger la page). Ajout 1.9 (`Errno 11`) ; découverte que Render tourne en Python 3.13 (4.3 mise à jour). Signalement « duplication de commande incomplète » → cause trouvée (alias `tempFormules` / `AppState.tempFormules` désynchronisés), Hotfix H2 planifié.
- **2026-10-09** — Hotfix H1 + H2 déployés. Tâches 1.5b, 1.6, 1.7 faites. **Sprint 1 déployé en production** (fast-forward de `v8`). Tests en prod : 2 bugs anciens de la page Formules trouvés et corrigés. Création de `BACKLOG.md` (mot de passe oublié reporté).
