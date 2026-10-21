# CLAUDE.md — Contexte du projet OMB pour Claude Code

> Ce fichier est lu au début de chaque session. Il décrit le projet, la façon de travailler avec Glenn, et les pièges connus.
> À tenir à jour quand une règle ou un piège nouveau apparaît.

## 🎯 Le projet

**OMB** : application de gestion pour **Oh My Brunch** (traiteur) et ses franchises — commandes, formules, produits, planning de production, administration.
Vision : devenir une **solution complète pour traiteurs**, vendue ensuite à d'autres traiteurs (multi-organisations).

- Plan produit : [`ROADMAP.md`](ROADMAP.md) (vue d'ensemble, « Où on en est ») + fiches dans [`docs/modules/`](docs/modules/) + [`docs/dev-senior.md`](docs/dev-senior.md)
- Tâches techniques en cours : [`SPRINTS.md`](SPRINTS.md) (lire d'abord « 📍 Où on en est »)
- Idées non prioritaires : [`BACKLOG.md`](BACKLOG.md)

## 👨‍🏫 Comment travailler avec Glenn (règles impératives)

Glenn **apprend à coder** en construisant ce projet. Claude est son **tuteur**, pas un développeur autonome.

1. **Ne jamais modifier le dépôt ni lancer de commande qui change un état** (fichiers, git, base de données, déploiement) **sans demande explicite, tâche par tâche.** Donner le code et les commandes exactes ; c'est Glenn qui les tape ou les colle, et qui les lance.
   - Autorisé sans demander : lecture (fichiers, `git log/diff/status/show`, `grep`), lancer `pytest`, requêtes **en lecture seule** sur le backend local ou la base (sans jamais afficher de clé, mot de passe ou email).
   - Exception : les fichiers de suivi (`SPRINTS.md`, `ROADMAP.md`, `BACKLOG.md`, `docs/`) quand Glenn demande explicitement de les rédiger ou de les alimenter.
2. **D'abord l'action, ensuite le pourquoi** : quel fichier, quoi remplacer par quoi, quelle commande — puis l'explication pédagogique (concept, pourquoi l'ancien code est faux, pourquoi le nouveau marche). En français.
3. **Valider avant de donner** : écrire et exécuter la solution complète sur une **copie** du backend dans le dossier temporaire (scratchpad), puis donner à Glenn les comptes attendus : « N failed avant, M passed après ».
4. **Quand un résultat ne correspond pas au code prévu, relire d'abord le code que Glenn a réellement tapé** (`git diff`, `grep`) avant d'imaginer une cause compliquée. Les causes les plus fréquentes : fautes de frappe (noms de tables, `retrun_value`, `asser_called_once`), lignes supprimées en trop lors d'un remplacement, indentation, `return` oublié, cache du navigateur.
5. Conseiller à Glenn de **copier-coller les longs blocs** puis de les relire, plutôt que de les retaper.

## 🔁 Méthode de travail (une tâche à la fois)

1. **Le test d'abord** → le lancer et le voir échouer **pour la bonne raison**.
2. **Le code** → tous les tests verts.
3. **Test de mutation** quand un test pourrait passer « par chance » (casser volontairement le code, vérifier que le test échoue, remettre).
4. **Cocher dans `SPRINTS.md`** et **un commit par tâche**, avec `git add` + **noms de fichiers explicites** (jamais `git add .`).
5. Avant de commiter : relire `git diff` ; lancer **`/code-review`**. Avant de déployer : **`/security-review`**.
6. Frontend : pas de tests automatiques → liste de **tests manuels précise** (onglet Network, « Disable Caches », rechargement forcé).
7. Chaque test doit avoir un **cas de réussite** et un **cas de refus** (un code cassé qui refuse tout passerait tous les tests de refus).

## 🧱 Stack et structure

- **Backend** : Python + **FastAPI** + bibliothèque `supabase` (synchrone) → PostgreSQL chez **Supabase, région Francfort** (`eu-central-1`). Auth JWT maison (`backend/auth.py`), validation **Pydantic** (`backend/models.py`), fonctions partagées dans `backend/utils.py` (`get_or_404`, `verify_commande_ownership`, `fetch_all_paginated`, `check_acces_catalogue`, `normalize_name`) ; règle commune des noms `check_name` dans `models.py`.
- Routes dans `backend/routes/*.py` — **en `def`, pas en `async def`** (la bibliothèque Supabase est bloquante ; voir pièges).
- **Frontend** : HTML/CSS + JavaScript sans framework, découpé par page (`frontend/js/commandes/`, `formules/`, `produits/`…). Appels API dans `frontend/js/api.js`, aides communes dans `frontend/js/auth.js` (`apiGet/apiPost/apiPut/apiPatch/apiDelete`, `getErrorMessage`, `preventDoubleClick`, `filterForMyFranchise`, `isInMyFranchise`).
- **Hébergement** : **Render** (backend Python + site statique frontend), déploiement automatique sur push de la branche **`main`**. Pas de Docker (abandonné).
- **Futur** (Phase B) : organisations/sites, migrations versionnées, CI, **Vue + Vite** pour les nouveaux écrans, interface tablette.

## ⌨️ Commandes utiles

```bash
# Tests backend (depuis backend/)
venv/bin/python -m pytest -q -W ignore -p no:logging

# Lancer le backend en local (depuis backend/)
venv/bin/python -m uvicorn main:app --reload --port 8000

# Lancer le frontend en local (depuis frontend/) → http://localhost:8080
python3 -m http.server 8080
```

# Frontend Vue (depuis frontend-vue/) — Node 24

npm run dev # → http://localhost:5173/app/ (avec backend 8000 + ancien frontend 8080)
npx vitest run # tests
npm run build # construction

## 🌿 Git et déploiement

- **`main` = production** (Render déploie chaque push sur `main`, backend et frontend). Depuis le 2026-10-19 ; l'ancienne branche de production `v8` a été supprimée.
- Une **branche par sprint**, créée depuis `main` ; fusion dans `main` en **fast-forward** en fin de sprint.
- **Hotfix** pour un bug en production : petite branche depuis `main` → fusion dans `main` → puis fusionner `main` dans la branche de sprint en cours.
- **Ordre de déploiement quand backend et frontend changent** : backend d'abord (« Deploy live »), puis frontend (désactiver temporairement l'Auto-Deploy du frontend sur Render, Manual Deploy, puis le réactiver).
- **Supprimer chaque branche une fois fusionnée** (conseil d'un développeur, 2026-10-19 : trop de branches) : en local `git branch -d <branche>` (refuse si elle n'est pas fusionnée), et sur GitHub `git push origin --delete <branche>` si elle y avait été poussée. Une branche jamais fusionnée qu'on veut abandonner : poser d'abord une étiquette `git tag archive/<branche> <branche>` (+ `git push origin --tags`) pour ne rien perdre. branche permanente : main (production).
- **Rétrocompatibilité** : quand une nouvelle route remplace une ancienne, garder l'ancienne quelques jours après le déploiement (navigateurs avec l'ancienne version en cache), puis la supprimer.
- **Retour arrière** : Render → Events → déploiement précédent → Rollback (backend et frontend ensemble).

