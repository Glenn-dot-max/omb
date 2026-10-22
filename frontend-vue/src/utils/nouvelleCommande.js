// Règles du formulaire de commande en 3 écrans, sans affichage (testées à part) :
// valeurs par défaut, parts produites, vérification de chaque écran, données envoyées.

export const NOTE_PAR_DEFAUT = 'Voir le bon de commande'
const CARACTERES_INTERDITS = /[<>"\\/]/ // mêmes règles que le serveur (check_nom_client)

// Une nouvelle commande (décisions du 2026-10-21/22 : sans service, sans note,
// pondération 100 %, taux enfant 80 %)
export function commandeVide(aujourdhui) {
  return {
    nom_client: '',
    delivery_date: aujourdhui,
    delivery_hour: '10:00',
    type_prestation: 'non-brunch',
    nombre_couverts: 1,
    nb_adultes: 0,
    nb_enfants: 0,
    taux_enfant: 80,
    ponderation: 100,
    avec_service: false,
    nb_repas_personnel: 0, // demandé seulement si « avec service » (0 = pas de repas)
    a_une_note: false,
    notes: '',
    en_attente: false,
    formules: [], // { formule_id, nom, couverts, produits_exclus }
    produits: [], // { produit_id, nom, quantite, unite }
  }
}

const estMariage = (c) => c.type_prestation === 'mariage'

// Parts à produire, proposées par défaut aux formules :
// mariage = adultes + enfants × taux enfant (arrondi supérieur), sinon le nombre de couverts.
// (enfants × taux) est calculé AVANT la division par 100 : un nombre entier divisé par 100
// ne laisse pas d'erreur de virgule (10 × 80 / 100 = 8 tout juste, et non 8,000000001)
export function partsProduites(c) {
  if (!estMariage(c)) return c.nombre_couverts || 0
  return Math.ceil((c.nb_adultes || 0) + ((c.nb_enfants || 0) * (c.taux_enfant || 0)) / 100)
}

// « La commande a-t-elle une note ? » Oui : zone de texte pré-remplie ; Non : note vidée
export function changerNote(c, oui) {
  return { ...c, a_une_note: oui, notes: oui ? c.notes || NOTE_PAR_DEFAUT : '' }
}

// Message d'erreur de l'écran (1 infos et service, 2 formules et produits), ou null
export function erreurEtape(c, etape) {
  if (etape === 1) {
    if (!c.nom_client.trim()) return 'Le nom du client est obligatoire.'
    if (CARACTERES_INTERDITS.test(c.nom_client))
      return 'Le nom du client contient des caractères non autorisés (< > " \\ /).'
    if (!c.delivery_date) return 'La date de livraison est obligatoire.'
    if (!c.delivery_hour) return "L'heure de livraison est obligatoire."
    if (estMariage(c)) {
      if ((c.nb_adultes || 0) + (c.nb_enfants || 0) < 1)
        return 'Indiquez le nombre d’adultes et d’enfants (au moins 1 convive).'
      if (!(c.taux_enfant >= 0 && c.taux_enfant <= 100))
        return 'Le taux enfant doit être entre 0 et 100 %.'
    } else if (!(c.nombre_couverts >= 1)) {
      return 'Le nombre de couverts doit être au moins 1.'
    }
    if (!(c.ponderation >= 1 && c.ponderation <= 1000))
      return 'La pondération doit être entre 1 et 1000 %.'
    if (c.avec_service && !(Number.isInteger(c.nb_repas_personnel) && c.nb_repas_personnel >= 0))
      return 'Indiquez le nombre de repas du personnel à prévoir (0 si aucun).'
    if (c.a_une_note && !c.notes.trim()) return 'Écrivez la note, ou répondez « Non ».'
  }
  if (etape === 2) {
    if (!c.formules.length && !c.produits.length)
      return 'Ajoutez au moins une formule ou un produit.'
    const formule = c.formules.find((f) => !(f.couverts > 0))
    if (formule) return `Indiquez les couverts de la formule « ${formule.nom} ».`
    const produit = c.produits.find((p) => !(p.quantite > 0))
    if (produit) return `Indiquez la quantité du produit « ${produit.nom} ».`
  }
  return null
}

// Les données de POST /commandes/complete : uniquement les champs attendus (extra = 'forbid')
export function donneesPourLeServeur(c) {
  // Repas du personnel : seulement avec service, et s'il y en a au moins un
  const repas = c.avec_service && c.nb_repas_personnel > 0
  return {
    nom_client: c.nom_client.trim(),
    delivery_date: c.delivery_date,
    delivery_hour: c.delivery_hour,
    type_prestation: c.type_prestation,
    nombre_couverts: estMariage(c) ? c.nb_adultes + c.nb_enfants : c.nombre_couverts,
    ...(estMariage(c) && {
      nb_adultes: c.nb_adultes,
      nb_enfants: c.nb_enfants,
      taux_enfant: c.taux_enfant,
    }),
    coefficient_ponderation: c.ponderation / 100,
    avec_service: c.avec_service,
    service: c.avec_service, // ancien champ, encore lu par l'ancien frontend
    repas_personnel: repas,
    ...(repas && { nb_repas_personnel: c.nb_repas_personnel }),
    notes: c.a_une_note ? c.notes.trim() || null : null,
    validated: !c.en_attente,
    formules: c.formules.map((f) => ({
      formule_id: f.formule_id,
      quantite_finale: f.couverts,
      produits_exclus: f.produits_exclus || [],
    })),
    produits: c.produits.map((p) => ({
      produit_id: p.produit_id,
      quantite: p.quantite,
      unite: p.unite,
    })),
  }
}
