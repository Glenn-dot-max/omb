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
  ],
})

// Avant chaque page : connecté ? mot de passe à changer ? droits suffisants .
router.beforeEach(verifierAcces)
export default router
