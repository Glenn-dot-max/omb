<!-- Copilot / AI agent instructions for developers working in this repo -->
# Copilot Instructions — omb repository ✅

This file gives concise, actionable guidance to AI coding agents to be productive across the repository's multiple small apps (Streamlit OMB app, FastAPI + React MVP, and a legacy Flask CRM).

## Big picture (what this repo contains) 🧭
- OMB/ — Streamlit single-file app + pages for order & production management (SQLite by default; optionally Postgres/Supabase). Entry: `OMB/app.py`.
- MVP_1/backend/ — FastAPI API for OAuth + Outlook Graph integration. Entry: `MVP_1/backend/main.py`.
- MVP_1/frontend/ — React frontend that talks to the FastAPI backend at `http://localhost:8000`.
- MVP/CRM_V1/ — Legacy Flask CRM (smaller, not part of the main flow).

## How to run (developer commands) ▶️
- OMB (Streamlit):
  - Create a venv and install: `python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt`
  - Dev run: `streamlit run app.py` (launches the app; pages live under `pages/`)
  - Configuration: Streamlit secrets accessible via `st.secrets` (see `auth.py` for keys `auth.username` and `auth.password_hash`).

- MVP_1 backend (FastAPI):
  - `cd MVP_1/backend && python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt`
  - Run: `uvicorn main:app --reload --port 8000` (the code also supports `python main.py` which calls uvicorn).
  - Env vars: populate `.env` or environment with `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, (optional) `MICROSOFT_TENANT_ID`, `MICROSOFT_REDIRECT_URI` (see `config/outlook_config.py`).

- MVP_1 frontend (React):
  - `cd MVP_1/frontend && npm install && npm start` (expects backend at `http://localhost:8000` in `src/services/api.js`).

## Important patterns & conventions 🧩
- Language & naming: comments and messages are primarily in French—maintain that style for UX strings to keep consistency.
- Streamlit pages: each page imports `auth.check_password()` at top to gate access (example: `pages/03_commandes_v1.py`). Follow that pattern for new pages.
- DB approach in OMB: two supported modes.
  - Default: lightweight SQLite via `database/db_connection.py` (file `data/omb.db`).
  - Optional: PostgreSQL/Supabase via `database/db_connection_pg.py` (reads connection string from `st.secrets['database']['connection_string']`).
  - Schema initializer: `database/db_schema.py` defines tables and `init_db_if_needed()` — call it on app start (already used by `app.py`).
- FastAPI patterns:
  - Route organization: `api/routes/*.py` (auth & emails examples). Add new routes as new modules and include them in `main.py`.
  - OAuth flow: in `api/routes/auth.py`, backend returns tokens to frontend and uses in-memory CSRF token protection — tokens are not persisted by default.
  - Outlook integration: encapsulated in `api/services/outlook_service.py` (uses MSAL and Microsoft Graph API).
- Frontend expectations: tokens are stored in `localStorage` by the frontend (`MVP_1/frontend/src/services/api.js`) and passed as `Authorization: Bearer {token}` to backend endpoints.

## Integration points & external deps 🔌
- Microsoft Graph & MSAL (backend). See `MVP_1/backend/config/outlook_config.py` and `api/services/outlook_service.py` for exact scopes and endpoints.
- Streamlit secrets & (optionally) Supabase/Postgres. Secrets are accessed via `st.secrets` (do NOT commit real secrets).

## Files to reference when making changes 💡
- Streamlit auth & usage examples: `OMB/auth.py`, `OMB/pages/*.py`, `OMB/app.py`.
- DB helpers & schema: `OMB/database/db_connection.py`, `OMB/database/db_connection_pg.py`, `OMB/database/db_schema.py`.
- FastAPI API: `MVP_1/backend/main.py`, `MVP_1/backend/api/routes/*.py`, `MVP_1/backend/api/services/outlook_service.py`, `MVP_1/backend/config/outlook_config.py`.
- React client: `MVP_1/frontend/src/services/api.js`, `MVP_1/frontend/src/pages/*.js`.

## Quick tips for editing (do this first) ✍️
- When changing DB schema: update `db_schema.py` and ensure `init_db_if_needed()` remains idempotent (it uses `CREATE TABLE IF NOT EXISTS`).
- When adding API endpoints: include the router in `main.py` and add testable error handling similar to `api/routes/emails.py`.
- When changing OAuth or Graph scopes: update `config/outlook_config.py` and `api/services/outlook_service.py` consistently.

## Known gaps & safety notes ⚠️
- No automated tests were found — be conservative when changing DB migrations or auth flows.
- Tokens are not persisted server-side (MVP). For production, persist tokens and rotate secrets securely.
- Avoid committing secrets (use `.env` or Streamlit `secrets.toml`).

---
If any section is unclear or you'd like more examples (e.g., a sample `.env` or a short snippet showing how to migrate SQLite→Postgres), tell me which part and I will iterate. ✅
