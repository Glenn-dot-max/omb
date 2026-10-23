import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import ConnexionView from '../ConnexionView.vue'
import { apiPostPublic, saveToken, saveUser, getToken, ApiError } from '@/api/client'

vi.mock('@/api/client', async () => {
  const vrai = await vi.importActual('@/api/client')
  return {
    ApiError: vrai.ApiError,
    apiPostPublic: vi.fn(),
    saveToken: vi.fn(),
    saveUser: vi.fn(),
    getToken: vi.fn(),
  }
})
vi.mock('@/api/navigation', () => ({ allerALaConnexion: vi.fn() }))
// Une autre marque que celle d'OMB : la page doit afficher celle de la configuration
vi.mock('@/config/marque', () => ({ marque: { nom: 'Traiteur Test', emoji: '🍽️' } }))

const UTILISATEUR = { id: 'u-1', email: 'paris@omb.fr', role: 'USER', must_change_password: false }

let wrapper
let router
async function monter() {
  const page = { template: '<div />' }
  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/connexion', name: 'connexion', component: ConnexionView },
      { path: '/commandes', name: 'commandes', component: page },
      { path: '/changer-mot-de-passe', name: 'changer-mot-de-passe', component: page },
    ],
  })
  router.push('/connexion')
  await router.isReady()
  wrapper = mount(ConnexionView, { global: { plugins: [router] }, attachTo: document.body })
  await flushPromises()
}
async function seConnecter(email, motDePasse) {
  await wrapper.find('#connexion-email').setValue(email)
  await wrapper.find('#connexion-mot-de-passe').setValue(motDePasse)
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}
const pageActuelle = () => router.currentRoute.value.name

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  getToken.mockReturnValue(null)
})
afterEach(() => wrapper?.unmount())

describe('ConnexionView', () => {
  it('affiche le nom de la marque configurée', async () => {
    await monter()
    expect(wrapper.text()).toContain('Traiteur Test')
  })

  it('connexion réussie : token et utilisateur enregistrés, puis les commandes', async () => {
    apiPostPublic.mockResolvedValue({ access_token: 'jeton-1', user: UTILISATEUR })
    await monter()
    await seConnecter('  paris@omb.fr ', 'MotDePasse1!')

    expect(apiPostPublic).toHaveBeenCalledWith('/auth/login', {
      email: 'paris@omb.fr',
      password: 'MotDePasse1!',
    })
    expect(saveToken).toHaveBeenCalledWith('jeton-1')
    expect(saveUser).toHaveBeenCalledWith(UTILISATEUR)
    expect(pageActuelle()).toBe('commandes')
  })

  it('mot de passe provisoire : la page pour le changer', async () => {
    apiPostPublic.mockResolvedValue({
      access_token: 'jeton-1',
      user: { ...UTILISATEUR, must_change_password: true },
    })
    await monter()
    await seConnecter('paris@omb.fr', 'Provisoire1!')
    expect(pageActuelle()).toBe('changer-mot-de-passe')
  })

  it('mauvais mot de passe ou compte désactivé : le message du serveur, on reste ici', async () => {
    apiPostPublic.mockRejectedValue(
      new ApiError('Compte désactivé : contactez votre administrateur.', 403),
    )
    await monter()
    await seConnecter('paris@omb.fr', 'faux')

    expect(wrapper.find('[role="alert"]').text()).toContain('Compte désactivé')
    expect(saveToken).not.toHaveBeenCalled()
    expect(pageActuelle()).toBe('connexion')
  })

  it('déjà connecté : directement les commandes', async () => {
    getToken.mockReturnValue('jeton-existant')
    await monter()
    expect(pageActuelle()).toBe('commandes')
  })
})
