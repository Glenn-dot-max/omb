import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PrimeVue from 'primevue/config'
import Button from 'primevue/button'
import { presetMarque, optionsPrimeVue } from '../primevue'

describe('PrimeVue (thème de la marque)', () => {
  it('la couleur principale vient de nos variables CSS (marque blanche), pas d’une couleur en dur', () => {
    const primaire = presetMarque.semantic.primary
    for (const nuance of Object.values(primaire)) {
      expect(nuance).toMatch(/^var\(--color-/)
    }
  })

  it('un composant PrimeVue s’affiche avec nos options', () => {
    const wrapper = mount(Button, {
      props: { label: 'Enregistrer' },
      global: { plugins: [[PrimeVue, optionsPrimeVue]] },
    })
    expect(wrapper.text()).toContain('Enregistrer')
    expect(wrapper.classes()).toContain('p-button')
  })

  it('le choix actif des boutons de choix (SelectButton) prend la couleur principale', () => {
    const choix = presetMarque.components.togglebutton.colorScheme.light
    expect(choix.content.checkedBackground).toBe('{primary.color}')
    expect(choix.root.checkedColor).toBe('{primary.contrast.color}')
  })
})
