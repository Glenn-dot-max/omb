# Suivi des sprints — Audit sécurité/qualité OMB

> Fichier de suivi personnel, pas un livrable applicatif. Sert de fil conducteur entre nos sessions.
> Audit complet : voir l'artifact "Audit OMB" (2026-09-06, mis à jour avec les points confirmés de Copilot).

**Règles de travail :**
- Pour chaque tâche : Claude explique quoi faire + pourquoi (pédagogique), c'est Glenn qui écrit le code.
- Claude ne modifie jamais le dépôt sans demande explicite, tâche par tâche.
- On coche au fur et à mesure. Si une tâche est reportée/écartée, le noter plutôt que de juste cocher.

---

## Sprint 0 — Colmater la fuite (hors code, urgent) 🔴 EN COURS

- [ ] Régénérer la clé Supabase (Dashboard Supabase → Settings → API → Reset)
- [ ] Mettre à jour `SUPABASE_KEY` sur Render (variables d'environnement du service)
- [ ] Mettre à jour `SUPABASE_KEY` dans `backend/.env` local
- [ ] Vérifier que le backend redémarre correctement avec la nouvelle clé (test rapide : login + un GET simple)
- [ ] Décider si le dépôt `Glenn-dot-max/omb` doit rester public ou passer en privé
- [ ] (Optionnel, pas urgent une fois la clé tournée) purge de l'historique git avec `git filter-repo` ou BFG

---

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
