import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import OngletFranchises from '../OngletFranchises.vue'
import { useNotificationsStore } from '@/stores/notifications'
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
// La fenêtre de confirmation est simulée : « Oui » est cliqué automatiquement
const confirmer = vi.fn((options) => options.accept())
vi.mock('primevue/useconfirm', () => ({ useConfirm: () => ({ require: confirmer }) }))

const PARIS = {
  id: 'f-1',
  nom: 'OMB Paris',
  city: 'Paris',
  email: null,
  phone: null,
  address: null,
  active: true,
}
const CAEN = {
  id: 'f-2',
  nom: 'OMB Caen',
  city: null,
  email: 'caen@omb.fr',
  phone: null,
  address: null,
  active: false,
}

let wrapper
async function monter() {
  // attachTo : la fenêtre (Dialog) s'affiche dans document.body, hors du composant
  wrapper = mount(OngletFranchises, { attachTo: document.body })
  await flushPromises()
  return wrapper
}
const champ = (id) => document.getElementById(id)
async function saisir(id, valeur) {
  const element = champ(id)
  element.value = valeur
  element.dispatchEvent(new Event('input'))
  await flushPromises()
}
async function envoyer() {
  champ('formulaire-franchise').dispatchEvent(new Event('submit'))
  await flushPromises()
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  apiGet.mockResolvedValue([PARIS, CAEN])
})
afterEach(() => wrapper?.unmount())

describe('OngletFranchises', () => {
  it('affiche les franchises chargées depuis le serveur, avec leur statut', async () => {
    await monter()
    expect(apiGet).toHaveBeenCalledWith('/admin/franchises')
    expect(wrapper.text()).toContain('OMB Paris')
    expect(wrapper.text()).toContain('caen@omb.fr')
    expect(wrapper.text()).toContain('Active')
    expect(wrapper.text()).toContain('Inactive')
  })

  it('affiche une erreur si le chargement échoue', async () => {
    apiGet.mockRejectedValue(new ApiError('Serveur injoignable', 0))
    await monter()
    expect(useNotificationsStore().notifications[0]).toMatchObject({
      type: 'error',
      message: 'Serveur injoignable',
    })
  })

  it('crée une franchise : seuls les champs attendus, vides envoyés en null', async () => {
    apiPost.mockResolvedValue({ id: 'f-3' })
    await monter()
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Nouvelle franchise')
      .trigger('click')
    await flushPromises()

    await saisir('franchise-nom', '  OMB Rouen  ')
    await saisir('franchise-ville', 'Rouen')
    await envoyer()

    expect(apiPost).toHaveBeenCalledWith('/admin/franchises', {
      nom: 'OMB Rouen',
      city: 'Rouen',
      address: null,
      phone: null,
      email: null,
    })
    expect(apiGet).toHaveBeenCalledTimes(2) // liste rechargée
    expect(useNotificationsStore().notifications[0]).toMatchObject({ type: 'success' })
  })

  it("refuse d'envoyer une franchise sans nom", async () => {
    await monter()
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Nouvelle franchise')
      .trigger('click')
    await flushPromises()

    await saisir('franchise-nom', '   ')
    await envoyer()

    expect(apiPost).not.toHaveBeenCalled()
    expect(useNotificationsStore().notifications[0]).toMatchObject({ type: 'error' })
  })

  it('modifie une franchise : formulaire pré-rempli, envoi en PUT', async () => {
    apiPut.mockResolvedValue(PARIS)
    await monter()
    await wrapper.find('[data-test="modifier-f-1"]').trigger('click')
    await flushPromises()

    expect(champ('franchise-nom').value).toBe('OMB Paris')
    expect(champ('franchise-ville').value).toBe('Paris')
    await saisir('franchise-telephone', '01 02 03 04 05')
    await envoyer()

    expect(apiPut).toHaveBeenCalledWith('/admin/franchises/f-1', {
      nom: 'OMB Paris',
      city: 'Paris',
      address: null,
      phone: '01 02 03 04 05',
      email: null,
    })
    expect(apiPost).not.toHaveBeenCalled()
  })

  it("garde la fenêtre ouverte et affiche l'erreur du serveur si l'enregistrement échoue", async () => {
    apiPost.mockRejectedValue(new ApiError('Le nom contient des caractères non autorisés', 422))
    await monter()
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Nouvelle franchise')
      .trigger('click')
    await flushPromises()
    await saisir('franchise-nom', 'OMB Lille')
    await envoyer()

    expect(useNotificationsStore().notifications[0]).toMatchObject({
      type: 'error',
      message: 'Le nom contient des caractères non autorisés',
    })
    expect(champ('franchise-nom')).not.toBeNull() // fenêtre toujours ouverte, saisie conservée
  })

  it('désactive une franchise active (DELETE), après confirmation', async () => {
    apiDelete.mockResolvedValue({ message: 'ok' })
    await monter()
    await wrapper.find('[data-test="statut-f-1"]').trigger('click')
    await flushPromises()

    expect(confirmer).toHaveBeenCalledTimes(1)
    expect(apiDelete).toHaveBeenCalledWith('/admin/franchises/f-1')
    expect(apiPut).not.toHaveBeenCalled()
  })

  it('réactive une franchise inactive (PUT active: true), après confirmation', async () => {
    apiPut.mockResolvedValue(CAEN)
    await monter()
    await wrapper.find('[data-test="statut-f-2"]').trigger('click')
    await flushPromises()

    expect(apiPut).toHaveBeenCalledWith('/admin/franchises/f-2', { active: true })
    expect(apiDelete).not.toHaveBeenCalled()
  })

  it("ne change rien si l'utilisateur refuse la confirmation", async () => {
    confirmer.mockImplementationOnce(() => {}) // « Annuler » : accept n'est pas appelé
    await monter()
    await wrapper.find('[data-test="statut-f-1"]').trigger('click')
    await flushPromises()

    expect(apiDelete).not.toHaveBeenCalled()
  })
})
