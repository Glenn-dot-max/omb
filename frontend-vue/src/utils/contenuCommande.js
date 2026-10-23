// Contenu d'une commande (écran 2) : formules, exclusions et produits ajoutés.
// Chaque fonction renvoie une NOUVELLE commande, sans modifier celle reçue.
import { sansAccents } from './commandes'

// Formules et produits disponibles pour ma franchise.
// Listes du catalogue (admin) : chaque élément a franchise_ids → on filtre ;
// listes déjà filtrées par le serveur (compte de franchise) : pas de franchise_ids → on garde.
export function pourMaFranchise(elements, franchiseId) {
  if (!franchiseId) return elements
  return elements.filter(
    (e) => !Array.isArray(e.franchise_ids) || e.franchise_ids.includes(franchiseId),
  )
}

// Recherche « contient », sans accents ni majuscules (demande de la cuisine)
export function chercher(elements, texte, champ = 'name') {
  const recherche = sansAccents(texte.trim())
  // Toujours une nouvelle liste : PrimeVue (AutoComplete) n'ouvre son menu que si la liste change
  if (!recherche) return [...elements]
  return elements.filter((e) => sansAccents(e[champ] || '').includes(recherche))
}

export function ajouterFormule(c, formule, couverts) {
  if (c.formules.some((f) => f.formule_id === formule.id)) return c
  return {
    ...c,
    formules: [
      ...c.formules,
      { formule_id: formule.id, nom: formule.name, couverts, produits_exclus: [] },
    ],
  }
}

export function retirerFormule(c, formuleId) {
  return { ...c, formules: c.formules.filter((f) => f.formule_id !== formuleId) }
}

// Coché → décoché (exclu de cette commande) et inversement
export function basculerExclusion(c, formuleId, produitId) {
  return {
    ...c,
    formules: c.formules.map((f) => {
      if (f.formule_id !== formuleId) return f
      const exclu = f.produits_exclus.includes(produitId)
      return {
        ...f,
        produits_exclus: exclu
          ? f.produits_exclus.filter((id) => id !== produitId)
          : [...f.produits_exclus, produitId],
      }
    }),
  }
}

// Un même produit peut être ajouté dans deux unités différentes (ex. 2 L et 10 tasses)
export function ajouterProduit(c, produit, quantite, unite) {
  if (c.produits.some((p) => p.produit_id === produit.id && p.unite === unite)) return c
  return {
    ...c,
    produits: [...c.produits, { produit_id: produit.id, nom: produit.name, quantite, unite }],
  }
}

export function retirerProduit(c, produitId, unite) {
  return {
    ...c,
    produits: c.produits.filter((p) => !(p.produit_id === produitId && p.unite === unite)),
  }
}
