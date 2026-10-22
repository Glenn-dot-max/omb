import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TableauPlanning from '../TableauPlanning.vue'

const PLANNING = {
  '2026-10-27': {
    commandes: [
      {
        id: 'c1',
        client: 'Dupont',
        heure: '09:00:00',
        produits: { p1: { quantite: 40, source: 'formule' } },
      },
      {
        id: 'c2',
        client: '<b>Martin</b>',
        heure: '12:30:00',
        produits: {
          p1: { quantite: 5, source: 'suppl' },
          p2: { quantite: 2.5, source: 'formule' },
        },
      },
    ],
    totaux: {
      p1: { nom: 'Mini croissant', type: 'Sucré', categorie: 'Viennoiseries', unite: 'pièce' },
      p2: { nom: 'Quiche', type: 'Salé', categorie: 'Tartes', unite: 'pièce' },
    },
  },
  '2026-10-28': {
    commandes: [
      {
        id: 'c3',
        client: 'Durand',
        heure: '08:00:00',
        produits: { p1: { quantite: 10, source: 'formule' } },
      },
    ],
    totaux: {
      p1: { nom: 'Mini croissant', type: 'Sucré', categorie: 'Viennoiseries', unite: 'pièce' },
    },
  },
}

const monter = (props = {}) => mount(TableauPlanning, { props: { planning: PLANNING, ...props } })
// Textes des cellules d'une ligne de produit
const cellules = (wrapper, produitId) =>
  wrapper
    .find(`[data-produit="${produitId}"]`)
    .findAll('td')
    .map((td) => td.text())

describe('TableauPlanning', () => {
  it('affiche les jours, les clients avec leur heure, les groupes et les catégories', () => {
    const texte = monter().text()
    expect(texte).toContain('27/10')
    expect(texte).toContain('Mar')
    expect(texte).toContain('Dupont')
    expect(texte).toContain('12:30')
    expect(texte).toContain('Sucré')
    expect(texte).toContain('Viennoiseries')
    expect(texte).toContain('Salé')
    expect(texte).toContain('Tartes')
  })

  it('affiche les quantités par commande, le total du jour et le total de la période', () => {
    // colonnes : Dupont, Martin, total du 27 | Durand, total du 28 | total période
    expect(cellules(monter(), 'p1')).toEqual(['40', '5', '45', '10', '10', '55'])
    expect(cellules(monter(), 'p2')).toEqual(['-', '2,5', '2,5', '-', '-', '2,5'])
  })

  it('cache les colonnes de totaux si demandé', () => {
    expect(cellules(monter({ afficherTotaux: false }), 'p1')).toEqual(['40', '5', '10'])
    expect(monter({ afficherTotaux: false }).text()).not.toContain('Total')
  })

  it('distingue les produits de formule et ceux ajoutés à la commande, avec une légende', () => {
    const wrapper = monter()
    const ligne = wrapper.find('[data-produit="p1"]').findAll('td')
    expect(ligne[0].classes()).not.toContain('supplement') // Dupont : 40 via une formule
    expect(ligne[1].classes()).toContain('supplement') // Martin : 5 ajoutés à la commande
    expect(wrapper.find('.legende').text()).toContain("Produit d'une formule")
    expect(wrapper.find('.legende').text()).toContain('Produit ajouté à la commande')
  })

  it('affiche un nom de client comme du texte, sans interpréter le HTML', () => {
    const wrapper = monter()
    expect(wrapper.text()).toContain('<b>Martin</b>')
    expect(wrapper.find('thead b').exists()).toBe(false)
  })
})
