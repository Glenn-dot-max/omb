import { describe, it, expect } from 'vitest'
import ExcelJS from 'exceljs'
import { remplirFeuille, nomFichierPlanning } from '../exportPlanning'

const RESULTAT = {
  periode: { debut: '2026-10-26', fin: '2026-11-01' },
  commandes_count: 2,
  planning: {
    '2026-10-27': {
      commandes: [
        {
          id: 'c1',
          client: 'Dupont',
          heure: '09:00:00',
          couverts: 20,
          avec_service: false,
          notes: '',
          produits: {
            p1: { quantite: 40, source: 'formule' },
            p2: { quantite: 2.5, source: 'formule' },
          },
        },
        {
          id: 'c2',
          client: 'Martin',
          heure: '12:30:00',
          couverts: 10,
          avec_service: true,
          notes: 'Sans gluten',
          produits: {
            p1: { quantite: 5, source: 'suppl' },
            p3: { quantite: 1, source: 'formule' },
          },
        },
      ],
      totaux: {
        p1: { nom: 'Mini croissant', type: 'Sucré', categorie: 'Viennoiseries', unite: 'pièce' },
        p2: { nom: 'Quiche', type: 'Salé', categorie: 'Tartes', unite: 'pièce' },
        p3: { nom: 'Cake', type: 'Sucré', categorie: 'Gâteaux', unite: 'pièce' },
      },
    },
  },
}
const COULEURS = {
  entete: 'FF000001',
  sousEntete: 'FF000002',
  groupe: 'FF000003',
  categorie: 'FF000004',
  produit: 'FF000005',
  supplement: 'FF000006',
  totalJour: 'FF000007',
  totalPeriode: 'FF000008',
}

function feuille(options = {}) {
  const f = new ExcelJS.Workbook().addWorksheet('Planning')
  remplirFeuille(f, RESULTAT, { couleurs: COULEURS, ...options })
  return f
}
// Ligne dont la colonne C (Produit) commence par ce texte
const ligneProduit = (f, nom) => {
  let trouvee
  f.eachRow((ligne) => {
    if (String(ligne.getCell(3).value).startsWith(nom)) trouvee = ligne
  })
  return trouvee
}
// Colonnes : A Type, B Catégorie, C Produit, D Dupont, E Martin, F total du 27, G total période

describe('export Excel du planning', () => {
  it('titre, semaine et nombre de commandes en haut de la feuille', () => {
    const f = feuille()
    expect(f.getCell('A1').value).toBe('Planning de production du 26/10/2026 au 01/11/2026')
    expect(f.getCell('A2').value).toBe('Semaine 44 · 2 commande(s)')
  })

  it('une colonne par commande avec client, couverts, heure, service et notes', () => {
    const f = feuille()
    expect(f.getCell('D4').value).toBe('27/10 Mar')
    expect(['D5', 'D6', 'D7', 'D8'].map((c) => f.getCell(c).value)).toEqual([
      'Dupont',
      20,
      '09:00',
      'Sans',
    ])
    expect(['E5', 'E6', 'E7', 'E8'].map((c) => f.getCell(c).value)).toEqual([
      'Martin',
      10,
      '12:30',
      'Avec',
    ])
  })

  it('nomme chaque ligne d’en-tête dans la colonne Produit', () => {
    const f = feuille()
    expect(['C4', 'C5', 'C6', 'C7', 'C8', 'C9'].map((c) => f.getCell(c).value)).toEqual([
      'Produit',
      'Client',
      'Nombre de couverts',
      'Heure de livraison',
      'Service',
      'Notes',
    ])
  })

  it('met en rouge la case « Notes » des commandes qui ont une note, et seulement celles-là', () => {
    const f = feuille()
    expect(f.getCell('E9').value).toBe('VOIR NOTES')
    expect(f.getCell('E9').fill.fgColor.argb).toBe('FFD32F2F')
    expect(f.getCell('D9').value).toBe('')
    expect(f.getCell('D9').fill.fgColor.argb).toBe(COULEURS.sousEntete)
  })

  it('écrit les quantités en nombres, avec les totaux du jour et de la période', () => {
    const ligne = ligneProduit(feuille(), 'Mini croissant')
    expect([4, 5, 6, 7].map((c) => ligne.getCell(c).value)).toEqual([40, 5, 45, 45])
    expect(ligneProduit(feuille(), 'Quiche').getCell(4).value).toBe(2.5)
    expect(ligneProduit(feuille(), 'Quiche').getCell(5).value).toBe('-')
  })

  it('colore les produits ajoutés hors formule', () => {
    const ligne = ligneProduit(feuille(), 'Mini croissant')
    expect(ligne.getCell(4).fill).toBeUndefined() // Dupont : via une formule
    expect(ligne.getCell(5).fill.fgColor.argb).toBe(COULEURS.supplement) // Martin : ajouté
  })

  it('sépare chaque catégorie par un trait épais, sur toute la largeur du tableau', () => {
    // Groupe Sucré : Gâteaux (Cake) puis Viennoiseries (Mini croissant)
    const cake = ligneProduit(feuille(), 'Cake')
    expect(cake.getCell(2).value).toBe('Gâteaux')
    // de la colonne Catégorie (B) jusqu'à la dernière colonne (G, total période)
    expect([2, 3, 4, 5, 6, 7].map((c) => cake.getCell(c).border.bottom.style)).toEqual(
      Array(6).fill('thick'),
    )
    const ligne = ligneProduit(feuille(), 'Mini croissant')
    expect(ligne.getCell(5).border.top).toBeUndefined() // aucun trait fin ne le remplace
    expect(ligne.getCell(2).value).toBe('Viennoiseries')
    expect(ligne.getCell(3).border.bottom.style).toBe('thick') // dernière ligne du groupe Sucré
    const quiche = ligneProduit(feuille(), 'Quiche')
    expect(quiche.getCell(2).value).toBe('Tartes')
    expect(quiche.getCell(1).value).toBe('SALÉ')
  })

  it('sans les totaux : pas de colonnes de totaux', () => {
    const f = feuille({ afficherTotaux: false })
    const ligne = ligneProduit(f, 'Mini croissant')
    expect([4, 5].map((c) => ligne.getCell(c).value)).toEqual([40, 5])
    expect(ligne.getCell(6).value).toBeNull()
  })

  it('garde les en-têtes visibles en faisant défiler', () => {
    expect(feuille().views[0]).toMatchObject({ state: 'frozen', xSplit: 3, ySplit: 9 })
  })

  it('nomme le fichier avec la période et la catégorie', () => {
    expect(nomFichierPlanning(RESULTAT.periode)).toBe(
      'planning_production_2026-10-26_au_2026-11-01.xlsx',
    )
    expect(nomFichierPlanning(RESULTAT.periode, 'sucré')).toBe(
      'planning_production_2026-10-26_au_2026-11-01_sucré.xlsx',
    )
  })
})
