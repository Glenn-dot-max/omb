# 🗺️ OMB — Roadmap v8 → v9+

> Dernière mise à jour : 12 août 2026

---

## 📅 Calendrier global

```
Août 2026
├── Semaine 1 (12-16/08) ── Sprint 1  🔴 Sécurité critique
├── Semaine 2 (17-21/08) ── Sprint 2  🟠 Cohérence backend
└── Semaine 3 (24-28/08) ── Sprint 3  🟡 Performance

Septembre 2026
├── Semaine 1 (31/08-04/09) ── Sprint 4A + Sprint 6 (en parallèle)
├── Semaine 2 (07-11/09)    ── Sprint 4B  🟢 Découpage commandes.js
└── Semaine 3-4 (14-25/09)  ── Sprint 5  🔵 Docker / Infra

Octobre 2026
└── Bascule Hetzner CX22 ✅
```

---

## 🔴 Sprint 1 — Sécurité critique

**Branche :** `fix/security-hardening`
**Durée estimée :** 1-2 jours

| #   | Statut  | Tâche                                                                  | Fichier(s)                                                                                      | Effort |
| --- | ------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------ |
| 1.1 | ✅ Fait | Remplacer tous les `detail=str(e)` par message générique + log serveur | `routes/commandes.py`, `routes/planning.py`, `routes/produits.py`, `routes/formules.py`         | 30 min |
| 1.2 | ✅ Fait | Retirer les 3 `console.log` de `config.js`                             | `frontend/js/config.js`                                                                         | 5 min  |
| 1.3 | ✅ Fait | Ajouter `min_length=8` sur `new_password` dans `PasswordReset`         | `routes/admin.py`                                                                               | 10 min |
| 1.4 | ✅ Fait | Installer `slowapi` + rate limit 5 req/min sur `POST /auth/login`      | `routes/auth.py`, `requirements.txt`, `main.py`                                                 | 45 min |
| 1.5 | ✅ Fait | Vérification `active = True` dans `get_current_user`                   | `auth.py`                                                                                       | 30 min |
| 1.6 | ✅ Fait | Déplacer les 4 scripts root dans `scripts/`                            | `generate_password.py`, `create_catalog_admin.py`, `create_user_paris.py`, `test_connection.py` | 10 min |

**✅ Sprint 1 terminé et mergé sur v8 — 12 août 2026**

**Critère de validation :**

- [x] Un compte désactivé ne peut plus appeler l'API
- [x] Brute-force sur `/auth/login` bloqué après 5 tentatives
- [x] Aucun `str(e)` retourné au client en prod
- [x] Aucun `console.log` en prod

---

## 🟠 Sprint 2 — Cohérence & Robustesse backend

**Branche :** `refactor/backend-consistency`
**Durée estimée :** 2-3 jours

| #   | Statut     | Tâche                                                                              | Fichier(s)                      | Effort |
| --- | ---------- | ---------------------------------------------------------------------------------- | ------------------------------- | ------ |
| 2.1 | ⬜ À faire | Remplacer `datetime.utcnow()` par `datetime.now(timezone.utc)`                     | `routes/admin.py` + autres      | 20 min |
| 2.2 | ⬜ À faire | Retirer le double `from zoneinfo import ZoneInfo` dans `commandes.py`              | `routes/commandes.py`           | 5 min  |
| 2.3 | ⬜ À faire | Migrer tous les `@validator` vers `@field_validator` (Pydantic v2)                 | `backend/models.py`             | 1h30   |
| 2.4 | ⬜ À faire | Déplacer les modèles Pydantic de `admin.py` vers `models.py`                       | `routes/admin.py` → `models.py` | 30 min |
| 2.5 | ⬜ À faire | Ajouter pagination dans `formules.py` pour `franchise_formules`                    | `routes/formules.py`            | 20 min |
| 2.6 | ⬜ À faire | Ignorer le param `franchise_id` query si l'user n'est pas TECH_ADMIN dans planning | `routes/planning.py`            | 15 min |
| 2.7 | ⬜ À faire | Nettoyer l'import `field_validator` inutilisé dans `models.py`                     | `backend/models.py`             | 5 min  |

