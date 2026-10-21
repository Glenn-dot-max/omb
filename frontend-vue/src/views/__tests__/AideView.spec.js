import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import AideView from '../AideView.vue'

// Une autre marque : le texte de l'aide doit suivre la configuration (marque blanche)
vi.mock('@/config/marque', () => ({ marque: { nom: 'Traiteur Test', emoji: '🍽️' } }))

describe('AideView', () => {
  it('affiche le sommaire et une section par rubrique', () => {
    const wrapper = mount(AideView)
    const liens = wrapper.findAll('.toc a').map((a) => a.attributes('href'))
    expect(liens).toEqual(['#commandes', '#produits', '#formules', '#planning', '#compte', '#admin'])
    for (const ancre of liens) {
      expect(wrapper.find(ancre).exists(), `section ${ancre}`).toBe(true)
    }
  })

  it('utilise le nom de la marque configurée', () => {
    const wrapper = mount(AideView)
    expect(wrapper.text()).toContain("Guide d'utilisation de l'application Traiteur Test")
    expect(wrapper.text()).not.toContain('Oh My Brunch')
  })
})
