import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import AppNavbar from '../AppNavbar.vue'
import { useUtilisateurStore } from '@/stores/utilisateur'

vi.mock('@/api/client', () => ({ apiGet: vi.fn(), removeToken: vi.fn() }))
vi.mock('@/api/navigation', () => ({ allerALaConnexion: vi.fn() }))

// Une autre marque que celle d'OMB : la barre doit afficher celle de la configuration
vi.mock('@/config/marque', () => ({ marque: { nom: 'Traiteur Test', emoji: '🍽️' } }))

let pinia
let router

function monter(utilisateur) {
  const store = useUtilisateurStore()
  store.utilisateur = utilisateur
  return {
    wrapper: mount(AppNavbar, { global: { plugins: [pinia, router] }, attachTo: document.body }),
    store,
  }
}

beforeEach(() => {
  pinia = createPinia()
  setActivePinia(pinia)
  const page = { template: '<div />' }
  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'accueil', component: page },
      { path: '/mon-compte', name: 'mon-compte', component: page },
      { path: '/aide', name: 'aide', component: page },
      { path: '/admin', name: 'admin', component: page },
    ],
  })
})

describe('AppNavbar', () => {
  it('affiche le nom de la marque configurée, pas un nom écrit en dur', () => {
    const { wrapper } = monter({ email: 'admin@omb.fr', role: 'TECH_ADMIN', franchise_nom: null })
    expect(wrapper.text()).toContain('Traiteur Test')
    expect(wrapper.text()).not.toContain('Oh My Brunch')
    wrapper.unmount()
  })
  it('affiche au TECH_ADMIN le lien Admin, qui mène à la page Vue (sans recharger)', () => {
    const { wrapper } = monter({ email: 'admin@omb.fr', role: 'TECH_ADMIN', franchise_nom: null })
    const lien = wrapper.findAll('.nav-links a').find((a) => a.text().includes('Admin'))
    expect(lien.attributes('href')).toBe('/admin') // devient /app/admin dans le navigateur
    wrapper.unmount()
  })

  it('cache le lien Admin à un utilisateur de franchise et affiche sa franchise', () => {
    const { wrapper } = monter({ email: 'paris@omb.fr', role: 'USER', franchise_nom: 'Paris' })
    expect(wrapper.text()).not.toContain('Admin')
    expect(wrapper.text()).toContain('paris@omb.fr')
    expect(wrapper.text()).toContain('Paris')
    wrapper.unmount()
  })

  it('le bouton Déconnexion appelle la déconnexion', async () => {
    const { wrapper, store } = monter({
      email: 'paris@omb.fr',
      role: 'USER',
      franchise_nom: 'Paris',
    })
    const spy = vi.spyOn(store, 'deconnecter').mockImplementation(() => {})
    await wrapper.find('.logout-btn').trigger('click')
    expect(spy).toHaveBeenCalledOnce()
    wrapper.unmount()
  })
  it('le menu « Mon compte » ouvre la page Vue Mon compte', async () => {
    const { wrapper } = monter({ email: 'paris@omb.fr', role: 'USER', franchise_nom: 'Paris' })
    await wrapper.find('.menu-btn').trigger('click')
    await router.isReady()
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('mon-compte')
    wrapper.unmount()
  })
  it('le lien Aide mène à la page Vue (sans recharger)', () => {
    const { wrapper } = monter({ email: 'paris@omb.fr', role: 'USER', franchise_nom: 'Paris' })
    const lien = wrapper.findAll('.nav-links a').find((a) => a.text().includes('Aide'))
    expect(lien.attributes('href')).toBe('/aide') // Adresse du routeur (devient /app/aide dans le naviguateur)
    wrapper.unmount()
  })
})
