import { describe, it, expect } from 'vitest'
import {
  pourMaFranchise,
  chercher,
  ajouterFormule,
  retirerFormule,
  basculerExclusion,
  ajouterProduit,
  retirerProduit,
} from '../contenuCommande'
import { commandeVide } from '../nouvelleCommande'

const BRUNCH = { id: 'f1', name: 'Brunch Salé' }
const CAFE = { id: 'p1', name: 'Café' }
const commande = (champs = {}) => ({ ...commandeVide('2026-10-22'), ...champs })

describe('catalogue de la franchise', () => {
  const CATALOGUE = [
    { id: 'a', name: 'A', franchise_ids: ['f-1', 'f-2'] },
    { id: 'b', name: 'B', franchise_ids: ['f-2'] },
    { id: 'c', name: 'C' }, // liste déjà filtrée par le serveur (compte de franchise)
  ]
  it('garde ce qui est actif pour ma franchise', () => {
    expect(pourMaFranchise(CATALOGUE, 'f-1').map((e) => e.id)).toEqual(['a', 'c'])
  })
  it('compte sans franchise : tout', () => {
    expect(pourMaFranchise(CATALOGUE, null)).toHaveLength(3)
  })
})

describe('recherche (contient, sans accents ni majuscules)', () => {
  const FORMULES = [
    { id: '1', name: 'Brunch Salé' },
    { id: '2', name: 'Petit-déjeuner' },
    { id: '3', name: 'Pause gourmande' },
  ]
  it('trouve tout ce qui CONTIENT le texte, pas seulement ce qui commence par lui', () => {
    expect(chercher(FORMULES, 'sale').map((f) => f.id)).toEqual(['1'])
    expect(chercher(FORMULES, 'DEJ').map((f) => f.id)).toEqual(['2'])
    expect(chercher(FORMULES, 'u').map((f) => f.id)).toEqual(['1', '2', '3'])
  })
  it('texte vide : toute la liste', () => {
    expect(chercher(FORMULES, '  ')).toHaveLength(3)
  })
})

describe('formules de la commande', () => {
  it('ajoute une formule avec les couverts proposés et sans exclusion', () => {
    expect(ajouterFormule(commande(), BRUNCH, 58).formules).toEqual([
      { formule_id: 'f1', nom: 'Brunch Salé', couverts: 58, produits_exclus: [] },
    ])
  })
  it('n’ajoute pas deux fois la même formule', () => {
    const c = ajouterFormule(commande(), BRUNCH, 10)
    expect(ajouterFormule(c, BRUNCH, 10).formules).toHaveLength(1)
  })
  it('retire une formule', () => {
    expect(retirerFormule(ajouterFormule(commande(), BRUNCH, 10), 'f1').formules).toEqual([])
  })
  it('exclut puis réintègre un produit d’une formule', () => {
    let c = ajouterFormule(commande(), BRUNCH, 10)
    c = basculerExclusion(c, 'f1', 'p9')
    expect(c.formules[0].produits_exclus).toEqual(['p9'])
    c = basculerExclusion(c, 'f1', 'p9')
    expect(c.formules[0].produits_exclus).toEqual([])
  })
})

describe('produits ajoutés à la commande', () => {
  it('ajoute un produit avec sa quantité et son unité', () => {
    expect(ajouterProduit(commande(), CAFE, 2.5, 'L').produits).toEqual([
      { produit_id: 'p1', nom: 'Café', quantite: 2.5, unite: 'L' },
    ])
  })
  it('même produit, même unité : pas de doublon ; autre unité : accepté', () => {
    let c = ajouterProduit(commande(), CAFE, 2, 'L')
    c = ajouterProduit(c, CAFE, 3, 'L')
    expect(c.produits).toHaveLength(1)
    c = ajouterProduit(c, CAFE, 10, 'tasse')
    expect(c.produits).toHaveLength(2)
  })
  it('retire un produit (avec son unité)', () => {
    let c = ajouterProduit(commande(), CAFE, 2, 'L')
    c = ajouterProduit(c, CAFE, 10, 'tasse')
    expect(retirerProduit(c, 'p1', 'L').produits.map((p) => p.unite)).toEqual(['tasse'])
  })
})
