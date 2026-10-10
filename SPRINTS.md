# Suivi des sprints — OMB

> Fichier de suivi personnel, pas un livrable applicatif. Sert de fil conducteur entre nos sessions (Glenn + Claude).
> Dernière refonte du plan : **2026-10-07** (audit du 2026-09-06 revérifié sur `v8` + avis GPT intégré + vision produit multi-traiteurs).

---

## 📍 Où on en est (à mettre à jour à chaque session)

- **Production** : Render déploie la branche `v8` — **Sprint 1 déployé le 2026-10-09** (+ hotfix H1/H2 + correctifs formules), en **Python 3.13**. Index SQL (`supabase-scripts/create_indexes.sql`) appliqués dans Supabase.
- **Branche de travail** : aucune en cours — `sprint/2-isolation-franchses` = `v8` (en cours). 90 tests verts.
- **Prochaine étape** : **Sprint P — Performance** (décidé le 2026-10-10, passe avant le Sprint 3), en commençant par **P0** (mesurer, sans code).
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
- ~~**Q2**~~ — Répondu le 2026-10-10 : un admin peut créer pour une, plusieurs ou toutes les franchises ; une franchise ne crée que pour elle, et ses créations restent invisibles pour les autres. Distinguer visuellement l'origine → `BACKLOG.md` B7.
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
- [x] **2.2 IDOR produits/formules** — `routes/produits.py` (`get_produit`) et `routes/formules.py` (`get_formule`) : pour un non-admin, vérifier que l'ID est rattaché à sa franchise (`franchise_produits` / `franchise_formules`), sinon 404. Dépend de Q2.
  - Tests dans `tests/test_multi_tenant_isolation.py` : franchise A demande un produit/formule de B → 404.
- [~] **2.3** Revue de toutes les routes avec un `{id}` — audit fait le 2026-10-10 (38 routes, 11 fichiers) : **aucune fuite entre franchises restante**. 3 problèmes d'un autre type trouvés :
  - [x] **2.3a** `commandes.py` : 4 `except Exception` transformaient les 400/404 volontaires en 500 → `except HTTPException: raise` ajouté avant. Tests : validate d'une autre franchise → 404, liste sans franchise → 400.
  - [x] **2.3b** Détail technique des erreurs renvoyé au navigateur (`detail=f"...: {str(e)}"`) : `formule_produits.py` (~l.114), `formules.py` (~l.361 et ~l.433) → message générique, détail dans les logs seulement.
  - [-] **2.3c** (Sprint 7) Uniformiser 403/404 pour une ressource d'une autre franchise → toujours 404 (`produits.py`/`formules.py` update, `formule_produits.py` : 403 aujourd'hui).
- [-] **2.4** Pagination — **reportée** (2026-10-10) : la liste principale (commandes non archivées) reste petite grâce à l'auto-archivage. Seul l'onglet « Archivées » grossit, avec un risque réel : **limite Supabase de 1 000 lignes par requête, liste coupée sans erreur**. Sera traité dans la page Historique (`BACKLOG.md` B6 : pagination / filtres par période côté serveur).
- [x] **2.5** Fusionner `sprint/2-isolation-franchises` dans `v8` → déploiement Render → tests en prod.

## ⚡ Sprint P — Performance (priorité : avant le Sprint 3)

Branche : `sprint/p-performance` (à créer depuis `v8`).

