import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ListeHistorique from '../ListeHistorique.vue'

const LIGNES = [
  {
    action: 'modification',
    details: { champs: { nombre_couverts: 25 } },
    auteur: 'Marie Durand',
    created_at: '2026-10-23T14:30:00+00:00',
  },
  {
    action: 'validation',
    details: {},
    auteur: 'Marie Durand',
    created_at: '2026-10-23T12:00:00+00:00',
  },
]

describe('ListeHistorique', () => {
  it('tout déplié (panneau de la fenêtre de commande) : détail visible, sans flèche', () => {
    const wrapper = mount(ListeHistorique, { props: { lignes: LIGNES, toutDeplie: true } })
    expect(wrapper.text()).toContain('Couverts → 25')
    expect(wrapper.find('[data-test^="deplier"]').exists()).toBe(false)
  })

  it('pas de flèche pour une étape sans détail (validation)', () => {
    const wrapper = mount(ListeHistorique, { props: { lignes: LIGNES } })
    expect(wrapper.find('[data-test="deplier-0"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="deplier-1"]').exists()).toBe(false)
  })
})
