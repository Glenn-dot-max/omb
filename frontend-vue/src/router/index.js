import { createRouter, createWebHistory } from 'vue-router'
import AccueilView from '../views/AccueilView.vue'
import { verifierAcces } from './garde'

const router = createRouter({
  // BASE_URL vaut '/app/' (cf. vite.config.js) : les adresses seront /app/...
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'accueil',
      component: AccueilView,
    },
    {
      path: '/mon-compte',
      name: 'mon-compte',
      // Chargée seulement quand on ouvre la page (fichier séparé, application plus légère au démarrage)
      component: () => import('../views/MonCompteView.vue'),
    },
    {
      path: '/aide',
      name: '/aide',
      component: () => import('../views/AideView.vue'),
    },
  ],
  // Liens vers une ancre (#commandes...): faire défiler jusqu'à la secion ; sinon revenir en haut
  scrollBehavior(to) {
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    return { top: 0 }
  },
})

// Avant chaque page : connecté ? mot de passe à changer ? droits suffisants .
router.beforeEach(verifierAcces)
export default router
