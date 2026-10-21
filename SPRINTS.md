# Suivi des sprints — OMB

> Fichier de suivi personnel, pas un livrable applicatif. Sert de fil conducteur entre nos sessions (Glenn + Claude).
> Dernière refonte du plan : **2026-10-07** (audit du 2026-09-06 revérifié sur `v8` + avis GPT intégré + vision produit multi-traiteurs).

---

## 📍 Où on en est (à mettre à jour à chaque session)

- **Production** : Render déploie `main` — **Sprint P déployé le 2026-10-13**, P10 (cache busting) le 2026-10-14 (création de commande < 1 s, base à Francfort ; ancien projet Oregon supprimé le 2026-10-19). Python 3.13.
- **Branches de travail** : `sprint/v2-6-primevue` (PrimeVue branché sur le thème, commité, pas encore fusionné) puis `sprint/v3-admin` (V3.1 en cours).
- **Décision du 2026-10-19** : le frontend passe à **Vue.js** (Sprint V, juste après l'existant). Règle : **ne plus faire de travail sur l'ancien frontend qui deviendrait inutile avec Vue** (sauf bug bloquant ou faille de sécurité en production).
- **Réunion OMB du 2026-10-21** : ⏰ 2027-01-31 (fin du contrat) — **priorité absolue : terminer le planning de production** (Commandes + Planning en Vue/PrimeVue, avec les retours de la cuisine intégrés en V4 et V5). Ordre ensuite : fondations (Phase B) → **planning de service** → **pointage** (repris depuis le début avec Max et le père de Glenn) → pack hygiène. Détail dans [ROADMAP.md](ROADMAP.md) (journal du 2026-10-21).
- **Prochaines tâches** : **V3 Admin** (V3.1 garde-fous backend, puis franchises, utilisateurs, harmonisation PrimeVue des pages V2). V0 à V2 et V1.8 terminés et en ligne, cachés sous `/app/`.

- Non prioritaire : [BACKLOG.md](BACKLOG.md).

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
- **Q4** — `main` a 6 commits absents de `v8` (`73386cf`, `01515f8`, `dbb9c3f`, `0224c67`, `fc3e66c`, `4f4b536`). Leur contenu semble déjà dans `v8` sous d'autres commits → à vérifier avant de remettre `main` comme branche de production (tâche 4.7).

---

# PHASE A — Sécuriser et fiabiliser l'existant

## Sprint 0 — Accès et secrets (hors code, dashboard Supabase)

> Nuance retenue (avis GPT) : la clé `anon` est faite pour être publique ; le vrai risque, ce sont les permissions (RLS). La clé `service_role` actuelle n'a jamais été committée.

- [x] **0.1** Vérifier RLS sur **toutes** les tables (Table Editor → chaque table → RLS activé ; Policies : aucune policy qui ouvre l'accès au rôle `anon`). Priorité : `users`, `carnet_commande`, `franchises`.
- [x] **0.2** Comptes présents en clair dans `backend/scripts/` (`catalog.admin@ohmybrunch.com` / `ChangeMe123!`, `paris@test.com` / `Paris1234`, mot de passe `Admin2026!` dans `generate_password.py`) : s'ils existent encore, **réinitialiser leur mot de passe depuis l'admin** (ne pas tester les identifiants), désactiver les comptes de test inutiles. -> ⚠️ Incomplet : Admin2026! était encore le mot de passe du compte TECH_ADMIN ; changé le 2026-10-19 (Sprint 4).
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
- [x] **1.9 Erreur `[Errno 11] Resource temporarily unavailable`** — 2026-10-08 à 16:24:59, 2 GET simultanés (`/commande-formules/commande/…` et `/commande-produits/commande/…`) en 500. Erreur réseau passagère backend → Supabase. Piste : connexion HTTP/2 partagée du client Supabase quand plusieurs requêtes partent en même temps. Enquêter (reproduire, voir si elle revient dans les logs Render, options : désactiver HTTP/2, réessai automatique). Le Hotfix H1 empêche déjà qu'elle fausse les données. -> traitée par la Hotfix H3 (à confirmer dans les logs).
- [ ] **1.10 Rôle incohérent entre frontend et backend après un changement de rôle** — depuis 1.4, le backend lit rôle et franchise **en base** à chaque requête, mais le frontend (`getUser()` dans `auth.js`) les lit dans le **token**, figé à la connexion. Après un changement de rôle dans l'admin, l'écran se comporte selon l'ancien rôle et le serveur selon le nouveau (vu le 2026-10-11 : badges contradictoires dans la page Produits). Correctif : au chargement de chaque page, récupérer rôle et franchise via `GET /auth/me` et les utiliser à la place du token. Contournement en attendant : se déconnecter / reconnecter après un changement de rôle. → **À faire dans le socle Vue (V1)** : pas de correctif dans l'ancien frontend.

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

## 🚑 Hotfix H3 — Erreurs 500 « CORS » au chargement des pages (Errno 11), 2026-10-19

- [x] **H3** Logs Render : `httpx.ReadError: [Errno 11] Resource temporarily unavailable` dans `httpcore/_sync/http2.py` (`GET /formules/`, `GET /unite/` en même temps) → la tâche **1.9** se produit en production et bloque l'ajout de formules à la création d'une commande. Cause probable : depuis P2, plusieurs threads partagent la connexion HTTP/2 unique du client Supabase. Correctif : client `httpx` en **HTTP/1.1** passé à Supabase (`database.py`) + gestionnaire `httpx.HTTPError` → **503** propre avec en-têtes CORS (`main.py`). Non reproduit en local (Mac) : surveiller les logs Render.

## 🚑 Hotfix H4 — Déconnexion après un changement de mot de passe (2026-10-20)

- [x] **H4** `POST /auth/change-password` renvoyait le **texte** `"new_token"` au lieu du nouveau token → l'utilisateur était déconnecté juste après avoir changé son mot de passe (notamment à la première connexion). Le test ne vérifiait que la présence du champ. Corrigé + test qui décode le token. Au passage : mauvais mot de passe actuel → **400** au lieu de 401 (401 déconnecte), et règles de solidité du nouveau mot de passe vérifiées **par le serveur** (`check_mot_de_passe`, partagée avec la réinitialisation).

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

- [x] **P0 Mesurer (sans code, ~15 min)**
  - Relever la **région** du service backend Render (Settings → Region) et du projet Supabase (Project Settings → General → Region).
  - Chronométrer en production, avec l'onglet **Network** (colonne _Time_, filtre _Fetch/XHR_) : ① ouverture de la page Commandes, ② création d'une commande avec 3 formules + 10 produits, ③ modification du nom d'une formule. Noter les temps ici :
    - ① … s · ② … s · ③ … s · Régions : Render … / Supabase …
  - Repérer dans les logs Render le temps entre deux lignes `HTTP Request: … supabase.co` (latence par requête).
- [x] **P1 Rapprocher le serveur de la base** (si P0 montre des régions éloignées) — gain attendu : **÷ 5 à 10 sur tout**, sans toucher au code.
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
  - [x] **P3a** Modèle CommandeComplete (formules + produits, règles anti-doublon) + 9 tests
  - [x] **P3b** Route POST /commandes/complete : droits vérifiés en 2 requêtes, insertions par lots, annulation si échec + 6 tests
  - [x] **P3d** (Q5) Menus de sélection filtrés sur la franchise de l'utilisateur : `filterForMyFranchise()` dans `auth.js`, appliquée aux 6 menus (création/modification de commande, création de formule, ajout dans une formule). **À déployer avec P3.**
  - [x] **P3e** (Q5) Page Produits : indicateur « ✅ dans votre franchise / ❌ pas dans votre franchise » pour les admins du catalogue qui ont une franchise.

- [x] **P4 Archivage automatique en une seule requête** — `auto_archive_old_commandes` (`commandes.py`) lit toutes les commandes validées puis les archive **une par une** (1 requête par commande), à **chaque ouverture** de la page Commandes → une seule requête `update … where delivery_date < aujourd'hui and validated and not archived` (filtrée par franchise pour les non-admins).
  - Tests : seules les commandes passées et validées sont archivées ; une franchise n'archive que les siennes.
  - Re-mesurer ①.
- [x] **P5 Même principe pour les autres enregistrements lents**
  - Modification d'une commande (`saveEditCommande` : exclusions + nouvelles formules + nouveaux produits envoyés un par un) → un appel groupé.
  - Création d'une formule avec ses produits (`formules-create.js` : 1 appel par produit) → insertion groupée des produits côté serveur.
  - Re-mesurer ② (en modification) et ③.
- [-] **P6 (à arbitrer) Mettre en cache la vérification de l'utilisateur** — `get_current_user` fait 1 requête à la base **à chaque appel**. Un cache de quelques secondes (ex. 10-30 s) économise cette requête.
  - ⚠️ Compromis avec la tâche 1.4 : un changement de rôle, une désactivation ou un changement de mot de passe mettrait jusqu'à la durée du cache à s'appliquer. À décider après P1-P5 selon le gain restant.
- [x] **P7 Déploiement** — fusion dans `v8` → Render → re-mesurer en production et comparer à P0. Noter les gains dans le journal.
- [x] **P8 Ménage Docker / Hetzner** — décision du 2026-10-10 : **on reste sur Render**, Hetzner est reporté sine die. On retire du dépôt ce qui ne sert qu'à Hetzner (git garde l'historique : on pourra tout retrouver le jour venu) :
  - supprimer `docker-compose.yml`, `deploy.sh`, le dossier `nginx/` (dont `nginx/certbot/`) et `backend/Dockerfile` (Render utilise son runtime Python natif via `render.yaml`, pas Docker) ;
  - `frontend/js/config.js` : retirer le cas `"/api"` (servi par Nginx en Docker sur `localhost` sans port) → ne garder que développement local (`http://localhost:8000`) et production (`https://omb-backend.onrender.com`) ;
  - `README.md` : supprimer la section « Infra cible — Hetzner CX22 (Docker Compose) » (~ligne 496) et vérifier les mentions de `localhost:8080` ;
  - `SPRINTS.md` : passer le **Sprint 11** en reporté (`[-]`), et la tâche **11.2** (Dockerfile non-root) devient sans objet ;
  - avant de supprimer : `grep -rn "docker\|nginx\|deploy.sh\|8080" --exclude-dir=venv --exclude-dir=.git .` pour ne rien oublier ;
  - tests : suite verte + application locale et production qui démarrent normalement (rien de tout ça n'est utilisé par Render).
  - supprimer getCommandeFormuleExclusions (api.js) et la route GET /commande-formules/{id}/exclusions, devenues inutiles (P5a-3).
- [x] **P8c Supprimer les anciennes routes backend remplacées par P3/P5** (gardées quelques jours après le déploiement du 2026-10-13 pour les navigateurs avec l'ancienne version en cache — délai écoulé). Candidates : `POST /commandes/`, `PUT /commandes/{id}`, `POST /commandes/{id}/duplicate`, `POST /commande-formules/`, `PATCH /commande-formules/{id}`, `GET /commande-formules/{id}/exclusions`, `POST /commande-produits/`. Pour **chacune** : vérifier par `grep` qu'aucun appel ne reste dans `frontend/js/` → supprimer la route, ses modèles devenus inutiles et ses tests → suite pytest verte.
      Fait le 2026-10-19 : 8 routes supprimées (3 dans `commandes.py`, 3 dans `commande_formules.py`, 2 dans `commande_produits.py`), 123 → 111 tests ; test 409 corrigé (il passait par chance à cause d'une faute de frappe dans un mock).
- [x] **P9 Bug : nombre de franchises faux (limite Supabase de 1000 lignes)** — vu le 2026-10-11 : des produits actifs dans 3 franchises affichent « propre à votre franchise ». Dans `GET /produits/` et `GET /formules/` (partie franchise), la requête qui compte les liens actifs dépassait 1000 lignes et était tronquée sans erreur → `nb_franchises` faux. Correctif : `fetch_all_paginated` (déjà utilisée par la partie admin). ⚠️ Reste à surveiller : `in_("id", produit_ids)` sur la table `produits` sera aussi limité à 1000 lignes si une franchise dépasse 1000 produits.
- [x] **P10 Cache busting des fichiers JS/CSS** — incident du 2026-10-13 au déploiement de P7 : le CDN de Render (`s-maxage=300`) a servi l'ancien `auth.js` avec les nouveaux autres fichiers → `filterForMyFranchise` introuvable pendant ~5 min. Correctif : `?v=__VERSION__` sur les 60 `<script>`/`<link>` des 11 pages HTML, remplacé au build Render par `$RENDER_GIT_COMMIT`.
      Déployé le 2026-10-14 (commit `22cc3e4`), Build Command Render : `V=${RENDER_GIT_COMMIT:-$(date +%s)} find . -name "*.html" -exec perl -pi -e 's/__VERSION__/$ENV{V}/g' {} +`. ⚠️ Toute nouvelle balise `<script>`/`<link>` locale doit avoir `?v=__VERSION__`.

**Hors scope de ce sprint** (noté pour plus tard) : passer au client Supabase **asynchrone** (plus propre que P2 mais touche toutes les routes — à envisager avec la Phase B) ; pagination de l'onglet « Archivées » (→ `BACKLOG.md` B6).

## Sprint 3 — XSS : bloquer les balises côté backend (revu le 2026-10-19)

> **Changement de stratégie** (passage à Vue décidé le 2026-10-19) : on ne corrige plus les ~98 `innerHTML` de l'ancien frontend (Vue échappe automatiquement les données affichées → travail inutile). À la place, on empêche les balises d'**entrer** dans la base : validation Pydantic côté backend, testée avec pytest, qui reste utile après Vue (deuxième barrière).
> Inventaire du 2026-10-19 : déjà protégés → noms de produits/formules (`check_name`), `nom_client` **à la création**, catégories. Données insérées dans des attributs HTML : uniquement des id/nombres (sûr).

- [x] **3.1** `nom_client` **à la modification** : `CarnetCommandeUpdate` (`models.py`, ~ligne 174) n'a pas le validateur de `CarnetCommandeBase` → un nom avec balise passe par `PUT /commandes/{id}/complete`. Factoriser une fonction partagée (comme `check_name`) utilisée par les deux.
- [x] **3.2** `notes` de commande (création et modification) : refuser `<` et `>` (garder apostrophes et guillemets, utiles en français).
- [x] **3.3** Types (`routes/types.py`, `TypeCreate` / `TypeUpdate` sans aucune validation) : même règle que les catégories.
- [x] **3.4** Admin : franchises (`nom`, `city`, `address`, `phone`) et utilisateurs (`full_name`) : refuser `<` et `>`.
- [x] **3.5** Données déjà en base : requête en lecture seule pour vérifier qu'aucune valeur existante ne contient `<` ou `>` (nom_client, notes, types, franchises, utilisateurs) ; corriger à la main s'il y en a.
- [x] **3.6** Ancien frontend, seulement si nécessaire : les 2 `onclick` d'`admin.js` qui insèrent un nom de catégorie/type (`'${cat.name.replace(...)}'`) — vérifier qu'ils sont neutralisés par 3.3 (catégories et types refusent déjà `'` et `"`) ; sinon passer l'id seul.
- [-] ~~Corriger chaque `innerHTML` avec `escapeHtml()`~~ → abandonné (Vue).
- [-] **3.7** Discussion (à reprendre avec le socle Vue) : token JWT dans `localStorage` vs cookie `httpOnly`.

## Sprint 4 — Hygiène du dépôt

- [x] **4.1** Scripts `backend/scripts/` : lire email/mot de passe via `input()`/`getpass` ou variable d'environnement, plus rien en dur. -> dossier backend/scripts supprimé (2026-10-19): les 4 scripts étaient obsolètes, la page Admin crée les comptes. Les mots de passe restent dans l'historique git, d'où le changement du mot de passe admin."
- [x] **4.2** `requirements-dev.txt` pour `pytest` (garder `httpx` en prod : dépendance de Supabase).
- [x] **4.3** Aligner le venv local sur la production : Render tourne en réalité en **Python 3.13** (vu dans les logs du 2026-10-08), alors que `render.yaml` demande 3.11 et que le venv local est en 3.9. Choisir une version, la fixer dans `render.yaml` (vérifier pourquoi elle n'est pas respectée) et recréer le venv local avec la même. → Python 3.13 en local et PYTHON_VERSION=3.13.4 sur Render (2026-10-19)
- [x] **4.4** Renommer `backend/routes/_init_.py` → `__init__.py`.
- [-] **4.5** ~~CSS dupliqué dans `frontend/css/style.css`~~ → abandonné le 2026-10-19 (l'ancien CSS sera remplacé par Vue).
- [x] **4.6** `render.yaml` : déclarer les secrets avec `sync: false`.→ backend/render.yaml supprimé : il n'était pas lu (il annonçait 3.11 alors que Render tourne en 3.13), les réglages sont dans le tableau de bord Render
- [x] **4.7** **Revenir à `main` comme branche de production** (décidé le 2026-10-19, à faire en dernier dans le Sprint 4, avant le Sprint V ; pas urgent). Convention standard : `main` = production. Étapes :
  1. Vérifier Q4 (les 6 commits de `main` absents de `v8` sont-ils déjà dans `v8` sous une autre forme ?) ; archiver `main` par une étiquette `archive/main-avant-bascule`.
  2. Mettre `main` exactement au niveau de `v8` (`git switch main` → `git reset --hard v8` → `git push --force-with-lease origin main`) — seule fois où on réécrit une branche partagée, justifiée par l'étiquette d'archive.
  3. Render : passer la **branche suivie** de `v8` à `main` sur le backend **et** le frontend (Settings → Build & Deploy → Branch), vérifier l'Auto-Deploy.
  4. GitHub : branche par défaut → `main` (Settings → Branches).
  5. Mettre à jour `CLAUDE.md`, `README.md` et les mémos (« `v8` = production » → `main`), puis supprimer `v8` (local + GitHub) une fois un déploiement depuis `main` vérifié.
     → fait le 2026-10-19 ; Q4 vérifiée : les 6 commits de main étaient déjà dans v8 sous une forme plus récente (ou s'annulaient) ; archive archive/main-avant-bascule
- [x] **4.8** Ménage des branches (conseil d'un développeur, 2026-10-19) : supprimer les branches déjà fusionnées (local + GitHub), archiver par étiquette puis supprimer les branches jamais fusionnées (`v4`, `copilot/*`, `revert-1-copilot/*`). Commandes préparées le 2026-10-19. Ensuite : supprimer chaque branche dès sa fusion.
- [x] **4.9** Fichiers `.DS_Store` (macOS) retirés du suivi git avec `git rm --cached` : ils étaient dans `.gitignore` mais avaient été commités avant.

---

# PHASE V — Passage du frontend à Vue.js (décidé le 2026-10-19)

## Sprint V — Vue + Vite, migration progressive des écrans (revu le 2026-10-19 au soir)

> **Pourquoi** : un framework plutôt que du JavaScript écrit à la main (conseil d'un développeur, 2026-10-19) → XSS réglé par conception (`{{ }}` toujours échappé ; **ne jamais utiliser `v-html`** avec une donnée saisie), composants réutilisables, code standard pour un futur développeur. Vite empreinte les noms de fichiers → cache réglé sans la P10.
> **Méthode (décisions de Glenn, 2026-10-19 et 2026-10-20)** : **développement progressif, une seule mise à jour pour les utilisateurs**. Chaque écran migré est fusionné dans `main` et publié **« caché »** sur le site de production, sous `/app/` : aucun lien de l'ancien frontend n'y mène, les utilisateurs ne voient rien, Glenn teste en conditions réelles en tapant l'adresse `…/app/…`. La **bascule finale (V8)** ajoute les liens et redirections : c'est la seule mise à jour visible. Glenn tape le code (mode tuteur conservé).
> **Pas de site de préproduction séparé** (envisagé puis écarté le 2026-10-20 : même bénéfice, un service Render et un réglage CORS en moins). ⚠️ Les tests sur `/app/` écrivent dans la **base de production** → données `TEST …`, supprimées après. Si le build Vue échoue, Render garde la version précédente en ligne (pas de coupure).
> **Cohabitation** : l'application Vue est servie **sur le même site** que l'ancien frontend, sous **`/app/`** (ex. `…/app/mon-compte`). Même adresse = même `localStorage` → **la connexion (`omb_token`) est partagée** entre ancien et nouveau frontend, sans se reconnecter (en local : proxy Vite sur `localhost:5173`). Les pages Vue pointent vers les anciennes pages pas encore migrées ; à la bascule, les anciennes pages migrées redirigent vers leur version Vue.
> **Marque blanche (décision du 2026-10-20)** : préparée **dans le socle**, avant de migrer les écrans. Couleurs en **variables CSS** (`theme.css`) dans le CSS partagé, nom/logo dans une **configuration de marque** (`src/config/marque.js`). **Règle : aucune couleur ni aucun nom de marque écrits en dur dans un composant Vue.**
> **Choix techniques** : Vue 3 + Vite (`base: '/app/'`), **JavaScript** (pas TypeScript), `<script setup>` (Composition API), Vue Router (historique sous `/app/` + réécriture Render `/app/* → /app/index.html`), Pinia (utilisateur connecté), client API maison basé sur `fetch` (repris de `auth.js`/`api.js`), **CSS actuel réutilisé tel quel** (pas de refonte graphique pendant la migration), Vitest pour les règles métier. **Node 24** (Vite 8 exige Node 22.18+ ; Node 20 échoue à l'installation, vérifié).
> **Composants (décision du 2026-10-21)** : **PrimeVue 4** branché sur les couleurs du thème (V2.6). Tous les nouveaux écrans utilisent ses composants (`Button`, `InputText`, `InputNumber`, `Select`, `DataTable`, `Dialog`, `Stepper`, `DatePicker`…), jamais une couleur en dur ; les pages V2 sont harmonisées en V3.5.
> **Règle de migration** : à fonctionnalité **identique** (pas de nouveautés, sauf B1/B9/B10 notées ci-dessous), **sauf pour Planning (V4) et Commandes (V5)** : les retours de la cuisine de la réunion du 2026-10-21 y sont construits **directement en Vue/PrimeVue** (refaire l'ancien formulaire à l'identique puis le transformer serait du travail perdu) ; chaque écran est comparé à l'ancien avec une liste de tests manuels avant sa mise en ligne, **vérifiée à trois tailles** (tablette portrait 768×1024, tablette paysage 1024×768, ordinateur 1440 px) avec le mode « appareil » des outils de développement. Écrans lourds (Planning, Commandes) : tableaux défilables, filtres sur plusieurs lignes, fenêtres en plein écran sur tablette portrait.
> **Ordre** : du moins risqué au plus utilisé — pages simples → Admin (utilisé seulement par le TECH_ADMIN) → Planning → Commandes (le plus utilisé, quand Vue sera bien maîtrisé) → connexion. **Produits et Formules : migrées au Sprint 8** avec le nouveau catalogue (pour ne pas les refaire deux fois).
> **Durée estimée** : **4 à 5 semaines** à plein temps (apprentissage de Vue compris), **plus environ 2 semaines** pour les retours de la cuisine du 2026-10-21 (V4, V5). Dates retirées en attendant d'être recalculées (décision du 2026-10-21) ; seule échéance ferme : ⏰ 2027-01-31, planning de production terminé. Revue du socle par le développeur senior (S1, novembre).
> **Branches** : une branche courte par étape (`sprint/v0-…`, `sprint/v1-…`), fusionnée dans `main` puis supprimée, comme d'habitude.

- [x] **V0 Mise en place** (~1 jour) : Node 24, créer `frontend-vue/` avec `create-vue` (Router, Pinia, Vitest, ESLint, Prettier), premier `npm run dev`, `npm run build`, test d'exemple ; `frontend-vue/` documenté dans `CLAUDE.md` et le `README`.
- [ ] **V1 Socle** (~1 semaine)
  - [-] V1.1 Comprendre Vue sur un exemple (Glenn connaît déjà Vue) : composant, `ref`/`computed`, `v-if`/`v-for`, événements, props.
  - [x] V1.2a Reprendre le CSS actuel tel quel (import de `../frontend/css/style.css`, partagé avec l'ancien frontend).
  - [x] V1.2b **Thème** (~1 jour) : recenser les ~385 couleurs de `style.css`/`admin.css`/`login.css`, les regrouper en ~10 rôles (**T.1**), créer `frontend/css/theme.css` (valeurs OMB) chargé en premier par les deux frontends, remplacer les couleurs en dur par `var(--…)` (**T.2/T.3**, script de remplacement testé sur une copie, aucun changement visuel attendu).
  - [x] V1.2c **Marque** : `src/config/marque.js` (nom, emoji/logo, couleur du navigateur) utilisé par la barre de navigation et le titre des pages (**T.5**) ; plus tard chargé depuis le backend par organisation (**T.7**).
  - [x] V1.3 Client API : `apiGet/apiPost/apiPut/apiPatch/apiDelete`, token, erreurs lisibles (`getErrorMessage`), déconnexion si 401, URL du backend selon l'environnement (variable Vite à la place de `config.js`).
  - [x] V1.4 Utilisateur connecté (Pinia) : token lu dans le même `localStorage` que l'ancien frontend, **rôle et franchise lus via `GET /auth/me`** (**tâche 1.10**) ; la décision sur le stockage du token (ancienne **3.7**) est prise ici mais appliquée quand la connexion sera migrée.
  - [x] V1.5 Routeur sous `/app/` : une route par page, **garde** (connecté obligatoire, sinon renvoi vers l'ancienne page de connexion ; admin réservé au TECH_ADMIN), redirection si `must_change_password`.
  - [x] V1.6 Mise en page commune : menu de navigation selon le rôle (liens vers les pages Vue **ou** les anciennes pages pas encore migrées), notifications (remplace `toast.js`), anti double-clic.
  - [x] V1.7 **Vue « cachée » en production** : site frontend Render → Root Directory vide, Build Command `cd frontend-vue && npm ci && npm run build && cd .. && rm -rf frontend/app && cp -R frontend-vue/dist frontend/app && V=${RENDER_GIT_COMMIT:-$(date +%s)} find frontend -name "*.html" -exec perl -pi -e 's/__VERSION__/$ENV{V}/g' {} +`, Publish Directory `frontend`, `NODE_VERSION=24`, réécriture `/app/* → /app/index.html` (anciennes valeurs notées pour un retour arrière : Root Directory `frontend`, ancienne Build Command). Vérifier l'ancien frontend **et** `…/app/`.
  - [x] V1.8 **Responsive (ordinateur + tablette)** (décision du 2026-10-21) : points de rupture communs **480 px** (téléphone), **768 px** (tablette portrait), **1024 px** (tablette paysage), notés en tête de `style.css` et dans `CLAUDE.md` ; règle tactile `@media (pointer: coarse)` → boutons/champs d'au moins 44 px de haut (sans effet à la souris) dans `style.css` et `login.css`. Correctif lié (2026-10-21) : `login.css` avait `overflow: hidden` sur `body` → impossible de défiler jusqu'au bouton sur tablette (clavier) ou petit écran ; remplacé par `overflow-x: hidden`.
- [x] **V2 Pages simples** (3 à 4 jours, chaque page testée sur `/app/` en production) : mon compte, aide, changement de mot de passe, réinitialisation du mot de passe (+ réactiver « mot de passe oublié », `BACKLOG.md` **B1**).
- [x] **V2.6 PrimeVue** : PrimeVue 4.5 + thème Aura, palette primaire branchée sur les variables de `theme.css` (`src/config/primevue.js`, test associé).
- [ ] **V3 Admin** (3 à 4 jours) : franchises, utilisateurs (création, modification, réinitialisation du mot de passe, activation). Catégories et types : migrés avec Produits au Sprint 8 (tâche **8.4**).
  - [ ] V3.1 Garde-fous backend : un admin ne peut ni se désactiver ni changer son propre rôle ; réponses utilisateur filtrées en liste blanche.
  - [ ] V3.2 Onglet Franchises (`DataTable`, `Dialog`, `ConfirmDialog`).
  - [ ] V3.3 Onglet Utilisateurs (filtre par franchise, création avec mot de passe provisoire généré, rôle et franchise, réinitialisation du mot de passe, activation).
  - [ ] V3.4 Route `/admin` réservée au TECH_ADMIN, lien du menu, vérification tablette.
  - [ ] V3.5 **Harmonisation PrimeVue des pages V2** (~½ jour) : `InputText`, `Password` avec `toggleMask` (remplace `ChampMotDePasse`), `Button` avec `:loading`, sur Mon compte, changement obligatoire, mot de passe oublié, réinitialisation. La barre de navigation et les notifications restent telles quelles jusqu'à la bascule.
- [ ] **V4 Planning** (~1 semaine + retours cuisine) : filtres (dates, type de prestation, catégorie, franchise), calculs, **export Excel** (ExcelJS), notes. + **retours de la cuisine (réunion du 2026-10-21)** :
  - [ ] **Numéro de semaine** (ISO) en haut du tableau et en haut de l'export Excel.
  - [ ] Export Excel : **case en rouge quand une commande a une note** (la cuisine va alors lire le bon de commande) ; la zone de texte des notes est conservée (elle servira quand le commerce transmettra les bons par l'interface).
  - [ ] Export Excel : **sous-catégories séparées** par une bordure double et un intitulé en gras.
  - [ ] Mariages : afficher le **nombre d'adultes et d'enfants** plutôt que le total.
  - Composants : `DataTable` (tableau), `DatePicker` (avec la traduction française de PrimeVue), `Select`/`MultiSelect` (filtres). Couleurs de l'export : lues dans la configuration de marque, pas écrites en dur.
- [ ] **V5 Commandes** (2,5 à 3 semaines avec les retours cuisine) : liste (actives / archivées, filtres, franchise pour l'admin), archivage auto à l'ouverture, création en un appel, modification en un appel, duplication (formulaire pré-rempli), suppression, validation, exclusions de produits dans les formules, badges ; + **B10** (bouton « remonter en haut ») ; autoriser les apostrophes dans le nom du client (backend + écran). + **retours de la cuisine (réunion du 2026-10-21)** :
  - [ ] **Liste des commandes en blocs**, chaque commande dans un seul bloc : **Prochains jours** (aujourd'hui, demain, après-demain) · **Semaine en cours** (de J+3 jusqu'au dimanche ; vide si J+2 tombe déjà le dimanche ou après) · **Semaine prochaine** (lundi → dimanche suivants, sans ce qui est déjà dans « Prochains jours ») · **Plus tard** (replié par défaut, pour ne perdre aucune commande).
  - [ ] **Création en écrans successifs** (`Stepper`) : 1. infos générales · 2. formules et produits · 3. service · 4. **récapitulatif avant validation** (remplace **B9**). Le même parcours sert à la modification et à la duplication.
  - [ ] Écran 1 : **type de prestation demandé avant le nombre de couverts**.
  - [ ] Mariages uniquement : convives en **deux champs, adultes et enfants** (`InputNumber`) ; « coefficient mariage » renommé **« pondération de la production »**, saisi **en pourcentage** (ex. 80 %, `InputNumber` avec suffixe « % ») au lieu d'un décimal, appliqué par défaut aux quantités des formules et produits, modifiable. ❓ (Glenn) À confirmer en début de V5 : la pondération s'applique-t-elle aux enfants seulement (10 enfants à 80 % = 8 parts) ou à toute la commande comme l'actuel `coefficient_ponderation` ?
  - [ ] Écran 2 : **recherche de formules qui trouve tout ce qui *contient* le texte tapé** (`Select`/`AutoComplete` avec `filterMatchMode="contains"`, sans tenir compte des accents ni des majuscules).
  - [ ] Écran 3 : **« Sans service » par défaut** (80 % des commandes) ; si « avec service » : « prévoir des repas pour le personnel ? » + combien.
  - [ ] Fenêtre de commande : **un clic hors de la fenêtre ne ferme plus rien** (`Dialog` avec `:dismissableMask="false"`) ; on quitte uniquement par un bouton **« Quitter »**, avec confirmation si des données ont été saisies.
  - [ ] Backend (avec tests) : nouvelles colonnes `nb_adultes`, `nb_enfants`, pondération en %, repas du personnel (oui/non + nombre) ; migration de l'ancien `coefficient_ponderation` (décimal → %).
  - [-] **Types de prestation et clé de tri** (mariages, boutique/particuliers, pro, sous-types petit-déjeuner/pause/buffet ; aucun type par défaut, création bloquée tant que rien n'est choisi) : ❓ (Max/Pascal) en attente de leur décision.
- [ ] **V6 Connexion** (1 à 2 jours) : page de connexion en Vue, page d'accueil (`index.html`) qui redirige vers l'application Vue ; application de la décision sur le stockage du token. + lien « Mot de passe oublié ? » vers `/app/mot-de-passe-oublie`, après vérification de l'envoi des emails (`BACKLOG.md` B1).
- [ ] **V7 Recette** : tous les écrans migrés repassés sur `…/app/` avec leur liste de tests manuels, par Glenn puis par 1 ou 2 personnes d'OMB (en leur donnant l'adresse).
- [ ] **V8 Ménage** (quelques jours après la bascule) : suppression des fichiers devenus inutiles de l'ancien frontend (il ne reste que Produits et Formules, migrées au Sprint 8, tâche **8.4**). + backend : le lien de l'email de réinitialisation (`forgot_password` dans `routes/auth.py`) pointe vers `/app/reinitialiser-mot-de-passe?token=…`.

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
- [ ] **8.4** Migrer les pages **Produits** et **Formules** en Vue, directement sur le nouveau modèle de catalogue (décision du 2026-10-19 : pas de migration avant, pour ne pas les refaire deux fois) ; puis supprimer l'ancien `frontend/`.

## Sprint 9 — Paramétrage par organisation (dé-OMB-iser le code)

- [ ] **9.1** Emails : expéditeur et textes depuis l'organisation (`email_service.py` contient « Oh My Brunch » en dur).
- [ ] **9.2** Fuseau horaire (`Europe/Paris` ×6), types de prestation et règle « mariage → coefficient » (`commandes-modals.js`) en paramètres.
- [ ] **9.3** `main.py` (titre API), `config.py` (URL `omb-frontend.onrender.com`) → neutres / configurables.

## Sprint T — Theming (marque blanche) — _revu le 2026-10-20 : T.1 à T.3 et T.5 avancées dans le socle Vue (V1.2b/c)_

État de l'ancien frontend : 0 variable CSS, ~385 couleurs en dur dans le CSS, ~92 dans les pages HTML, ~100 dans le JS, « Oh My Brunch » en dur dans 11 fichiers. → Le **CSS est partagé** entre l'ancien frontend et Vue : le passer en variables sert aux deux (contrairement aux couleurs dans le HTML/JS de l'ancien frontend, qu'on ne retouche pas).

- [x] **T.1** Recenser les ~10 couleurs principales et leur donner un **rôle** (`--color-primary`, `--color-primary-text`, `--color-brand-dark`, `--color-danger`…). Regrouper les variantes involontaires (`#f5c05c` / `#f5c842` / `#f4a460`…). → **V1.2b**.
- [x] **T.2/T.3** `frontend/css/theme.css` chargé en premier + couleurs de `style.css`, `admin.css`, `login.css` remplacées par `var(--…)` → **V1.2b** (aucun changement visuel attendu).
- [-] **T.4** ~~Couleurs dans le HTML et le JS de l'ancien frontend~~ → abandonné (pages réécrites en Vue).
- [x] **T.5** Nom et logo de l'organisation affichés depuis une configuration (`src/config/marque.js`), plus en dur → **V1.2c**.
- [ ] **T.6** `applyTheme(theme)` dans le socle Vue + cache `localStorage` (pas de flash au chargement). Test avec un thème bleu écrit en dur.
- [ ] **T.7** (avec Sprint 6) Colonnes thème sur `organisations`, logos dans Supabase Storage, route `GET /organisation/theme`, couleur de texte calculée automatiquement pour le contraste.
- [ ] **T.8** (commercialisation) Sous-domaine par client pour thémer la page de connexion ; manifest PWA par organisation.

---

# PHASE C — Construire et commercialiser

## Sprint 10 — Nouvelles fonctionnalités

- [x] **10.1** ~~Choisir le framework~~ → **Vue**, décidé le 2026-10-19 (→ Sprint V).
- [-] **10.2** ~~Migrer les écrans existants au fil des modifications~~ → remplacé par le Sprint V (migration planifiée) et la tâche 8.4.

## Sprint 11 — Infra Hetzner (avant la bascule) -> finalement reporté (décision prise en oct. 2026)

- [-] **11.1** TLS effectif + en-têtes de sécurité (dont CSP) dans `nginx/nginx.conf`.
- [-] **11.2** Dockerfile : utilisateur non-root + `HEALTHCHECK` (ne concerne pas Render, qui utilise le runtime Python natif).

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
- **2026-10-10** - déploiement du sprint 2 et tests des nouvelles fonctionnalités directement sur Render. Redéploiement de la base supabase, vers Frankfort depuis l'Oregon. Gain de temps sur l'interface presque par 5 sur chaque transaction.
- **2026-10-13** — **Sprint P déployé** (P2, P3, P4, P5, P8a/b, P9). Incident au déploiement : le CDN de Render a servi un ancien `auth.js` pendant ~5 min (mélange de versions) → ajout de la P10 (cache busting). P6 écartée (gain minime, contraire à 1.4).
- **2026-10-19** — Ancien projet Supabase (Oregon) supprimé après vérification des logs (seulement des contrôles de santé, aucune requête `/rest/v1/`) et de `SUPABASE_URL` sur Render (pause impossible sur l'offre payante) ; dumps et sauvegarde d'environnement effacés de `~/omb-migration` (seul `schema.sql` conservé).
- **2026-10-19** — **Décision : passage du frontend à Vue.js** (conseil d'un développeur : un framework plutôt que du JS écrit à la main), juste après l'existant (Sprint V). Règle « pas de travail inutile » : Sprint 3 revu (XSS bloqué côté backend au lieu de corriger les ~98 `innerHTML`), 4.5 et T.2-T.4 abandonnées, 1.10 / B9 / B10 / T.1 déplacées dans le Sprint V, Produits/Formules migrées en Vue avec le nouveau catalogue (8.4). Trou trouvé à l'inventaire : `nom_client` non validé à la modification (3.1).
- **2026-10-19** — **Sprint 3 terminé** (XSS bloqué côté backend) : `nom_client` validé aussi à la modification (vrai trou), notes sans balise (l'ancienne liste noire laissait passer `<svg onload=…>`), types validés, franchises et noms d'utilisateurs sans balise ; règles partagées `check_nom_client`, `check_texte_libre` ; aucune donnée existante concernée. 111 → 137 tests.
