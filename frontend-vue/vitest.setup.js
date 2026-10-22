// Préparation commune à tous les tests (déclarée dans vitest.config.js, setupFiles).
// jsdom (le faux navigateur des tests) n'a pas certaines fonctions du vrai navigateur
// utilisées par les composants PrimeVue : on les remplace par des versions vides.
import { vi } from 'vitest'

// Utilisé par Select, DatePicker… pour savoir si l'écran est petit
window.matchMedia ??= vi.fn((requete) => ({
  matches: false,
  media: requete,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  addListener: vi.fn(),
  removeListener: vi.fn(),
}))

// PrimeVue installé pour rous les composants montés dans les tests (comme app.use dans main.js)
import { config } from '@vue/test-utils'
import PrimeVue from 'primevue/config'
config.global.plugins.push(PrimeVue)