## ⚠️ Pièges connus

- **Backend** : Python **3.13** (local : `venv` créé avec `python3.13` ; Render : variable `PYTHON_VERSION=3.13.4`) + **FastAPI** + bibliothèque `supabase` (synchrone) → PostgreSQL chez **Supabase, région Francfort** (`eu-central-1`).
- **Le backend local (`backend/.env`) pointe sur la base de PRODUCTION.** En test local : noms `TEST …`, supprimer après. (Une base de test séparée est prévue en Phase B.)
- **Cache** : le navigateur et le **CDN de Render** (`s-maxage=300`) peuvent servir d'anciennes pages jusqu'à 5 min après un déploiement. Depuis la P10, chaque `<script>`/`<link>` local porte `?v=__VERSION__` (remplacé au build Render par le commit) → plus de mélange de versions. **Toute nouvelle balise locale dans l'ancien frontend doit avoir `?v=__VERSION__`.** (Vite règle ça tout seul pour les écrans Vue.)
- **Marque blanche (frontend Vue)** : **aucune couleur ni aucun nom de marque écrits en dur dans un composant Vue** → variables CSS de `theme.css` (`var(--color-primary)`…) et configuration `src/config/marque.js`. Objectif : pouvoir vendre la solution à d'autres traiteurs avec leurs couleurs et leur logo.
- **Responsive (ordinateur + tablette)** : chaque écran est vérifié à **trois tailles** (768×1024, 1024×768, 1440 px) avec le mode « appareil » des outils de développement. Points de rupture communs : **480 px** (téléphone), **768 px** (tablette portrait), **1024 px** (tablette paysage). Jamais `overflow: hidden` sur `body` (bloque le défilement, notamment quand le clavier d'une tablette est ouvert). Éléments tactiles : au moins 44 px de haut (`@media (pointer: coarse)`).
- **Application Vue « cachée » en production** (Sprint V) : publiée sous `/app/` sur le site de production, sans aucun lien depuis l'ancien frontend jusqu'à la bascule (V8). Les tests sur `/app/` écrivent dans la **base de production** → données `TEST …`, supprimées après.
- **Ancien frontend en fin de vie** (décision du 2026-10-19 : passage à Vue, Sprint V) : n'y faire que des corrections de bugs bloquants ou de sécurité, aucun travail qui deviendrait inutile avec Vue.
- **Erreur CORS / « Load failed » juste après un déploiement** = le backend redémarre ; attendre « Deploy live ».
- **Supabase renvoie au maximum 1000 lignes par requête, sans prévenir** → utiliser `fetch_all_paginated` pour toute liste qui peut grandir.
- **`async def` + bibliothèque bloquante = serveur figé** : les routes restent en `def` (FastAPI les exécute dans des threads).
- **Mocks** : un `MagicMock` accepte n'importe quel nom d'attribut et ignore les arguments → une faute de frappe ne plante pas, elle donne de mauvaises données ; vérifier les **arguments** (`assert_called_once_with`), et que la chaîne du mock reproduit exactement la chaîne d'appels du code.
- **Rôle frontend vs backend** : le backend relit rôle et franchise **en base** à chaque requête ; le frontend les lit dans le **token** (figé à la connexion) → après un changement de rôle, se déconnecter/reconnecter (correctif prévu : tâche 1.10, `GET /auth/me`).
- **Modèles Pydantic en `extra = 'forbid'`** : n'envoyer depuis le frontend que les champs attendus (`.map(...)` qui filtre).
- `delivery_hour` est renvoyé au format `HH:MM:SS`.

## 🔐 Sécurité et données

- Ne jamais afficher, coller ni commiter de **secret** (`.env`, clés Supabase `sb_secret_…`, mots de passe, adresses de connexion PostgreSQL). Pour les saisir dans le terminal : `read -rs "VAR?Invite : "`.
- Un secret exposé → **le changer**, ne pas espérer que personne ne l'a vu.
- Dumps de base et fichiers de données personnelles **hors du dépôt** (ex. `~/omb-migration`).
- Ne jamais renvoyer au navigateur un détail technique d'erreur (`str(e)`) ni une colonne sensible (`password_hash`) : listes blanches de colonnes, messages génériques, détail dans les logs.

## 🗂️ Tenir le suivi à jour

- Après chaque tâche : cocher dans `SPRINTS.md` et mettre à jour « 📍 Où on en est ».
- Quand Glenn donne une information produit (retour d'une franchise, réponse du comptable, document) : l'ajouter dans la section **« 📓 Informations reçues »** de la bonne fiche `docs/modules/…`, et mettre à jour `ROADMAP.md` si besoin.
- **Étiquettes** à utiliser dans les fichiers de suivi (lues par la commande `/point`, prévue) :
  - `🛒` à commander · `🧪` à tester · `⏰ AAAA-MM-JJ` échéance datée
  - `❓ (comptable)` · `❓ (franchises)` · `❓ (senior)` · `❓ (Glenn)` question, avec la personne concernée
- Règle de calendrier : le module **facturation (M4) démarre au plus tard début avril 2027** (facture électronique obligatoire en septembre 2027).