**Critère de validation :**

- [ ] `python -W error` sans warning de dépréciation Pydantic
- [ ] Un USER ne peut pas modifier le scope franchise du planning via query param

---

## 🟡 Sprint 3 — Performance backend

**Branche :** `perf/backend-cache-indexes`
**Durée estimée :** 2-3 jours

| #   | Statut     | Tâche                                                                            | Fichier(s)                                                       | Effort |
| --- | ---------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------ |
| 3.1 | ⬜ À faire | Créer les index Supabase manquants (SQL) sur les colonnes de filtrage fréquentes | Script SQL dans `supabase-scripts/`                              | 1h     |
| 3.2 | ⬜ À faire | Installer `cachetools` + créer `backend/cache.py` avec `TTLCache(ttl=300)`       | `backend/cache.py`, `requirements.txt`                           | 45 min |
| 3.3 | ⬜ À faire | Appliquer le cache sur `franchises`, `categories`, `types`, `unites`             | `routes/produits.py`, `routes/formules.py`, `routes/planning.py` | 1h     |
| 3.4 | ⬜ À faire | Invalider le cache sur les mutations (POST/PATCH/DELETE) des ressources cachées  | Mêmes fichiers                                                   | 30 min |
| 3.5 | ⬜ À faire | Abaisser limite max planning à 90 jours par défaut (param configurable)          | `routes/planning.py`, `config.py`                                | 15 min |

**Critère de validation :**

- [ ] `GET /planning/production` sur 7 jours < 800ms
- [ ] `GET /produits/` ne génère plus de requête `franchises` à chaque appel

---

## 🟢 Sprint 4 — Refactor Frontend

**Branche :** `refactor/frontend-modules`
**Durée estimée :** 3-5 jours

### Étape A — State management

| #   | Statut     | Tâche                                           | Fichier(s)                               | Effort |
| --- | ---------- | ----------------------------------------------- | ---------------------------------------- | ------ |
| 4.1 | ⬜ À faire | Créer `AppState` centralisé dans `commandes.js` | `frontend/js/commandes.js`               | 1h     |
| 4.2 | ⬜ À faire | Idem pour `planning.js` et `formules.js`        | `frontend/js/planning.js`, `formules.js` | 30 min |

### Étape B — Découpage de `commandes.js` (2742 lignes)

| #   | Statut     | Tâche                                                        | Fichier(s) à créer              | Effort |
| --- | ---------- | ------------------------------------------------------------ | ------------------------------- | ------ |
| 4.3 | ⬜ À faire | Extraire les fonctions de chargement API                     | `js/commandes-data.js`          | 1h     |
| 4.4 | ⬜ À faire | Extraire les fonctions de rendu HTML                         | `js/commandes-render.js`        | 1h30   |
| 4.5 | ⬜ À faire | Extraire la logique des modales                              | `js/commandes-modals.js`        | 1h30   |
| 4.6 | ⬜ À faire | Extraire les filtres et la recherche                         | `js/commandes-filters.js`       | 45 min |
| 4.7 | ⬜ À faire | Mettre à jour `commandes.html` pour les nouveaux modules ES6 | `frontend/pages/commandes.html` | 20 min |

**Critère de validation :**

- [ ] `commandes.js` principal < 200 lignes
- [ ] Toutes les fonctionnalités existantes marchent identiquement
- [ ] Aucune variable globale flottante

---

## 🔵 Sprint 5 — Infrastructure & Migration Docker

**Branche :** `infra/docker-prep`
**Durée estimée :** 2-3 jours
**⏰ À faire en septembre 2026**

