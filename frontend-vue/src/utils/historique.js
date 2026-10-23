// Affichage de l'historique d'une commande (horloge sur chaque commande) : textes lisibles
// à partir de ce que le serveur enregistre (action, details, date en heure universelle).
import { formaterDate } from './planning'

const ACTIONS = {
  creation: 'Création',
  modification: 'Modification',
  validation: 'Validation',
  suppression: 'Suppression',
}
export const libelleAction = (action) => ACTIONS[action] || action

// '2026-10-23T10:05:00+00:00' -> 'ven. 23/10/2026 à 12:05' (heure de Paris, été comme hiver)
export function formaterHorodatage(iso) {
  const parties = Object.fromEntries(
    new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris',
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
      .formatToParts(new Date(iso))
      .map((p) => [p.type, p.value]),
  )
  return `${parties.weekday} ${parties.day}/${parties.month}/${parties.year} à ${parties.hour}:${parties.minute}`
}

// Champs de la commande : libellé, et comment afficher la valeur
const oui = (v) => (v ? 'Oui' : 'Non')
const CHAMPS = {
  nom_client: ['Client'],
  type_prestation: ['Prestation'],
  delivery_date: ['Date de livraison', formaterDate],
  delivery_hour: ['Heure', (h) => h.slice(0, 5)],
  nombre_couverts: ['Couverts'],
  nb_adultes: ['Adultes'],
  nb_enfants: ['Enfants'],
  taux_enfant: ["Part d'un enfant", (t) => `${t} %`],
  coefficient_ponderation: ['Pondération', (c) => `${Math.round(c * 100)} %`],
  avec_service: ['Service', oui],
  repas_personnel: ['Repas du personnel', oui],
  nb_repas_personnel: ['Nombre de repas du personnel'],
  notes: ['Note'],
  validated: ['Validée', oui],
}
const valeurLisible = (champ, valeur) => {
  if (valeur === null || valeur === undefined || valeur === '') return '(vide)'
  const formater = CHAMPS[champ]?.[1]
  return formater ? formater(valeur) : String(valeur)
}

// Liste de phrases courtes décrivant une ligne d'historique
export function resumeDetails(action, details) {
  const d = details || {}
  if (action === 'creation') {
    const lignes = [
      `Client : ${d.nom_client}`,
      `Livraison : ${formaterDate(d.delivery_date)} à ${d.delivery_hour.slice(0, 5)}`,
      `Couverts : ${d.nombre_couverts}`,
      `${d.formules} formule(s), ${d.produits} produit(s) ajouté(s)`,
    ]
    if (d.validated === false) lignes.push('En attente de validation')
    return lignes
  }
  if (action === 'modification') {
    const lignes = Object.entries(d.champs || {})
      .filter(([champ]) => champ in CHAMPS) // « service » (ancien champ en double) n'est pas affiché
      .map(([champ, valeur]) => `${CHAMPS[champ][0]} → ${valeurLisible(champ, valeur)}`)
    if (d.formules_modifiees) lignes.push(`${d.formules_modifiees} formule(s) modifiée(s)`)
    if (d.formules_ajoutees) lignes.push(`${d.formules_ajoutees} formule(s) ajoutée(s)`)
    if (d.formules_retirees) lignes.push(`${d.formules_retirees} formule(s) retirée(s)`)
    if (d.produits_ajoutes) lignes.push(`${d.produits_ajoutes} produit(s) ajouté(s)`)
    if (d.produits_modifies)
      lignes.push(`${d.produits_modifies} quantité(s) de produit modifiée(s)`)
    if (d.produits_retires) lignes.push(`${d.produits_retires} produit(s) retiré(s)`)
    return lignes
  }
  if (action === 'suppression') {
    return [`Client : ${d.nom_client}`, `Livraison prévue : ${formaterDate(d.delivery_date)}`]
  }
  return []
}
