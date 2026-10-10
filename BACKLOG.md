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

### B6 — Page « Historique et statistiques » (KPI + export Excel)

- **Ajouté le** : 2026-10-10
- **Pourquoi c'est reporté** : nouvelle fonctionnalité → après la sécurisation (Sprints 2-4) et les fondations multi-traiteurs (Phase B). Une page qui agrège des données de plusieurs franchises doit être construite **après** que le cloisonnement soit fiable (Sprint 2 / Sprint 7). Bon candidat pour le **premier écran en Vue** (Sprint 10) : page neuve, graphiques et filtres.
- **Idée** : transformer l'onglet « Archivées » de la page Commandes (aujourd'hui une simple liste des commandes passées) en vraie page d'historique avec des indicateurs.
- **Prérequis** : ne jamais supprimer une commande passée — l'historique se calcule sur les commandes archivées (décision Q1 du 2026-10-10 → tâche 2.1). L'archivage automatique existe déjà (`POST /commandes/auto-archive`, appelé à l'ouverture de la page Commandes : commandes validées dont la date de livraison est passée → `archived = true`).
- **KPI calculables avec les données actuelles** :
  - nombre de commandes par période (semaine / mois), avec évolution vs la période précédente ;
  - couverts servis sur la période ;
  - formules et produits les plus commandés (top 5 / top 10) ;
  - répartition par type de prestation (brunch, mariage, …) ;
  - jours de la semaine et heures de livraison les plus chargés ;
  - (admin) comparaison entre franchises.
- **Fonctions** : filtres (période, franchise, type de prestation) ; **export Excel** en réutilisant `ExcelJS`, déjà utilisé pour l'export du planning (`frontend/js/planning.js`).
- **Limite actuelle** : aucun prix n'est stocké → pas de chiffre d'affaires ni de panier moyen en euros. À ajouter quand les prix existeront (Sprint 8 : `prix_personnalise` par site).
- **À prévoir côté technique** : calculer les KPI **côté backend** (une route dédiée, filtrée par franchise/organisation) plutôt que de charger toutes les commandes dans le navigateur ; pagination / volumes (tâche 2.4).⚠️ l'onglet « Archivées » actuel est coupé à 1 000 lignes (limite Supabase).
- **À décider le moment venu** : quels KPI sont vraiment utiles aux franchises (à leur demander).

### B7 — Distinguer visuellement les produits/formules créés par l'admin et par une franchise

- **Ajouté le** : 2026-10-10
- **Pourquoi c'est reporté** : confort d'interface, pas un problème de sécurité. Idée de Glenn lors de la réponse à Q2.
- **Règle actuelle** (Q2, 2026-10-10) : un admin (`TECH_ADMIN` / `CATALOG_ADMIN`) peut créer un produit/une formule pour une, plusieurs ou toutes les franchises ; un utilisateur de franchise ne crée que pour **sa** franchise, et ses créations restent invisibles pour les autres (cloisonnement vérifié côté backend en tâche 2.2).
- **Idée** : un badge ou un filtre dans les pages Produits et Formules : « Catalogue central » (créé par l'admin) vs « Créé par votre franchise ».
- **À vérifier avant** : la base ne stocke pas (à confirmer) qui a créé l'élément. Pistes : une colonne `created_by` / `origine` à ajouter (migration, Sprint 5), ou déduire de `franchise_produits` (un élément lié à une seule franchise et créé par un utilisateur de cette franchise). La page Formules affiche déjà « ✅ Formule propre à votre franchise » quand `nb_franchises === 1` (`formules-render.js`) — à généraliser aux produits et à fiabiliser.
- **Lié à** : Sprint 8 (personnalisation du catalogue par site), Sprint 10 (Vue).

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

### B5 — Code mort dans `formules-modals.js` : `handleAddFormule`

- **Ajouté le** : 2026-10-09
- **Pourquoi c'est reporté** : sans effet, la fonction n'est jamais appelée.
- **État actuel** : `handleAddFormule` (~ligne 140 de `frontend/js/formules/formules-modals.js`) est branchée sur `#add-formule-form`, qui n'existe plus dans `formules.html` ; elle lit aussi le champ fantôme `formule-type` (supprimé du HTML le 2026-06-15). La création de formule passe par `handleCreateFormuleWithProduits` (`formules-create.js`).
- **Ce qu'il faudra faire** : supprimer `handleAddFormule` et le bloc `add-formule-form` de `setupEventListeners`. ⚠️ Ne pas confondre avec `handleAddFormule` de `commandes-modals.js` (même nom, autre page, utilisée).

---

## Outillage

### B4 — Installer `gh`, l'outil GitHub en ligne de commande

- **Ajouté le** : 2026-10-09
- **Pourquoi c'est reporté** : confort uniquement. Aujourd'hui l'authentification se fait avec un token GitHub (fine-grained, dépôt `omb`, permission _Contents : Read and write_) stocké dans le trousseau macOS, qui expire.
- **Ce qu'il faudra faire** : `brew install gh` puis `gh auth login` → plus de token à recréer à la main à chaque expiration.
