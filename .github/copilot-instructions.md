# Oh My Brunch (OMB) - Copilot Instructions

## Architecture Overview

**OMB** is a full-stack catering order management system with three layers:

### Backend (Python/FastAPI)

- **Tech Stack**: FastAPI + Supabase (PostgreSQL) + JWT authentication + Bcrypt password hashing
- **Key Files**: `backend/main.py` (app setup), `backend/models.py` (Pydantic schemas), `backend/database.py` (Supabase client)
- **Database**: Supabase PostgreSQL with multi-tenant support (franchises)
- **Routes**: 12 route modules in `backend/routes/` for products, formulas, orders, planning, etc.

### Frontend (HTML/CSS/JavaScript)

- **Architecture**: Vanilla JS with modular pattern - each page (products, orders, formulas) has dedicated JS module
- **Key Files**: `frontend/js/config.js` (API URL detection), `frontend/js/api.js` (API call wrapper), `frontend/js/auth.js` (JWT token management)
- **Auto-env Detection**: API URL switches between `http://localhost:8000` (dev) and Render production URL based on hostname

### Authentication

- **Method**: JWT tokens + HTTPBearer in headers
- **Token Management**: `frontend/js/auth.js` handles login, token storage, auto-retry with refresh
- **Roles**: TECH_ADMIN (full access), USER (franchise-scoped), different permissions per route

---

## Critical Patterns & Conventions

### 1. **Multi-Tenant Data Access (Franchise Scoping)**

- Routes check `current_user["role"]` and `current_user["franchise_id"]`
- TECH_ADMIN sees all data; USER routes return only franchise-specific data
- Example: `backend/routes/produits.py` L11-20 filters by franchise for non-admin users
- **Data Flow**: Frontend never sends franchise_id explicitly - it comes from JWT token's user context

### 2. **Pagination for Large Result Sets**

- Supabase queries use `.range(offset, offset + page_size - 1)` with pagination loops
- See `backend/routes/produits.py` L35-42 for franchise_produits pagination pattern
- **Critical**: Always paginate when joining large tables (franchise_produits, etc.)

### 3. **UUID & Date Serialization**

- UUIDs and datetime objects need explicit conversion to strings in JSON responses
- Custom encoder: `backend/main.py` L30-40 defines `UUIDEncoder` for all JSON responses
- Frontend expects ISO format strings: `datetime.isoformat()` and `str(uuid)`
- See `backend/routes/commandes.py` L20-27 for `serialize_commande()` helper

### 4. **API Call Wrapper Pattern**

- All frontend API calls use `apiGet/apiPost/apiPatch/apiDelete` functions (defined in `auth.js`)
- These automatically handle JWT auth header, error logging, and re-login on 401
- Use `API_URL` from global config: `fetch(`${API_URL}/produits/`)`
- Routes DON'T include trailing slashes in path params: `/produits/${id}` not `/produits/${id}/`

### 5. **FastAPI Response Customization**

- `main.py` registers custom exception handlers (validation errors, 404s)
- All routes should use dependency injection: `current_user: dict = Depends(get_current_user)`
- Never trust user input - always validate with Pydantic models (see `models.py` validators)

---

## Developer Workflows

### Backend Development

```bash
# Install dependencies
pip install -r backend/requirements.txt

# Environment setup: Create .env in backend/ root
# Required vars: SUPABASE_URL, SUPABASE_KEY, SECRET_KEY, DEBUG

# Run local dev server
cd backend && uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Test connection to Supabase
python backend/test_connection.py
```

### Frontend Development

- No build step; open `frontend/index.html` or serve via simple HTTP server
- Auto-env detection in `config.js` handles localhost vs production API URLs
- Check browser console for API logs and error details

### Adding New Endpoints

1. Create model in `backend/models.py` (with validators)
2. Create route file in `backend/routes/` or add to existing
3. Import route in `backend/main.py` and include in `app.include_router()`
4. Add corresponding API wrapper in `frontend/js/api.js`
5. Handle role-based access: `current_user.get("role")` for permission checks

---

## Project-Specific Data Flows

### Order Management (Commandes)

- Orders contain multiple formulas (Formules) → Products (Produits) → Units (Unité)
- Many-to-many relationships via junction tables: `franchise_produits`, `formule_produits`, `commande_formules`
- Delivery dates use `ZoneInfo("Europe/Paris")` for timezone-aware datetime comparisons
- See `backend/routes/commandes.py` for full order retrieval with related data

### Formula Composition

- Formula = collection of products with quantities per serving (nombre_couverts)
- Formulas typed: "Brunch", "Cocktail", "Déjeuner", "Dîner" (stored in Pydantic `type_formule`)
- See `backend/models.py` L56+ for FormuleBase validation

### Product Categorization

- Products linked to Categories and Types via foreign keys
- Franchise activation: `franchise_produits` junction table tracks active products per franchise (boolean flag)
- See pagination pattern in `backend/routes/produits.py` L27-42

---

## External Integrations & Dependencies

- **Supabase**: Single source of truth for all data; uses service key (auto-admin) for backend queries
- **Render**: Production deployment for backend; set CORS_ORIGINS in config for frontend domain
- **JWT (python-jose)**: Token validation; 7-day expiration set in `backend/auth.py` L17
- **Bcrypt**: Password hashing with auto-salt in `backend/auth.py` L29-33

---

## Common Debugging Patterns

1. **CORS Errors**: Check `backend/config.py` CORS_ORIGINS includes frontend domain
2. **401 Unauthorized**: Frontend auto-retry logic in `auth.js` - check JWT token expiration
3. **Validation Errors**: Enable DEBUG=true in .env, FastAPI returns detailed field errors
4. **Pagination Issues**: Supabase `.range()` is 0-indexed inclusive; always check total count
5. **Timezone Issues**: All dates use Paris timezone (`ZoneInfo("Europe/Paris")`); verify datetime.isoformat() format
