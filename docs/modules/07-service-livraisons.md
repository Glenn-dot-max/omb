# 🚚 M7 — Planning de service et livraisons

> Retour à la [feuille de route](../../ROADMAP.md) · Statut : ⚪ à faire · Durée estimée : **3 à 4 semaines** · Ordre : juste après les fondations, avant le pointage (réunion du 2026-10-21) · Fin visée : à recalculer
> Prérequis : planning de production en Vue (Sprint V), [Phase B](00-fondations.md) (sites, salariés, interface tablette).

## 🎯 Objectif

La suite logique des commandes et du planning de production : organiser **tout ce qui se passe entre le départ de la cuisine et le client**, livraisons comme prestations avec service.

## 👥 Utilisateurs

- **Bureau / gérant de site** : prépare le planning de service du jour et de la semaine, affecte le personnel et les véhicules.
- **Livreurs et personnel de service** (téléphone ou tablette) : consultent leur tournée ou leur prestation, signent le bon de livraison.
- **Cuisine** : sait quoi préparer et charger, et à quelle heure.

## 📦 Périmètre version 1 (premier jet, à valider avec OMB)

- [ ] **Planning des livraisons du jour** : heures, adresses, ordre de la tournée.
- [ ] Affectation des **livreurs** et des **véhicules**.
- [ ] **Prestations avec service** : personnel prévu (serveurs, maîtres d'hôtel), horaires de mise en place et de fin, **repas du personnel** (saisis dans la commande, V5).
- [ ] **Matériel** à emporter et à récupérer (vaisselle, nappes, réchauds).
- [ ] **Check-list de chargement** avant le départ.
- [ ] **Bon de livraison** sur téléphone ou tablette : signature et photo à la remise.
- [ ] **Suivi** de chaque commande : préparée, en route, livrée.

## ⏭️ Plus tard

- **Association de formules à du matériel** (ex. un atelier pain/cake qui demande son matériel) → [`BACKLOG.md`](../../BACKLOG.md) B12.
- Calcul d'itinéraire, temps de trajet.
- Notification au client (« en route »).

## 🗃️ Données (premier jet, à valider en S1)

`commandes` (déjà là : service oui/non, repas du personnel) · `tournees` (date, véhicule, livreur, ordre des arrêts) · `affectations_service` (commande, salarié, rôle, horaires) · `materiel` / `materiel_commande` (sorti, rendu) · `bons_livraison` (signature, photo, horodatage).

## 🖥️ Écrans (Vue + PrimeVue)

- **Bureau** : planning du jour et de la semaine (`DataTable`, vue par jour), affectation par glisser-déposer ou liste déroulante.
- **Téléphone / tablette** : ma tournée du jour, check-list de chargement, bon de livraison avec signature.

## ❓ Questions ouvertes

- ❓ (Max/Pascal) Qui prépare le planning de service aujourd'hui, et sur quel support ?
- ❓ (Max/Pascal) Les livreurs ont-ils un téléphone professionnel ?
- ❓ (Max/Pascal) Le matériel est-il suivi aujourd'hui (pertes, casse) ?

## 📓 Informations reçues

- **2026-10-21** — Réunion OMB : priorité n°2 après le planning de production : « **faire le planning de service** ». 80 % des commandes sont **sans service** ; pour les commandes avec service, il faut pouvoir prévoir les **repas du personnel** et leur nombre (saisi dès la création de commande, V5). À garder en tête : association de formules à du matériel (ex. un atelier pain/cake).
