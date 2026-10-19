# 🧼 M1 — Pack hygiène et traçabilité (scan des lots)

> Retour à la [feuille de route](../../ROADMAP.md) · Statut : ⚪ à faire · Durée estimée : **5 à 6 semaines** · Fin visée : mi-mars 2027
> Prérequis : [Phase B](00-fondations.md) (tablette, salariés, inaltérabilité, fichiers, articles/fournisseurs). Revue senior : **S3** avant mise en production.

## 🎯 Objectif

Remplacer les classeurs papier d'hygiène par la tablette, et **savoir en quelques secondes quels lots ont servi à quelles commandes** (rappel produit, contrôle sanitaire).

## 👥 Utilisateurs

- **Équipe en cuisine** (tablette, code PIN) : réceptions, relevés, nettoyage.
- **Responsable hygiène / gérant de site** (bureau) : paramétrage, suivi des non-conformités, rapports.
- **Inspecteur sanitaire** (indirectement) : consulte les rapports exportés lors d'un contrôle.

## 📦 Périmètre version 1

### Réception des marchandises (tablette)
- [ ] **Scan du code-barres** de l'article → article reconnu automatiquement (après un premier enregistrement manuel).
- [ ] Lecture des codes logistiques **GS1-128** quand ils sont présents (contiennent souvent le **lot** et la **date limite**).
- [ ] Saisie ou scan du **numéro de lot** et de la **DLC / DDM**.
- [ ] **Température à réception**, **photo de l'étiquette**, **conforme / non conforme** (+ motif et action si non conforme).
- [ ] Création automatique d'un **lot** en stock.

### Traçabilité
- [ ] Enregistrer **quels lots** ont été utilisés pour une **production** (et donc pour quelles commandes).
- [ ] **Recherche amont / aval** : « ce lot → quelles commandes, quels clients » et « cette commande → quels lots ».
- [ ] Alerte sur les lots dont la **date limite approche** ou est dépassée.

### Relevés et plans (tablette + bureau)
- [ ] **Équipements** (frigos, chambres froides, congélateurs) et leurs **relevés de température** (fréquence paramétrable, seuils, alerte hors limites).
- [ ] **Plans de nettoyage** : tâches, fréquences, validation par le salarié.
- [ ] **Non-conformités** et **actions correctives**.

### Rapports
- [ ] **Export PDF** par période et par site, prêt à présenter lors d'un contrôle sanitaire.

## ⏭️ Plus tard

- Plats témoins, refroidissement rapide, remise en température.
- Impression d'**étiquettes de traçabilité** (DLC secondaire) sur imprimante thermique.
- **Sondes de température connectées** (relevés automatiques).
- Traçabilité au niveau de la **recette** (une fois M3 en place) : lots consommés calculés depuis les grammages.

## 🗃️ Données (premier jet, à valider en S1)

`receptions` (fournisseur, date, salarié, conformité) · `lots` (article, numéro de lot, DLC/DDM, quantité, réception) · `utilisations_lots` (lot → production/commande) · `equipements` · `releves_temperature` · `plans_nettoyage` / `taches_nettoyage` / `validations_nettoyage` · `non_conformites` / `actions_correctives` · photos dans le stockage de fichiers. Tous **inaltérables** (cf. B5).

## 🖥️ Écrans

- **Tablette** : accueil par code PIN → « Réception », « Températures », « Nettoyage », « Signaler un problème ».
- **Bureau** : paramétrage (équipements, seuils, plans), tableau de bord des alertes, recherche de traçabilité, rapports.

## 🔧 Matériel à tester tôt

- **Caméra de la tablette** : fonctionne, mais moins fiable en cuisine (lumière, buée, étiquettes abîmées).
- **Douchette Bluetooth** (lecteur de codes-barres) : se comporte comme un clavier, très robuste — souvent le meilleur choix. **À tester dans la vraie cuisine avant de développer.**

## ⚖️ Points à faire valider

- Contenu des modèles par rapport au **plan de maîtrise sanitaire (PMS)** et à la méthode **HACCP** (consultant hygiène ou retour des franchises).
- **Durées de conservation** des enregistrements d'hygiène et de traçabilité.
- Valeur des relevés numériques lors d'un contrôle (inaltérabilité, horodatage, identification du salarié).

## ❓ Questions ouvertes

- Quels documents papier les franchises utilisent-elles aujourd'hui ? (à récupérer : fiches de réception, relevés, plans de nettoyage)
- Quels fournisseurs ont des codes-barres GS1-128 sur leurs colis ?
- Une tablette par site, ou plusieurs (réception / cuisine) ?

## 📓 Informations reçues

- **2026-10-13** — Priorité n°1 de Glenn : pack hygiène + traçabilité des produits **par scan**.
