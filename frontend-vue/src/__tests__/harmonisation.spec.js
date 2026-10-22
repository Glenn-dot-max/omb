import { describe, it, expect } from 'vitest'

// Tous les composants Vue de l'application, lus comme du texte (fonction de Vite)
const fichiers = import.meta.glob('../**/*.vue', { query: '?raw', import: 'default', eager: true })

// Règle (V3.5) : les écrans Vue utilisent les composants PrimeVue, pas les anciennes classes
// de l'ancien frontend (.btn, .btn-secondary, .form-group), qui donneraient deux styles différents.
describe('Harmonisation PrimeVue', () => {
  it('trouve bien les composants à vérifier', () => {
    expect(Object.keys(fichiers).length).toBeGreaterThan(10)
  })

  it.each(Object.entries(fichiers))(
    "%s n'utilise pas les anciennes classes .btn / .form-group",
    (nom, contenu) => {
      expect(contenu).not.toMatch(/class="(btn|btn-secondary|form-group)\b/)
    },
  )
})