> **Constat (2026-10-10)** : l'interface est lente — création de commande, création/modification de formule, mises à jour. Les logs Render du 2026-10-08 montrent **230 à 600 ms entre deux requêtes Supabase** (une base proche répond en 5-20 ms). Trois causes qui s'additionnent :
>
> 1. **Distance serveur ↔ base** probable (Render et Supabase dans des régions différentes ?) → chaque requête paie un aller-retour long.
> 2. **Trop d'allers-retours** : créer une commande avec 3 formules et 10 produits = 1 appel par formule et par produit, envoyés **l'un après l'autre** par le frontend (`handleCreateCommande`, `saveEditCommande` dans `commandes-modals.js`), chacun faisant 3 à 5 requêtes à la base → **~55 requêtes à la suite**.
> 3. **Le serveur traite les requêtes une par une** : toutes les routes sont en `async def` mais le client Supabase est **synchrone** (bloquant) → chaque requête à la base bloque tout le serveur ; même les appels envoyés en parallèle par le frontend (`Promise.all` pour les produits d'une formule) sont traités à la queue.
>
> **Méthode** : on **mesure avant et après** chaque étape (mêmes 3 scénarios chronométrés), pour savoir ce qui aide vraiment. Une étape = une mesure + un commit.

- [ ] **P0 Mesurer (sans code, ~15 min)**
  - Relever la **région** du service backend Render (Settings → Region) et du projet Supabase (Project Settings → General → Region).
  - Chronométrer en production, avec l'onglet **Network** (colonne _Time_, filtre _Fetch/XHR_) : ① ouverture de la page Commandes, ② création d'une commande avec 3 formules + 10 produits, ③ modification du nom d'une formule. Noter les temps ici :
    - ① … s · ② … s · ③ … s · Régions : Render … / Supabase …
  - Repérer dans les logs Render le temps entre deux lignes `HTTP Request: … supabase.co` (latence par requête).
- [ ] **P1 Rapprocher le serveur de la base** (si P0 montre des régions éloignées) — gain attendu : **÷ 5 à 10 sur tout**, sans toucher au code.
  - Option immédiate : recréer/déplacer le service Render dans la région la plus proche de Supabase (Render ne change pas la région d'un service existant : nouveau service + variables d'environnement + bascule de l'URL).
  - Option prévue : la migration vers **Hetzner** (Sprint 11, post-octobre 2026) → choisir l'Allemagne (Falkenstein/Nuremberg) avec Supabase à **Francfort** (`eu-central-1`).
  - Re-mesurer les 3 scénarios.
- [ ] **P2 Traiter les requêtes en parallèle côté serveur** — remplacer `async def` par `def` dans les routes qui n'utilisent pas `await` : FastAPI exécute alors chaque requête dans un thread séparé au lieu de bloquer tout le serveur.
  - ⚠️ À tester sérieusement (le client Supabase est partagé entre les threads) ; surveiller dans les logs si l'erreur `[Errno 11]` (tâche 1.9) diminue ou augmente — elle pourrait être liée.
  - Les tests existants doivent rester verts sans modification (le comportement ne change pas, seule la concurrence change).
  - Re-mesurer, en particulier ③ et l'ajout de plusieurs produits à une formule.
- [ ] **P3 Créer une commande complète en un seul appel** — nouvelle route (ex. `POST /commandes/complete`) qui reçoit la commande **avec** ses formules (et exclusions) et ses produits, vérifie les droits **une fois**, puis fait des **insertions groupées** (une insertion pour toutes les formules, une pour tous les produits).
  - Frontend : `handleCreateCommande` envoie un seul appel au lieu de 1 + N.
  - Gain attendu sur ② : **~55 requêtes → ~6**.
  - Bonus : plus de commande « à moitié créée » si une étape échoue au milieu (aujourd'hui, la commande peut exister sans une partie de ses produits).
  - Tests : création complète OK ; doublon de formule/produit refusé ; produit ou formule non accessible à la franchise → refus et **rien** n'est créé.
- [ ] **P4 Archivage automatique en une seule requête** — `auto_archive_old_commandes` (`commandes.py`) lit toutes les commandes validées puis les archive **une par une** (1 requête par commande), à **chaque ouverture** de la page Commandes → une seule requête `update … where delivery_date < aujourd'hui and validated and not archived` (filtrée par franchise pour les non-admins).
  - Tests : seules les commandes passées et validées sont archivées ; une franchise n'archive que les siennes.
  - Re-mesurer ①.
- [ ] **P5 Même principe pour les autres enregistrements lents**
  - Modification d'une commande (`saveEditCommande` : exclusions + nouvelles formules + nouveaux produits envoyés un par un) → un appel groupé.
  - Création d'une formule avec ses produits (`formules-create.js` : 1 appel par produit) → insertion groupée des produits côté serveur.
  - Re-mesurer ② (en modification) et ③.
- [ ] **P6 (à arbitrer) Mettre en cache la vérification de l'utilisateur** — `get_current_user` fait 1 requête à la base **à chaque appel**. Un cache de quelques secondes (ex. 10-30 s) économise cette requête.
  - ⚠️ Compromis avec la tâche 1.4 : un changement de rôle, une désactivation ou un changement de mot de passe mettrait jusqu'à la durée du cache à s'appliquer. À décider après P1-P5 selon le gain restant.
- [ ] **P7 Déploiement** — fusion dans `v8` → Render → re-mesurer en production et comparer à P0. Noter les gains dans le journal.
- [ ] **P8 Ménage Docker / Hetzner** — décision du 2026-10-10 : **on reste sur Render**, Hetzner est reporté sine die. On retire du dépôt ce qui ne sert qu'à Hetzner (git garde l'historique : on pourra tout retrouver le jour venu) :
  - supprimer `docker-compose.yml`, `deploy.sh`, le dossier `nginx/` (dont `nginx/certbot/`) et `backend/Dockerfile` (Render utilise son runtime Python natif via `render.yaml`, pas Docker) ;
  - `frontend/js/config.js` : retirer le cas `"/api"` (servi par Nginx en Docker sur `localhost` sans port) → ne garder que développement local (`http://localhost:8000`) et production (`https://omb-backend.onrender.com`) ;
  - `README.md` : supprimer la section « Infra cible — Hetzner CX22 (Docker Compose) » (~ligne 496) et vérifier les mentions de `localhost:8080` ;
  - `SPRINTS.md` : passer le **Sprint 11** en reporté (`[-]`), et la tâche **11.2** (Dockerfile non-root) devient sans objet ;
  - avant de supprimer : `grep -rn "docker\|nginx\|deploy.sh\|8080" --exclude-dir=venv --exclude-dir=.git .` pour ne rien oublier ;
  - tests : suite verte + application locale et production qui démarrent normalement (rien de tout ça n'est utilisé par Render).

**Hors scope de ce sprint** (noté pour plus tard) : passer au client Supabase **asynchrone** (plus propre que P2 mais touche toutes les routes — à envisager avec la Phase B) ; pagination de l'onglet « Archivées » (→ `BACKLOG.md` B6).

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
- **2026-10-10** - déploiement du sprint 2 et tests des nouvelles fonctionnalités directement sur Render.
