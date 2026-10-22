import { definePreset } from '@primeuix/themes'
import Aura from '@primeuix/themes/aura'

// Thème PrimeVue branché sur NOS couleurs (frontend/css/theme.css) : marque blanche.
// Changer les couleurs de theme.css change aussi celles des composants PrimeVue.
export const presetMarque = definePreset(Aura, {
  semantic: {
    primary: {
      50: 'var(--color-bg-warm)',
      100: 'var(--color-bg-cream)',
      200: 'var(--color-border-warm)',
      300: 'var(--color-primary-bright)',
      400: 'var(--color-primary)',
      500: 'var(--color-primary)',
      600: 'var(--color-primary-hover)',
      700: 'var(--color-primary-deep)',
      800: 'var(--color-brand-light)',
      900: 'var(--color-brand)',
      950: 'var(--color-brand-dark)',
    },
    colorScheme: {
      light: {
        primary: {
          color: 'var(--color-primary)',
          contrastColor: 'var(--color-brand-dark)', // texte brun sur fond doré, comme les boutons actuels
          hoverColor: 'var(--color-primary-hover)',
          activeColor: 'var(--color-primary-deep)',
        },
      },
    },
  },
  components: {
    // Choix à boutons (SelectButton : service, note, onglets) : le choix actif en doré,
    // comme les boutons principaux, au lieu du blanc sur gris d'Aura
    togglebutton: {
      colorScheme: {
        light: {
          root: { checkedColor: '{primary.contrast.color}' },
          content: { checkedBackground: '{primary.color}' },
        },
      },
    },
  },
})

// Options communes à l'application ET aux tests
export const optionsPrimeVue = {
  theme: {
    preset: presetMarque,
    // Pas de mode sombre automatique : même apparence que le reste de l'application
    options: { darkModeSelector: false },
  },
}
