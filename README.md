# 🥐 Oh My Brunch (OMB)

**Application de gestion de commandes pour service traiteur**

Application web complète pour gérer les produits, formules et commandes d'un service traiteur. Optimisée pour les brunchs et événements sur mesure.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Python](https://img.shields.io/badge/python-3.9+-blue.svg)
![JavaScript](https://img.shields.io/badge/javascript-ES6+-yellow.svg)

---

## 📋 Table des matières

- [Fonctionnalités](#-fonctionnalités)
- [Architecture](#-architecture)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Utilisation](#-utilisation)
- [Base de données](#-base-de-données)
- [Sécurité](#-sécurité)
- [Technologies](#-technologies)
- [Déploiement](#-déploiement)
- [Troubleshooting](#-troubleshooting)
- [Roadmap](#-roadmap)
- [Licence](#-licence)

---

## ✨ Fonctionnalités

### 📦 Gestion des Produits

- ✅ CRUD complet (Créer, Lire, Modifier, Supprimer)
- ✅ Catégorisation (boissons, viennoiseries, salés, sucrés, etc.)
- ✅ Types de produits
- ✅ Gestion des unités de mesure
- ✅ Recherche et filtrage

### 🍽️ Gestion des Formules

- ✅ Création de formules composées de produits
- ✅ Association produits → formules avec quantités
- ✅ Quantités automatiques par personne
- ✅ Types de formules (Brunch, Cocktail, Déjeuner, Dîner)
- ✅ Composition détaillée

### 📋 Gestion des Commandes

- ✅ Création commandes avec formules et/ou produits individuels
- ✅ Calcul automatique des quantités selon nombre de couverts
- ✅ Tri intelligent par date (Aujourd'hui, Demain, Cette semaine, etc.)
- ✅ Archivage automatique des anciennes commandes (>2 jours)
- ✅ Vue détaillée avec composition complète
- ✅ Notes et instructions spéciales par commande
- ✅ Gestion service (avec/sans service)

### 📅 Planning

- ✅ Vue calendrier des commandes
- ✅ Organisation par date de livraison
- ✅ Filtrage par période
- ✅ Export planning

### 🔒 Sécurité

- ✅ Row Level Security (RLS) activé
- ✅ Validation stricte des données (backend)
- ✅ Protection XSS et injections
- ✅ Gestion d'erreurs sécurisée
- ✅ Clés API protégées

---

## 🏗️ Architecture

```
omb/
├── backend/                    # API FastAPI
│   ├── main.py                # Point d'entrée
│   ├── config.py              # Configuration
│   ├── database.py            # Connexion Supabase
│   ├── models.py              # Modèles Pydantic (validation)
│   ├── test_connection.py     # Test connexion DB
│   ├── requirements.txt       # Dépendances Python
│   ├── .env                   # Variables d'environnement (non versionné)
│   └── routes/                # Routes API
│       ├── produits.py
│       ├── formules.py
│       ├── commandes.py
│       ├── formule_produits.py
│       ├── commande_formules.py
│       ├── commande_produits.py
│       ├── categories.py
│       ├── types.py
│       ├── unite.py
│       └── planning.py
│
└── frontend/                  # Interface web
    ├── index.html            # Page d'accueil (redirection)
    ├── css/
    │   └── style.css         # Styles globaux
    ├── js/
    │   ├── config.js         # Configuration API
    │   ├── api.js            # Appels API centralisés
    │   ├── toast.js          # Notifications
    │   ├── commandes.js      # Logique commandes
    │   ├── produits.js       # Logique produits
    │   ├── formules.js       # Logique formules
    │   └── planning.js       # Logique planning
    └── pages/                # Pages HTML
        ├── commandes.html
        ├── produits.html
        ├── formules.html
        └── planning.html
```

---

## 🚀 Installation

### Prérequis

- **Python 3.9+**
- **Compte Supabase** (gratuit : https://supabase.com)
- **Git**

---

### 1️⃣ Cloner le repository

```bash
git clone https://github.com/Glenn-dot-max/omb.git
cd omb
```

---

### 2️⃣ Installation Backend

#### **a) Créer un projet Supabase**

1. Allez sur https://supabase.com
2. Créez un nouveau projet
3. Attendez que le projet soit initialisé (~2 minutes)

#### **b) Créer les tables**

Dans Supabase Dashboard → SQL Editor → Nouvelle requête :

```sql
-- Voir fichier database_schema.sql pour le schéma complet
-- Ou utiliser l'interface Table Editor pour créer :
-- categories, types, unite, produits, formules, carnet_commande, etc.
```

#### **c) Activer Row Level Security**

Dans Supabase Dashboard → SQL Editor :

```sql
-- Activer RLS sur toutes les tables
ALTER TABLE carnet_commande ENABLE ROW LEVEL SECURITY;
ALTER TABLE produits ENABLE ROW LEVEL SECURITY;
ALTER TABLE formules ENABLE ROW LEVEL SECURITY;
-- ... (voir section Sécurité)

-- Créer policies pour service_role
CREATE POLICY "Service role full access - produits"
ON produits FOR ALL TO service_role
USING (true) WITH CHECK (true);
-- ... (répéter pour chaque table)
```

#### **d) Installer les dépendances Python**

```bash
cd backend
pip install -r requirements.txt
```

Ou sur macOS :

```bash
pip install -r requirements.txt --break-system-packages
```

#### **e) Configurer les variables d'environnement**

Créez un fichier `backend/.env` :

```env
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_KEY=eyJhbGc...  # Votre clé service_role (depuis Supabase → Settings → API)

DEBUG=True
```

**⚠️ Important :**

- Utilisez la clé **service_role** (pas anon)
- Ne commitez JAMAIS le fichier `.env` dans Git

#### **f) Tester la connexion**

```bash
python3 test_connection.py
```

Résultat attendu :

```
Données récupérées avec succès :
Nombre de lignes : X
Données : [...]
```

#### **g) Lancer le backend**

```bash
python3 main.py
```

L'API sera accessible sur : **http://127.0.0.1:8000**

Documentation API : **http://127.0.0.1:8000/docs**

---

### 3️⃣ Installation Frontend

#### **a) Lancer le serveur de développement**

Dans un nouveau terminal :

```bash
cd frontend
python3 -m http.server 8080
```

#### **b) Accéder à l'application**

Ouvrez votre navigateur : **http://localhost:8080**

Vous serez automatiquement redirigé vers `/pages/commandes.html`

---

## ⚙️ Configuration

### Backend (`backend/.env`)

```env
# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=eyJhbGc...  # service_role key

# Mode debug (affiche détails erreurs)
DEBUG=True  # False en production

# CORS (si déployé)
# Ajouter dans backend/config.py si besoin
```

### Frontend (`frontend/js/config.js`)

```javascript
const API_URL = "http://localhost:8000";
// En production, remplacer par l'URL de votre API déployée
```

---

## 📖 Utilisation

### Créer une commande

1. **Accédez à "Commandes"** dans le menu
2. **Cliquez sur "Nouvelle commande"**
3. **Remplissez le formulaire :**
   - Nom du client
   - Date et heure de livraison
   - Nombre de couverts
4. **Ajoutez des formules :**
   - Sélectionnez une formule
   - La quantité recommandée est calculée automatiquement
   - Ajustez si nécessaire
5. **Ou ajoutez des produits individuels**
6. **Ajoutez des notes** (allergies, instructions spéciales)
7. **Cochez "Avec service"** si applicable
8. **Cliquez "Créer la commande"**

### Gérer les produits

1. **Accédez à "Produits"**
2. **Créez des catégories et types** si besoin
3. **Ajoutez des produits** avec leur catégorie et type

### Créer des formules

1. **Accédez à "Formules"**
2. **Créez une nouvelle formule**
3. **Ajoutez des produits** avec quantités par personne
4. **Définissez le nombre de couverts** par défaut

### Archiver les commandes

**Manuel :**

- Cliquez sur "Archiver" sur une commande

**Automatique :**

- Cliquez sur "Auto-archivage" (archives toutes les commandes >2 jours)

**Consulter les archives :**

- Onglet "Commandes archivées"

### Voir le planning

1. **Accédez à "Planning"**
2. **Filtrez par période** (semaine, mois)
3. **Visualisez les commandes** par date

---

## 🗄️ Base de Données

### Schéma relationnel

```
categories
  └─→ produits
        ├─→ formule_produits ─→ formules
        └─→ commande_produits ─→ carnet_commande
                                      ↑
                                      └─ commande_formules ─→ formules

types
  └─→ produits

unite
  (référence pour les unités de mesure)
```

### Tables principales

| Table                 | Description                                            |
| --------------------- | ------------------------------------------------------ |
| **produits**          | Catalogue de produits (croissants, jus, etc.)          |
| **categories**        | Catégories de produits (viennoiseries, boissons, etc.) |
| **types**             | Types de produits                                      |
| **unite**             | Unités de mesure (kg, L, pièce, etc.)                  |
| **formules**          | Formules prédéfinies (Brunch Classique, etc.)          |
| **formule_produits**  | Composition des formules (produits + quantités)        |
| **carnet_commande**   | Commandes clients                                      |
| **commande_formules** | Formules par commande                                  |
| **commande_produits** | Produits individuels par commande                      |

---

## 🔒 Sécurité

### Row Level Security (RLS)

**Toutes les tables ont RLS activé :**

```sql
ALTER TABLE produits ENABLE ROW LEVEL SECURITY;
-- ... pour toutes les tables
```

**Policies configurées :**

- Accès complet via clé `service_role` (backend)
- Accès restreint via clé `anon` (frontend - pas utilisé actuellement)

### Validation Backend

**Modèles Pydantic avec validation stricte :**

```python
# Exemple : CarnetCommandeCreate
class CarnetCommandeCreate(BaseModel):
    nom_client: constr(min_length=2, max_length=200)  # Longueur limitée
    nombre_couverts: int = Field(ge=1, le=10000)      # Entre 1 et 10000
    delivery_date: date                                # Validé (pas dans le passé)
    notes: Optional[constr(max_length=5000)]          # Max 5000 caractères

    @validator('nom_client')
    def validate_nom_client(cls, v):
        # Bloque caractères dangereux (XSS)
        if re.search(r'[<>"\'\\/]', v):
            raise ValueError('Caractères non autorisés')
        return v.strip()
```

**Protections :**

- ✅ XSS (Cross-Site Scripting)
- ✅ SQL Injection (via ORM Supabase)
- ✅ Buffer overflow (limites strictes)
- ✅ Données corrompues (validators métier)

### Gestion des erreurs

**En développement :**

```python
DEBUG=True  # Affiche détails des erreurs
```

**En production :**

```python
DEBUG=False  # Masque stack traces sensibles
```

---

## 🛠️ Technologies

### Backend

| Technologie         | Version | Usage                  |
| ------------------- | ------- | ---------------------- |
| **Python**          | 3.9+    | Langage backend        |
| **FastAPI**         | 0.104+  | Framework API REST     |
| **Pydantic**        | 2.0+    | Validation données     |
| **Supabase Client** | 2.0+    | Client Python Supabase |
| **Uvicorn**         | 0.24+   | Serveur ASGI           |

### Frontend

| Technologie            | Usage                      |
| ---------------------- | -------------------------- |
| **Vanilla JavaScript** | Logique application (ES6+) |
| **HTML5**              | Structure pages            |
| **CSS3**               | Styles et mise en page     |

### Base de données

| Service        | Usage                               |
| -------------- | ----------------------------------- |
| **Supabase**   | PostgreSQL hébergé + Auth + Storage |
| **PostgreSQL** | Base de données relationnelle       |

---

## 🚀 Déploiement

### Backend (Render)

1. **Créez un compte** sur https://render.com
2. **Nouveau Web Service** → Connectez votre repo GitHub
3. **Configuration :**
   ```
   Build Command: pip install -r requirements.txt
   Start Command: uvicorn main:app --host 0.0.0.0 --port $PORT
   ```
4. **Variables d'environnement :**
   ```
   SUPABASE_URL=https://...
   SUPABASE_KEY=eyJ...
   DEBUG=False
   RENDER=True
   ```
5. **Déployer**

URL backend : `https://omb-backend.onrender.com`

### Frontend (Render Static Site ou Netlify)

**Option A : Render Static Site**

1. Nouveau Static Site
2. Publish directory : `frontend`
3. Déployer

**Option B : Netlify**

1. Drag & drop du dossier `frontend`
2. Déployer

**Puis mettre à jour `frontend/js/config.js` :**

```javascript
const API_URL = "https://omb-backend.onrender.com";
```

---

## 🐛 Troubleshooting

### Backend ne démarre pas

**Erreur : `Missing SUPABASE_URL or SUPABASE_KEY`**

```bash
# Vérifier que .env existe
cat backend/.env

# Doit contenir :
SUPABASE_URL=https://...
SUPABASE_KEY=eyJ...
```

**Erreur : `Module not found`**

```bash
# Réinstaller les dépendances
cd backend
pip install -r requirements.txt --break-system-packages
```

---

### Frontend ne charge pas les données

**Vérifier que le backend tourne :**

```bash
curl http://127.0.0.1:8000
```

**Vérifier la console navigateur (F12) :**

- Erreurs CORS → Vérifier `backend/config.py` CORS_ORIGINS
- Erreur 404 → Vérifier `frontend/js/config.js` API_URL

---

### Erreur CORS

**Backend (`backend/config.py`) :**

```python
if IS_PRODUCTION:
    CORS_ORIGINS = ["https://votre-frontend.netlify.app"]
else:
    CORS_ORIGINS = ["http://localhost:8080"]
```

---

### RLS bloque l'accès

**Vérifier que vous utilisez la clé `service_role` dans `.env` :**

```bash
# Décoder votre clé sur https://jwt.io
# Dans "Payload", vérifier :
"role": "service_role"  # ← Doit être "service_role", pas "anon"
```

---

### Warning OpenSSL (macOS)

**Non critique, peut être ignoré.**

Si vous voulez le supprimer :

```bash
pip install 'urllib3<2.0' --break-system-packages
```

---

## 📄 Licence

**MIT License**

Copyright (c) 2026 Glenn Duval

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

## 🤝 Contribution

Projet personnel - Contributions bienvenues via Pull Requests.

**Pour contribuer :**

1. Fork le projet
2. Créez une branche (`git checkout -b feature/amelioration`)
3. Committez vos changements (`git commit -m 'Ajout fonctionnalité X'`)
4. Push vers la branche (`git push origin feature/amelioration`)
5. Ouvrez une Pull Request

