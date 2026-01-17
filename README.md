# 🥐 Oh My Brunch! (OMB)

Application de gestion pour traiteur - Produits, formules, commandes et production.

---

## 🚀 Lancer l'app

```bash
# Cloner
git clone https://github.com/Glenn-dot-max/omb.git
cd omb

# Installer
pip install -r requirements.txt

# Configurer les secrets (voir ci-dessous)

# Lancer
streamlit run app.py
```

---

## ⚙️ Configuration

Créer `.streamlit/secrets.toml` :

```toml
password = "ton_mot_de_passe"

[database]
host = "db.xxxxx.supabase.co"
database = "postgres"
user = "postgres"
password = "xxx"
port = 5432
```

---

## 📁 Structure

```
OMB/
├── app.py                 # Point d'entrée
├── auth.py                # Authentification
├── database/              # Connexion + fonctions DB
└── pages/                 # Pages de l'app
    ├── 1_produits.py
    ├── 02_formules.py
    ├��─ 03_Commandes.py
    ├── 04_production.py
    └── ...
```

---

## 🛠️ Stack

- **Streamlit** - Interface web
- **Supabase** - Base de données PostgreSQL
- **Python 3.9+**

---

## 📝 Commandes utiles

```bash
# Push modifications
git add . && git commit -m "message" && git push origin main

# Pull depuis GitHub
git pull origin main

# Vider le cache Streamlit
rm -rf ~/. streamlit/cache
```

---

## 👤 Auteur

Glenn Duval - [@Glenn-dot-max](https://github.com/Glenn-dot-max)