| #   | Statut     | Tâche                                                            | Fichier(s)             | Effort |
| --- | ---------- | ---------------------------------------------------------------- | ---------------------- | ------ |
| 5.1 | ⬜ À faire | Créer `backend/Dockerfile` (Python 3.11, uvicorn, non-root user) | `backend/Dockerfile`   | 45 min |
| 5.2 | ⬜ À faire | Créer `docker-compose.yml` (backend + nginx)                     | `docker-compose.yml`   | 1h     |
| 5.3 | ⬜ À faire | Créer `nginx/nginx.conf` (gzip, cache statiques, proxy backend)  | `nginx/nginx.conf`     | 1h     |
| 5.4 | ⬜ À faire | Créer `.dockerignore`                                            | `.dockerignore`        | 10 min |
| 5.5 | ⬜ À faire | Créer `backend/.env.example` avec toutes les variables requises  | `backend/.env.example` | 15 min |
| 5.6 | ⬜ À faire | Tester le stack complet en local avec `docker compose up`        | —                      | 1h     |
| 5.7 | ⬜ À faire | Documenter la procédure de déploiement Hetzner dans `README.md`  | `README.md`            | 45 min |

**Critère de validation :**

- [ ] `docker compose up` lance le stack complet
- [ ] App fonctionnelle sur `http://localhost`

---

## 🧪 Sprint 6 — Tests automatisés

**Branche :** `test/coverage-critical-paths`
**Durée estimée :** 3-4 jours
**⏰ Peut démarrer en parallèle du Sprint 4**

| #   | Statut     | Tâche                                                            | Fichier(s)                   | Effort |
| --- | ---------- | ---------------------------------------------------------------- | ---------------------------- | ------ |
| 6.1 | ⬜ À faire | Installer `pytest` + `httpx` + `pytest-asyncio`                  | `requirements.txt` (dev)     | 15 min |
| 6.2 | ⬜ À faire | Créer `tests/conftest.py` avec client FastAPI + mock Supabase    | `backend/tests/conftest.py`  | 1h     |
| 6.3 | ⬜ À faire | Tests auth : login OK, mauvais mdp, token expiré, compte inactif | `tests/test_auth.py`         | 1h     |
| 6.4 | ⬜ À faire | Tests scoping multi-tenant                                       | `tests/test_multitenancy.py` | 1h30   |
| 6.5 | ⬜ À faire | Tests validation Pydantic                                        | `tests/test_models.py`       | 1h     |
| 6.6 | ⬜ À faire | Tests commandes CRUD + archivage                                 | `tests/test_commandes.py`    | 1h30   |
| 6.7 | ⬜ À faire | CI GitHub Actions avec `pytest`                                  | `.github/workflows/test.yml` | 45 min |

**Critère de validation :**

- [ ] `pytest` passe avec ≥ 80% de couverture sur les routes critiques
- [ ] CI bloque un merge si les tests échouent

---

## 🗑️ Code mort à supprimer (validé avec Glenn)

| Fichier                                                  | Raison                            | Statut                        |
| -------------------------------------------------------- | --------------------------------- | ----------------------------- |
| `backend/generate_password.py`                           | Script one-shot de setup          | ⬜ À déplacer dans `scripts/` |
| `backend/create_catalog_admin.py`                        | Script one-shot de création admin | ⬜ À déplacer dans `scripts/` |
| `backend/create_user_paris.py`                           | Script de seed ponctuel           | ⬜ À déplacer dans `scripts/` |
| `backend/test_connection.py`                             | Script de debug Supabase          | ⬜ À déplacer dans `scripts/` |
| `frontend/js/config.js` — 3 `console.log`                | Aucune utilité fonctionnelle      | ✅ Fait (Sprint 1)            |
| `backend/models.py` — import `field_validator` inutilisé | Import orphelin                   | ⬜ Sprint 2                   |
| `backend/routes/commandes.py` — double import `ZoneInfo` | Redondant                         | ⬜ Sprint 2                   |
