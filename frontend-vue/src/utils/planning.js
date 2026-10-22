// Fonctions de calcul du planning de production, sans affichage : utilisées par la page
// Planning ET par l'export Excel (mêmes chiffres partout), et testées à part.
// Les dates arrivent du serveur au format 'AAAA-MM-JJ'.

const JOURS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

// 'AAAA-MM-JJ' -> Date à minuit, heure locale (new Date('2026-10-26') serait minuit à Londres)
function enDate(iso) {
  const [annee, mois, jour] = iso.split('-').map(Number)
  return new Date(annee, mois - 1, jour)
}

// Date -> 'AAAA-MM-JJ' en heure locale (toISOString donnerait la veille après 23 h l'hiver)
export function dateIso(date) {
  const mois = String(date.getMonth() + 1).padStart(2, '0')
  const jour = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${mois}-${jour}`
}

export function formaterDate(iso) {
  const [annee, mois, jour] = iso.split('-')
  return `${jour}/${mois}/${annee}`
}

export function jourCourt(iso) {
  return JOURS[enDate(iso).getDay()]
}

export function formaterQuantite(nombre) {
  const arrondi = Math.round(nombre * 10) / 10
  return Number.isInteger(arrondi) ? String(arrondi) : String(arrondi).replace('.', ',')
}

// Numéro de semaine ISO 8601 : les semaines commencent le lundi, et la semaine 1
// est celle qui contient le premier jeudi de l'année.
export function numeroSemaine(iso) {
  const date = enDate(iso)
  const jour = (date.getDay() + 6) % 7 // lundi = 0 … dimanche = 6
  date.setDate(date.getDate() - jour + 3) // jeudi de la même semaine
  const premierJeudi = new Date(date.getFullYear(), 0, 4)
  const ecartJours = Math.round((date - premierJeudi) / 86400000)
  return 1 + Math.round((ecartJours - 3 + ((premierJeudi.getDay() + 6) % 7)) / 7)
}

export function libelleSemaines(debut, fin) {
  const premiere = numeroSemaine(debut)
  const derniere = numeroSemaine(fin)
  if (premiere === derniere) return `Semaine ${premiere}`
  // Deux semaines qui se suivent (y compris 53 -> 1 en fin d'année) : « et », sinon « à »
  const septJoursPlusTard = enDate(debut)
  septJoursPlusTard.setDate(septJoursPlusTard.getDate() + 7)
  const separateur = numeroSemaine(dateIso(septJoursPlusTard)) === derniere ? 'et' : 'à'
  return `Semaines ${premiere} ${separateur} ${derniere}`
}

// { '2026-10-27': {...}, '2026-10-26': {...} } -> [{ date, commandes, totaux }] trié par date
export function joursDuPlanning(planning) {
  return Object.keys(planning)
    .sort()
    .map((date) => ({ date, ...planning[date] }))
}

function groupeDuType(type) {
  const t = (type || '').toLowerCase()
  if (t.includes('sucr')) return 'Sucré'
  if (t.includes('sal')) return 'Salé'
  return 'Autre'
}
const ORDRE_GROUPES = ['Sucré', 'Salé', 'Autre']
const parNom = (a, b) => a.localeCompare(b, 'fr')

// Tous les produits de la période, une seule fois chacun, rangés par groupe puis par catégorie
export function produitsParGroupe(planning) {
  const groupes = {} // groupe -> catégorie -> id -> produit
  for (const { totaux } of Object.values(planning)) {
    for (const [id, p] of Object.entries(totaux || {})) {
      const groupe = groupeDuType(p.type)
      const categorie = p.categorie || 'Autre'
      groupes[groupe] ??= {}
      groupes[groupe][categorie] ??= {}
      groupes[groupe][categorie][id] ??= { id, nom: p.nom, type: p.type || '', unite: p.unite }
    }
  }
  return ORDRE_GROUPES.filter((g) => groupes[g]).map((groupe) => ({
    groupe,
    categories: Object.keys(groupes[groupe])
      .sort(parNom)
      .map((nom) => ({
        nom,
        produits: Object.values(groupes[groupe][nom]).sort((a, b) => parNom(a.nom, b.nom)),
      })),
  }))
}

// Quantité d'un produit dans une commande, ou null s'il n'y est pas
export function quantiteCommande(commande, produitId) {
  return commande.produits?.[produitId]?.quantite ?? null
}

export function totalJour(jour, produitId) {
  return (jour.commandes || []).reduce(
    (total, c) => total + (quantiteCommande(c, produitId) || 0),
    0,
  )
}

export function totalGeneral(planning, produitId) {
  return Object.values(planning).reduce((total, jour) => total + totalJour(jour, produitId), 0)
}
