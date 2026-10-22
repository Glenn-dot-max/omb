import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import Select from 'primevue/select'
import OngletUtilisateurs from '../OngletUtilisateurs.vue'
import { useNotificationsStore } from '@/stores/notifications'
import { useUtilisateurStore } from '@/stores/utilisateur'
import { apiGet, apiPost, apiPut, apiDelete, ApiError } from '@/api/client'

vi.mock('@/api/client', async () => {
  const vrai = await vi.importActual('@/api/client')
  return {
    ApiError: vrai.ApiError,
    apiGet: vi.fn(),
    apiPost: vi.fn(),
    apiPut: vi.fn(),
    apiDelete: vi.fn(),
  }
})
vi.mock('@/api/navigation', () => ({ allerALaConnexion: vi.fn() }))
// La fenêtre de confirmation est simulée : « Oui » est cliqué automatiquement
const confirmer = vi.fn((options) => options.accept())
vi.mock('primevue/useconfirm', () => ({ useConfirm: () => ({ require: confirmer }) }))
// Mot de passe généré prévisible dans les tests
vi.mock('@/utils/motDePasse', async () => {
  const vrai = await vi.importActual('@/utils/motDePasse')
  return { ...vrai, genererMotDePasse: vi.fn(() => 'Provisoire23') }
})

const PARIS = { id: 'f-1', nom: 'OMB Paris', active: true }
const LYON = { id: 'f-2', nom: 'OMB Lyon', active: false }
const MOI = {
  id: 'admin-1',
  email: 'admin@omb.fr',
  full_name: 'Glenn',
  role: 'TECH_ADMIN',
  franchise_id: null,
  active: true,
}
const JEAN = {
  id: 'u-1',
  email: 'jean@omb.fr',
  full_name: 'Jean',
  role: 'USER',
  franchise_id: 'f-1',
  franchises: { nom: 'OMB Paris' },
  active: true,
}
const ZOE = {
  id: 'u-2',
  email: 'zoe@omb.fr',
  full_name: 'Zoé',
  role: 'user',
  franchise_id: 'f-2',
  franchises: { nom: 'OMB Lyon' },
  active: false,
}

let wrapper
async function monter() {
  useUtilisateurStore().utilisateur = { id: 'admin-1', role: 'TECH_ADMIN' }
  wrapper = mount(OngletUtilisateurs, { attachTo: document.body })
  await flushPromises()
  return wrapper
}
const champ = (id) => document.getElementById(id)
async function saisir(id, valeur) {
  champ(id).value = valeur
  champ(id).dispatchEvent(new Event('input'))
  await flushPromises()
}
// Choisir une valeur dans une liste déroulante PrimeVue (repérée par son input-id)
async function choisir(inputId, valeur) {
  const liste = wrapper.findAllComponents(Select).find((s) => s.props('inputId') === inputId)
  liste.vm.$emit('update:modelValue', valeur)
  await flushPromises()
}
async function cliquer(texte) {
  const bouton = [...document.querySelectorAll('button')].find(
    (b) => b.textContent.trim() === texte,
  )
  bouton.click()
  await flushPromises()
}
async function envoyer() {
  champ('formulaire-utilisateur').dispatchEvent(new Event('submit'))
  await flushPromises()
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  apiGet.mockImplementation(async (url) =>
    url === '/admin/users' ? [MOI, JEAN, ZOE] : [PARIS, LYON],
  )
})
afterEach(() => wrapper?.unmount())

describe('OngletUtilisateurs : liste', () => {
  it('affiche les utilisateurs avec franchise, rôle (même en minuscules) et statut', async () => {
    await monter()
    expect(apiGet).toHaveBeenCalledWith('/admin/users')
    expect(apiGet).toHaveBeenCalledWith('/admin/franchises')
    const texte = wrapper.text()
    expect(texte).toContain('jean@omb.fr')
    expect(texte).toContain('OMB Paris')
    expect(texte).toContain('Administrateur')
    expect(texte).toContain('Utilisateur')
    expect(texte).toContain('Inactif')
  })

  it('filtre par franchise', async () => {
    await monter()
    await choisir('filtre-franchise', 'f-1')
    expect(wrapper.text()).toContain('jean@omb.fr')
    expect(wrapper.text()).not.toContain('zoe@omb.fr')

    await choisir('filtre-franchise', null) // « Toutes les franchises »
    expect(wrapper.text()).toContain('zoe@omb.fr')
  })

  it("n'affiche pas le bouton Désactiver sur son propre compte", async () => {
    await monter()
    expect(wrapper.find('[data-test="statut-admin-1"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="statut-u-1"]').exists()).toBe(true)
  })
})

