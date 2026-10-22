// Règles de la liste des commandes, sans affichage (testées à part).
import { dateIso } from './planning'

// 'AAAA-MM-JJ' + n jours -> 'AAAA-MM-JJ' (en heure locale)
function plusJours(iso, n) {
  const [annee, mois, jour] = iso.split('-').map(Number)
  return dateIso(new Date(annee, mois - 1, jour + n))
}
// Dimanche de la semaine (lundi -> dimanche) qui contient cette date
function dimancheDe(iso) {
  const [annee, mois, jour] = iso.split('-').map(Number)
  const jourSemaine = (new Date(annee, mois - 1, jour).getDay() + 6) % 7 // lundi = 0
  return plusJours(iso, 6 - jourSemaine)
}

const parDateEtHeure = (a, b) =>
  a.delivery_date.localeCompare(b.delivery_date) ||
  (a.delivery_hour || '').localeCompare(b.delivery_hour || '')

// Les commandes actives en blocs (demande de la cuisine, réunion du 2026-10-21).
// Chaque commande est dans UN seul bloc ; les blocs vides ne sont pas renvoyés.
// Dates 'AAAA-MM-JJ' : l'ordre alphabétique est l'ordre chronologique.
export function blocsDeCommandes(commandes, aujourdhui) {
  const finProchains = plusJours(aujourdhui, 2) // aujourd'hui, demain, après-demain
  const dimanche = dimancheDe(aujourdhui)
  const dimancheSuivant = plusJours(dimanche, 7)
  const blocs = [
    // (les commandes en retard, non archivées car non validées, restent en tête)
    { cle: 'prochains', titre: 'Prochains jours', debut: aujourdhui, fin: finProchains },
    { cle: 'semaine', titre: 'Semaine en cours', debut: plusJours(finProchains, 1), fin: dimanche },
    {
      cle: 'suivante',
      titre: 'Semaine prochaine',
      debut: [plusJours(dimanche, 1), plusJours(finProchains, 1)].sort().at(-1),
      fin: dimancheSuivant,
    },
    { cle: 'plusTard', titre: 'Plus tard', debut: plusJours(dimancheSuivant, 1), fin: null },
  ]
  const blocDe = (date) =>
    date <= finProchains
      ? blocs[0]
      : date <= dimanche
        ? blocs[1]
        : date <= dimancheSuivant
          ? blocs[2]
          : blocs[3]

  for (const bloc of blocs) bloc.commandes = []
  for (const commande of [...commandes].sort(parDateEtHeure)) {
    blocDe(commande.delivery_date).commandes.push(commande)
  }
  return blocs
    .filter((bloc) => bloc.commandes.length)
    .map((bloc) => ({
      ...bloc,
      couverts: bloc.commandes.reduce((total, c) => total + (c.nombre_couverts || 0), 0),
    }))
}

// 'Équipe' -> 'equipe' : pour chercher sans tenir compte des accents ni des majuscules
export function sansAccents(texte) {
  return texte
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

// Recherche dans le nom du client (contient) et filtre par date de livraison
export function filtrerCommandes(commandes, { recherche = '', date = '' } = {}) {
  const texte = sansAccents(recherche.trim())
  return commandes.filter(
    (c) =>
      (!texte || sansAccents(c.nom_client || '').includes(texte)) &&
      (!date || c.delivery_date === date),
  )
}
