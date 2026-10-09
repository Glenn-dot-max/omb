# Backlog — OMB

> Idées et améliorations **non prioritaires**, à reprendre plus tard.
> Le travail en cours et prioritaire est suivi dans [SPRINTS.md](SPRINTS.md).
> Quand un élément devient prioritaire, il est déplacé dans un sprint de `SPRINTS.md` et retiré d'ici.

**Format** : chaque élément indique _pourquoi_ il est reporté et _ce qu'il faut savoir_ pour le reprendre sans tout redécouvrir.

---

## Fonctionnalités

### B1 — Réactiver « Mot de passe oublié » sur la page de connexion

- **Ajouté le** : 2026-10-09
- **Pourquoi c'est reporté** : pas prioritaire. En attendant, un admin peut réinitialiser un mot de passe depuis l'espace admin. À reprendre quand l'interface sera plus avancée.
- **État actuel** :
  - Le backend fonctionne : `POST /auth/forgot-password` et `POST /auth/reset-password` (bug du modèle corrigé en tâche 1.1, testé).
  - La page `frontend/pages/reset-password.html` fonctionne (nom du champ `new_password` corrigé en 1.1).
  - Le lien « Mot de passe oublié ? » est **masqué** : mis en commentaire HTML (`<!-- … -->`) dans `frontend/pages/login.html` (~lignes 69-75), par le commit `cae6824` du 2026-09-06. La modale et son JavaScript sont toujours présents.
- **Ce qu'il faudra faire** :
  1. Vérifier l'envoi des emails **avant** de réafficher le lien. Sur Render (service backend → Environment) :
     - `RESEND_API_KEY` présente ;
     - `RESEND_FROM_EMAIL` sur un domaine **vérifié** dans Resend (resend.com → Domains). ⚠️ La valeur par défaut `onboarding@resend.dev` (`backend/config.py`) ne peut envoyer **qu'au propriétaire du compte Resend** : les franchises ne recevraient rien, sans message d'erreur visible (l'erreur n'apparaît que dans les logs : « Erreur envoi email reset password ») ;
     - `FRONTEND_URL` = l'adresse réelle du frontend en production (sert à construire le lien de l'email).
  2. Tester l'envoi seul, depuis la console du navigateur sur la page de connexion :
     `fetch(`${API_URL}/auth/forgot-password`, {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({email: "email_de_test"})}).then(r => r.json()).then(console.log)`
  3. Retirer les lignes `<!--` et `-->` autour du lien dans `login.html`.
  4. Tester le parcours complet en production : demande → email reçu → lien → nouveau mot de passe → connexion ; puis réutiliser le même lien → « Lien invalide ou expiré » (token à usage unique).
- **Effet de bord à connaître** : tant que le lien est commenté, `forgotPasswordLink` vaut `null` et la ligne `forgotPasswordLink.addEventListener(...)` (~ligne 228 de `login.html`) provoque une erreur dans la console à chaque affichage de la page de connexion. Sans conséquence visible pour l'utilisateur, mais disparaîtra en réactivant le lien. (Alternative si le lien doit rester masqué longtemps : protéger la ligne avec `if (forgotPasswordLink) { … }`.)
- **Lié à** : 1.1, 1.8 (`SPRINTS.md`), Sprint 9.1 (emails sans « Oh My Brunch » en dur).

---

## Qualité du code (petit ménage)

### B2 — Avertissements de dépréciation dans `pytest`

- **Ajouté le** : 2026-10-09
- **Pourquoi c'est reporté** : ce ne sont que des avertissements, tout fonctionne. Mais ils noient les vraies erreurs dans la sortie de `pytest` (d'où l'option `-W ignore`), et deviendront des erreurs avec Pydantic v3.
- **Ce qu'il faudra faire** :
  - `backend/models.py` : remplacer les `class Config:` par `model_config = ConfigDict(...)` (Pydantic v2), et `json_encoders` par un sérialiseur personnalisé ;
  - `HTTP_422_UNPROCESSABLE_ENTITY` → `HTTP_422_UNPROCESSABLE_CONTENT` là où il est utilisé ;
  - relancer `pytest` sans `-W ignore` : l'objectif est zéro avertissement.

### B3 — Dernier appel inutile à `serialize_commande`

- **Ajouté le** : 2026-10-09
- **Pourquoi c'est reporté** : sans effet sur le fonctionnement.
- **État actuel** : `backend/routes/commandes.py`, route de validation d'une commande, fait `serialize_commande(response.data[0])` sur des données qui viennent déjà de Supabase (donc déjà du texte) → appel inutile. Les autres usages encore présents (`get_commandes`, archives…) sont à vérifier un par un.
- **Ce qu'il faudra faire** : retirer les appels inutiles ; si plus aucun ne reste, supprimer la fonction (suite logique du Sprint 1bis et de la tâche 1.6).

---

## Outillage

### B4 — Installer `gh`, l'outil GitHub en ligne de commande

- **Ajouté le** : 2026-10-09
- **Pourquoi c'est reporté** : confort uniquement. Aujourd'hui l'authentification se fait avec un token GitHub (fine-grained, dépôt `omb`, permission _Contents : Read and write_) stocké dans le trousseau macOS, qui expire.
- **Ce qu'il faudra faire** : `brew install gh` puis `gh auth login` → plus de token à recréer à la main à chaque expiration.
