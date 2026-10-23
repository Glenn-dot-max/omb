import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import Select from 'primevue/select'
import SelectButton from 'primevue/selectbutton'
import CommandesView from '../CommandesView.vue'
import { useUtilisateurStore } from '@/stores/utilisateur'
import { useNotificationsStore } from '@/stores/notifications'
import { apiGet, apiPost, apiPatch, apiDelete, ApiError } from '@/api/client'

vi.mock('@/api/client', async () => {
  const vrai = await vi.importActual('@/api/client')
  return {
    ApiError: vrai.ApiError,
    apiGet: vi.fn(),
    apiPost: vi.fn(),
    apiPatch: vi.fn(),
    apiDelete: vi.fn(),
  }
})
vi.mock('@/api/navigation', () => ({ allerALaConnexion: vi.fn() }))
const confirmer = vi.fn((options) => options.accept())
vi.mock('primevue/useconfirm', () => ({ useConfirm: () => ({ require: confirmer }) }))

const cmd = (id, date, champs = {}) => ({
  id,
  nom_client: `Client ${id}`,
  delivery_date: date,
  delivery_hour: '10:00:00',
  nombre_couverts: 10,
  validated: true,
  ...champs,
})
// Mercredi 21/10/2026, date de Paris donnée par le serveur
const ACTIVES = {
  commandes: [
    cmd('a', '2026-10-21', { nom_client: 'Mairie de Caen' }),
    cmd('b', '2026-10-24', { nom_client: "L'Équipe" }),
    cmd('c', '2026-11-20', { validated: false }),
  ],
  paris_date: '2026-10-21',
}
const ARCHIVEES = [cmd('x', '2026-09-01'), cmd('y', '2026-10-01')]

let wrapper
async function monter(role = 'USER') {
  useUtilisateurStore().utilisateur = { id: 'u-1', role, franchise_id: 'f-1' }
  wrapper = mount(CommandesView, { attachTo: document.body })
  await flushPromises()
  return wrapper
}
const appelsGet = () => apiGet.mock.calls.map(([url]) => url)
const blocs = () => wrapper.findAll('[data-bloc]').map((b) => b.attributes('data-bloc'))
async function choisir(composant, valeur, inputId) {
  const liste = wrapper.findAllComponents(composant)
  const cible = inputId ? liste.find((c) => c.props('inputId') === inputId) : liste[0]
  cible.vm.$emit('update:modelValue', valeur)
  await flushPromises()
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  apiPost.mockResolvedValue({ count: 0 })
  apiGet.mockImplementation(async (url) => {
    if (url === '/admin/franchises') return [{ id: 'f-2', nom: 'OMB Lyon' }]
    if (url.includes('archived=true') || url === '/commandes/archived') return ARCHIVEES
    if (url === '/commandes/b') return ACTIVES.commandes[1] // ouverture en modification
    if (url.startsWith('/commande-')) return [] // formules et produits de la commande
    if (['/formules/', '/produits/', '/unite/'].includes(url)) return [] // catalogue
    return ACTIVES
  })
})
afterEach(() => wrapper?.unmount())

describe('CommandesView', () => {
  it('archive d’abord les commandes passées, puis affiche les actives en blocs', async () => {
    await monter()
    expect(apiPost).toHaveBeenCalledWith('/commandes/auto-archive', {})
    expect(appelsGet()).toEqual(['/commandes/'])
    expect(blocs()).toEqual(['prochains', 'semaine', 'plusTard'])
    expect(wrapper.text()).toContain('Prochains jours')
    expect(wrapper.text()).toContain('3 commandes')
  })

  it('affiche quand même la liste si l’archivage automatique échoue', async () => {
    apiPost.mockRejectedValue(new ApiError('Erreur', 500))
    await monter()
    expect(wrapper.text()).toContain('Mairie de Caen')
  })

  it('recherche un client (contient, sans accents)', async () => {
    await monter()
    await wrapper.find('#commandes-recherche').setValue('equipe')
    expect(wrapper.text()).toContain("L'Équipe")
    expect(wrapper.text()).not.toContain('Mairie de Caen')
    expect(wrapper.text()).toContain('1 commande')
  })

  it('onglet Archivées : sans archivage automatique, la plus récente d’abord', async () => {
    await monter()
    apiPost.mockClear()
    await choisir(SelectButton, 'archivees')
    expect(apiPost).not.toHaveBeenCalled()
    expect(appelsGet()).toContain('/commandes/archived')
    const clients = wrapper.findAll('.client').map((c) => c.text())
    expect(clients).toEqual(['Client y', 'Client x'])
    expect(wrapper.find('button[data-test^="supprimer"]').exists()).toBe(false)
  })

  it('TECH_ADMIN : filtre par franchise avec la route de l’admin', async () => {
    await monter('TECH_ADMIN')
    await choisir(Select, 'f-2', 'commandes-franchise')
    expect(appelsGet()).toContain('/admin/franchises/f-2/commandes?archived=false')
  })

  it('utilisateur de franchise : pas de filtre franchise', async () => {
    await monter('USER')
    expect(wrapper.find('#commandes-franchise').exists()).toBe(false)
    expect(appelsGet()).not.toContain('/admin/franchises')
  })

  it('valide une commande en attente, puis recharge', async () => {
    apiPatch.mockResolvedValue({})
    await monter()
    // la commande « c » est dans « Plus tard », replié : on le déplie
    await wrapper.find('[data-bloc="plusTard"] button').trigger('click')
    await wrapper.find('[data-test="valider-c"]').trigger('click')
    await flushPromises()
    expect(apiPatch).toHaveBeenCalledWith('/commandes/c/validate')
    expect(appelsGet().filter((u) => u === '/commandes/')).toHaveLength(2)
  })

  it('supprime une commande après confirmation', async () => {
    apiDelete.mockResolvedValue({})
    await monter()
    await wrapper.find('[data-test="supprimer-a"]').trigger('click')
    await flushPromises()
    expect(confirmer).toHaveBeenCalledTimes(1)
    expect(apiDelete).toHaveBeenCalledWith('/commandes/a')
  })

  it('ne supprime rien si on annule', async () => {
    confirmer.mockImplementationOnce(() => {})
    await monter()
    await wrapper.find('[data-test="supprimer-a"]').trigger('click')
    await flushPromises()
    expect(apiDelete).not.toHaveBeenCalled()
  })

  it('« Nouvelle commande » ouvre le formulaire', async () => {
    await monter()
    expect(document.getElementById('commande-client')).toBeNull()
    await wrapper.find('[data-test="nouvelle-commande"]').trigger('click')
    await flushPromises()
    expect(document.getElementById('commande-client')).not.toBeNull()
  })

  it('« Modifier » ouvre le formulaire pré-rempli avec cette commande', async () => {
    await monter()
    await wrapper.find('[data-test="modifier-b"]').trigger('click')
    await flushPromises()
    expect(appelsGet()).toContain('/commandes/b')
    expect(document.getElementById('commande-client').value).toBe("L'Équipe")
  })

  it('affiche l’erreur du serveur', async () => {
    apiGet.mockRejectedValue(new ApiError('Utilisateur sans franchise associée', 400))
    await monter()
    expect(useNotificationsStore().notifications[0]).toMatchObject({
      type: 'error',
      message: 'Utilisateur sans franchise associée',
    })
  })
})
