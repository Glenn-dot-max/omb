import { describe, it, expect } from 'vitest'
import {
  dateIso,
  formaterDate,
  jourCourt,
  formaterQuantite,
  numeroSemaine,
  libelleSemaines,
  joursDuPlanning,
  produitsParGroupe,
  quantiteCommande,
  totalJour,
  totalGeneral,
  convives,
} from '../planning'

// Réponse du serveur (GET /planning/production), réduite à l'essentiel
const PLANNING = {
  '2026-10-27': {
    commandes: [
      {
        id: 'c1',
        client: 'Dupont',
        heure: '09:00:00',
        couverts: 20,
        notes: '',
        produits: { p1: { quantite: 40, source: 'formule' } },
      },
      {
        id: 'c2',
        client: 'Martin',
        heure: '12:00:00',
        couverts: 10,
        notes: 'Sans gluten',
        produits: {
          p1: { quantite: 5, source: 'suppl' },
          p2: { quantite: 2.5, source: 'formule' },
        },
      },
    ],
    totaux: {
      p1: {
        nom: 'Mini croissant',
        type: 'Sucré',
        categorie: 'Viennoiseries',
        unite: 'pièce',
        quantite: 45,
      },
      p2: { nom: 'Quiche', type: 'Salé', categorie: 'Tartes', unite: 'pièce', quantite: 2.5 },
    },
  },
  '2026-10-26': {
    commandes: [
      {
        id: 'c3',
        client: 'Durand',
        heure: '08:00:00',
        couverts: 5,
        notes: null,
        produits: { p3: { quantite: 5, source: 'formule' } },
      },
    ],
    totaux: {
      p3: {
        nom: 'Pain au chocolat',
        type: 'sucré',
        categorie: 'Viennoiseries',
        unite: 'pièce',
        quantite: 5,
      },
    },
  },
}

describe('dates et nombres', () => {
  it('dateIso donne la date locale AAAA-MM-JJ (pas celle de Londres, comme toISOString)', () => {
    expect(dateIso(new Date(2026, 9, 26, 23, 30))).toBe('2026-10-26')
  })

  it('formate les dates et les jours', () => {
    expect(formaterDate('2026-10-26')).toBe('26/10/2026')
    expect(jourCourt('2026-10-26')).toBe('Lun')
    expect(jourCourt('2026-11-01')).toBe('Dim')
  })

  it('affiche les quantités entières sans virgule, les autres avec une décimale', () => {
    expect(formaterQuantite(40)).toBe('40')
    expect(formaterQuantite(2.5)).toBe('2,5')
    expect(formaterQuantite(2.04)).toBe('2')
  })
})

describe('numéros de semaine (norme ISO, comme les calendriers français)', () => {
  it.each([
    ['2026-10-26', 44], // lundi
    ['2026-11-01', 44], // dimanche : même semaine
    ['2026-11-02', 45],
    ['2026-01-01', 1], // jeudi 1er janvier : semaine 1
    ['2027-01-01', 53], // vendredi 1er janvier : dernière semaine de 2026
    ['2024-12-30', 1], // lundi 30 décembre : semaine 1 de 2025
  ])('%s → semaine %i', (date, semaine) => {
    expect(numeroSemaine(date)).toBe(semaine)
  })

  it('donne le libellé de la période', () => {
    expect(libelleSemaines('2026-10-26', '2026-11-01')).toBe('Semaine 44')
    expect(libelleSemaines('2026-10-26', '2026-11-03')).toBe('Semaines 44 et 45')
    expect(libelleSemaines('2026-10-26', '2026-11-12')).toBe('Semaines 44 à 46')
    expect(libelleSemaines('2026-11-01', '2026-11-09')).toBe('Semaines 44 à 46') // dimanche -> lundi suivant + 1
    expect(libelleSemaines('2026-12-28', '2027-01-04')).toBe('Semaines 53 et 1')
  })
})

describe('organisation du planning', () => {
  it('trie les jours par date', () => {
    expect(joursDuPlanning(PLANNING).map((j) => j.date)).toEqual(['2026-10-26', '2026-10-27'])
  })

  it('regroupe les produits par groupe (Sucré, Salé) puis par catégorie, triés par nom', () => {
    expect(produitsParGroupe(PLANNING)).toEqual([
      {
        groupe: 'Sucré',
        categories: [
          {
            nom: 'Viennoiseries',
            produits: [
              { id: 'p1', nom: 'Mini croissant', type: 'Sucré', unite: 'pièce' },
              { id: 'p3', nom: 'Pain au chocolat', type: 'sucré', unite: 'pièce' },
            ],
          },
        ],
      },
      {
        groupe: 'Salé',
        categories: [
          { nom: 'Tartes', produits: [{ id: 'p2', nom: 'Quiche', type: 'Salé', unite: 'pièce' }] },
        ],
      },
    ])
  })

  it('range dans « Autre » un produit sans type ni catégorie', () => {
    const planning = {
      '2026-10-26': { commandes: [], totaux: { p9: { nom: 'Café', unite: 'L' } } },
    }
    expect(produitsParGroupe(planning)).toEqual([
      {
        groupe: 'Autre',
        categories: [{ nom: 'Autre', produits: [{ id: 'p9', nom: 'Café', type: '', unite: 'L' }] }],
      },
    ])
  })

  it('calcule les quantités par commande, par jour et sur toute la période', () => {
    const jour27 = PLANNING['2026-10-27']
    expect(quantiteCommande(jour27.commandes[0], 'p1')).toBe(40)
    expect(quantiteCommande(jour27.commandes[0], 'p2')).toBeNull() // produit absent de la commande
    expect(totalJour(jour27, 'p1')).toBe(45)
    expect(totalJour(PLANNING['2026-10-26'], 'p1')).toBe(0)
    expect(totalGeneral(PLANNING, 'p1')).toBe(45)
  })
})

describe('convives', () => {
  it('mariage : adultes/enfants', () => {
    expect(convives({ couverts: 60, nb_adultes: 50, nb_enfants: 10 })).toBe('50/10')
    expect(convives({ couverts: 1, nb_adultes: 1, nb_enfants: 0 })).toBe('1/0')
  })
  it('autre commande : rien (on garde le nombre de couverts)', () => {
    expect(convives({ couverts: 20, nb_adultes: null, nb_enfants: null })).toBeNull()
    expect(convives({ couverts: 20 })).toBeNull()
  })
})
