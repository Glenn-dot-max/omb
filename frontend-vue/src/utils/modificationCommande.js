// Modifier une commande existante (même formulaire que la création) :
// - commandeDepuisServeur : ce que renvoie le serveur → formulaire pré-rempli ;
// - modificationPourLeServeur : uniquement ce qui a changé (PUT /commandes/{id}/complete),
//   pour que l'historique montre les vrais changements et que rien d'autre ne soit réécrit ;
// - copieDeCommande : duplication, une NOUVELLE commande pré-remplie (POST /commandes/complete).
import { commandeVide, donneesPourLeServeur } from './nouvelleCommande'

export function commandeDepuisServeur(ligne, formules, produits, noms) {
  const vide = commandeVide(ligne.delivery_date)
  return {
    ...vide,
    nom_client: ligne.nom_client,
    delivery_hour: (ligne.delivery_hour || '').slice(0, 5), // 'HH:MM:SS' → 'HH:MM'
    type_prestation: ligne.type_prestation || 'non-brunch',
    nombre_couverts: ligne.nombre_couverts,
    nb_adultes: ligne.nb_adultes ?? 0,
    nb_enfants: ligne.nb_enfants ?? 0,
    taux_enfant: ligne.taux_enfant ?? vide.taux_enfant,
    ponderation: Math.round((ligne.coefficient_ponderation || 1) * 100),
    avec_service: !!ligne.avec_service,
    nb_repas_personnel: ligne.nb_repas_personnel ?? 0,
    a_une_note: !!(ligne.notes && ligne.notes.trim()),
    notes: ligne.notes || '',
    en_attente: ligne.validated === false,
    formules: formules.map((f) => ({
      commande_formule_id: f.id,
      formule_id: f.formule_id,
      nom: noms[f.formule_id] || 'Formule inconnue',
      couverts: f.quantite_finale,
      produits_exclus: f.produits_exclus || [],
    })),
    produits: produits.map((p) => ({
      commande_produit_id: p.id,
      produit_id: p.produit_id,
      nom: noms[p.produit_id] || 'Produit inconnu',
      quantite: p.quantite,
      unite: p.unite,
    })),
  }
}

const memeListe = (a, b) => [...a].sort().join() === [...b].sort().join()

export function modificationPourLeServeur(origine, actuelle) {
  const avant = donneesPourLeServeur(origine)
  const apres = donneesPourLeServeur(actuelle)
  const modification = {}

  // Informations : chaque champ qui a changé
  for (const [champ, valeur] of Object.entries(apres)) {
    if (champ === 'formules' || champ === 'produits') continue
    if (JSON.stringify(valeur) !== JSON.stringify(avant[champ])) modification[champ] = valeur
  }
  // Note retirée : null serait ignoré par le serveur, on envoie une note vide
  if (modification.notes === null) modification.notes = ''

  // Formules
  const idsActuels = actuelle.formules.map((f) => f.commande_formule_id).filter(Boolean)
  const modifiees = actuelle.formules
    .filter((f) => f.commande_formule_id)
    .filter((f) => {
      const o = origine.formules.find((x) => x.commande_formule_id === f.commande_formule_id)
      return o.couverts !== f.couverts || !memeListe(o.produits_exclus, f.produits_exclus)
    })
    .map((f) => ({
      commande_formule_id: f.commande_formule_id,
      quantite_finale: f.couverts,
      produits_exclus: f.produits_exclus,
    }))
  const ajoutees = actuelle.formules
    .filter((f) => !f.commande_formule_id)
    .map((f) => ({
      formule_id: f.formule_id,
      quantite_finale: f.couverts,
      produits_exclus: f.produits_exclus,
    }))
  const retirees = origine.formules
    .map((f) => f.commande_formule_id)
    .filter((id) => !idsActuels.includes(id))
  if (modifiees.length) modification.formules_modifiees = modifiees
  if (ajoutees.length) modification.formules_ajoutees = ajoutees
  if (retirees.length) modification.formules_retirees = retirees

  // Produits
  const idsProduits = actuelle.produits.map((p) => p.commande_produit_id).filter(Boolean)
  const produitsModifies = actuelle.produits
    .filter((p) => p.commande_produit_id)
    .filter(
      (p) =>
        origine.produits.find((x) => x.commande_produit_id === p.commande_produit_id).quantite !==
        p.quantite,
    )
    .map((p) => ({ commande_produit_id: p.commande_produit_id, quantite: p.quantite }))
  const produitsAjoutes = actuelle.produits
    .filter((p) => !p.commande_produit_id)
    .map((p) => ({ produit_id: p.produit_id, quantite: p.quantite, unite: p.unite }))
  const produitsRetires = origine.produits
    .map((p) => p.commande_produit_id)
    .filter((id) => !idsProduits.includes(id))
  if (produitsModifies.length) modification.produits_modifies = produitsModifies
  if (produitsAjoutes.length) modification.produits_ajoutes = produitsAjoutes
  if (produitsRetires.length) modification.produits_retires = produitsRetires

  return modification
}

// Duplication : même contenu, mais une nouvelle commande (sans les identifiants de l'ancienne).
// disponibles = ids des formules et produits encore au catalogue de la franchise :
// les autres seraient refusés par le serveur, ils ne sont pas copiés mais comptés.
export function copieDeCommande(c, aujourdhui, disponibles) {
  const formules = c.formules.filter((f) => disponibles.has(f.formule_id))
  const produits = c.produits.filter((p) => disponibles.has(p.produit_id))
  return {
    commande: {
      ...c,
      nom_client: `Copie - ${c.nom_client}`,
      // Date passée refusée par le serveur : aujourd'hui à la place
      delivery_date: c.delivery_date < aujourdhui ? aujourdhui : c.delivery_date,
      en_attente: false,
      formules: formules.map((f) => ({
        formule_id: f.formule_id,
        nom: f.nom,
        couverts: f.couverts,
        produits_exclus: [...f.produits_exclus],
      })),
      produits: produits.map((p) => ({
        produit_id: p.produit_id,
        nom: p.nom,
        quantite: p.quantite,
        unite: p.unite,
      })),
    },
    nonCopies: c.formules.length - formules.length + (c.produits.length - produits.length),
  }
}