describe('OngletUtilisateurs : création et modification', () => {
  it('crée un utilisateur avec le mot de passe généré, puis affiche ce mot de passe', async () => {
    apiPost.mockResolvedValue({ id: 'u-3' })
    await monter()
    await cliquer('Nouvel utilisateur')

    expect(champ('utilisateur-mot-de-passe').value).toBe('Provisoire23')
    await saisir('utilisateur-email', ' marie@omb.fr ')
    await saisir('utilisateur-nom', 'Marie')
    await choisir('utilisateur-franchise', 'f-1')
    await envoyer()

    expect(apiPost).toHaveBeenCalledWith('/admin/users', {
      email: 'marie@omb.fr',
      full_name: 'Marie',
      role: 'USER',
      franchise_id: 'f-1',
      password: 'Provisoire23',
    })
    expect(champ('mot-de-passe-provisoire').textContent).toBe('Provisoire23')
  })

  it('refuse un utilisateur (rôle USER) sans franchise', async () => {
    await monter()
    await cliquer('Nouvel utilisateur')
    await saisir('utilisateur-email', 'marie@omb.fr')
    await saisir('utilisateur-nom', 'Marie')
    await envoyer()

    expect(apiPost).not.toHaveBeenCalled()
    expect(useNotificationsStore().notifications[0]).toMatchObject({ type: 'error' })
  })

  it('accepte un administrateur du catalogue sans franchise', async () => {
    apiPost.mockResolvedValue({ id: 'u-3' })
    await monter()
    await cliquer('Nouvel utilisateur')
    await saisir('utilisateur-email', 'cat@omb.fr')
    await saisir('utilisateur-nom', 'Catalogue')
    await choisir('utilisateur-role', 'CATALOG_ADMIN')
    await envoyer()

    expect(apiPost).toHaveBeenCalledWith(
      '/admin/users',
      expect.objectContaining({ role: 'CATALOG_ADMIN', franchise_id: null }),
    )
  })

  it('refuse un mot de passe provisoire trop faible', async () => {
    await monter()
    await cliquer('Nouvel utilisateur')
    await saisir('utilisateur-email', 'marie@omb.fr')
    await saisir('utilisateur-nom', 'Marie')
    await choisir('utilisateur-franchise', 'f-1')
    await saisir('utilisateur-mot-de-passe', 'faible')
    await envoyer()

    expect(apiPost).not.toHaveBeenCalled()
  })

  it('modifie un utilisateur : pré-rempli, PUT sans mot de passe, rôle remis en majuscules', async () => {
    apiPut.mockResolvedValue(ZOE)
    await monter()
    await wrapper.find('[data-test="modifier-u-2"]').trigger('click')
    await flushPromises()

    expect(champ('utilisateur-email').value).toBe('zoe@omb.fr')
    expect(champ('utilisateur-mot-de-passe')).toBeNull() // pas de mot de passe en modification
    await saisir('utilisateur-nom', 'Zoé Martin')
    await envoyer()

    expect(apiPut).toHaveBeenCalledWith('/admin/users/u-2', {
      email: 'zoe@omb.fr',
      full_name: 'Zoé Martin',
      role: 'USER',
      franchise_id: 'f-2',
    })
  })

  it('bloque le changement de rôle sur son propre compte', async () => {
    await monter()
    await wrapper.find('[data-test="modifier-admin-1"]').trigger('click')
    await flushPromises()
    const role = wrapper
      .findAllComponents(Select)
      .find((s) => s.props('inputId') === 'utilisateur-role')
    expect(role.props('disabled')).toBe(true)
  })

  it("affiche l'erreur du serveur si la création échoue", async () => {
    apiPost.mockRejectedValue(new ApiError('Email déjà utilisé', 400))
    await monter()
    await cliquer('Nouvel utilisateur')
    await saisir('utilisateur-email', 'jean@omb.fr')
    await saisir('utilisateur-nom', 'Jean')
    await choisir('utilisateur-franchise', 'f-1')
    await envoyer()

    expect(useNotificationsStore().notifications[0]).toMatchObject({
      type: 'error',
      message: 'Email déjà utilisé',
    })
    expect(champ('mot-de-passe-provisoire')).toBeNull()
  })
})

describe('OngletUtilisateurs : mot de passe et statut', () => {
  it('réinitialise le mot de passe après confirmation, et affiche le nouveau', async () => {
    apiPost.mockResolvedValue({ message: 'ok' })
    await monter()
    await wrapper.find('[data-test="mot-de-passe-u-1"]').trigger('click')
    await flushPromises()

    expect(confirmer).toHaveBeenCalledTimes(1)
    expect(apiPost).toHaveBeenCalledWith('/admin/users/u-1/reset-password', {
      new_password: 'Provisoire23',
    })
    expect(champ('mot-de-passe-provisoire').textContent).toBe('Provisoire23')
  })

  it('ne réinitialise rien si on annule', async () => {
    confirmer.mockImplementationOnce(() => {})
    await monter()
    await wrapper.find('[data-test="mot-de-passe-u-1"]').trigger('click')
    await flushPromises()
    expect(apiPost).not.toHaveBeenCalled()
  })

  it('copie le mot de passe affiché', async () => {
    const ecrire = vi.fn().mockResolvedValue()
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: ecrire },
      configurable: true,
    })
    apiPost.mockResolvedValue({ message: 'ok' })
    await monter()
    await wrapper.find('[data-test="mot-de-passe-u-1"]').trigger('click')
    await flushPromises()
    await cliquer('Copier')

    expect(ecrire).toHaveBeenCalledWith('Provisoire23')
  })

  it('désactive (DELETE) un compte actif et réactive (PUT) un compte inactif', async () => {
    apiDelete.mockResolvedValue({ message: 'ok' })
    apiPut.mockResolvedValue(ZOE)
    await monter()
    await wrapper.find('[data-test="statut-u-1"]').trigger('click')
    await flushPromises()
    await wrapper.find('[data-test="statut-u-2"]').trigger('click')
    await flushPromises()

    expect(apiDelete).toHaveBeenCalledWith('/admin/users/u-1')
    expect(apiPut).toHaveBeenCalledWith('/admin/users/u-2', { active: true })
  })
})
