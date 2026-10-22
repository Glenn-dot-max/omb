import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import MultiSelect from 'primevue/multiselect'
import Select from 'primevue/select'
import PlanningView from '../PlanningView.vue'
import { useUtilisateurStore } from '@/stores/utilisateur'
import { useNotificationsStore } from '@/stores/notifications'
import { apiGet, ApiError } from '@/api/client'
import { exporterPlanning } from '@/utils/exportPlanning'

vi.mock('@/api/client', async () => {
  const vrai = await vi.importActual('@/api/client')
  return { ApiError: vrai.ApiError, apiGet: vi.fn() }
})
vi.mock('@/api/navigation', () => ({ allerALaConnexion: vi.fn() }))
vi.mock('@/utils/exportPlanning', () => ({ exporterPlanning: vi.fn() }))

const REPONSE = {
  periode: { debut: '2026-10-26', fin: '2026-11-01' },
  commandes_count: 1,
  planning: {
    '2026-10-27': {
      commandes: [
        {
          id: 'c1',
          client: 'Dupont',
          heure: '09:00:00',
          produits: { p1: { quantite: 40, source: 'formule' } },
        },
      ],
      totaux: {
        p1: { nom: 'Mini croissant', type: 'Sucré', categorie: 'Viennoiseries', unite: 'pièce' },
      },
    },
  },
  commandes_non_validees: [],
}

let wrapper
async function monter(role = 'USER') {
  useUtilisateurStore().utilisateur = { id: 'u-1', role, franchise_id: 'f-1' }
  wrapper = mount(PlanningView, { attachTo: document.body })
  await flushPromises()
  return wrapper
}
async function saisir(id, valeur) {
  await wrapper.find(`#${id}`).setValue(valeur)
}
async function choisir(composant, inputId, valeur) {
  wrapper
    .findAllComponents(composant)
    .find((c) => c.props('inputId') === inputId)
    .vm.$emit('update:modelValue', valeur)
  await flushPromises()
}
async function generer() {
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}
// Adresses appelées pour le planning, et paramètres du premier appel
const appelsPlanning = () =>
  apiGet.mock.calls.map(([url]) => url).filter((url) => url.startsWith('/planning'))
const parametresAppel = () =>
  Object.fromEntries(new URL(appelsPlanning()[0], 'http://x').searchParams)

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  apiGet.mockImplementation(async (url) =>
    url.startsWith('/admin/franchises') ? [{ id: 'f-2', nom: 'OMB Lyon' }] : REPONSE,
  )
})
afterEach(() => wrapper?.unmount())

describe('PlanningView', () => {
  it('propose par défaut la période d’aujourd’hui à dans 7 jours', async () => {
    await monter()
    const debut = wrapper.find('#planning-debut').element.value
    const fin = wrapper.find('#planning-fin').element.value
    expect(debut).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect((new Date(fin) - new Date(debut)) / 86400000).toBe(7)
  })

  it('demande le planning avec les filtres choisis, puis affiche semaine et tableau', async () => {
    await monter()
    await saisir('planning-debut', '2026-10-26')
    await saisir('planning-fin', '2026-11-01')
    await choisir(MultiSelect, 'planning-types', ['brunch', 'mariage'])
    await choisir(Select, 'planning-categorie', 'sucré')
    await generer()

    expect(parametresAppel()).toEqual({
      date_debut: '2026-10-26',
      date_fin: '2026-11-01',
      type_prestation: 'brunch,mariage',
      categorie: 'sucré',
    })
    expect(wrapper.text()).toContain('Semaine 44')
    expect(wrapper.text()).toContain('Mini croissant')
  })

  it('envoie « toutes » quand aucun type de prestation n’est choisi', async () => {
    await monter()
    await generer()
    expect(parametresAppel().type_prestation).toBe('toutes')
  })

  it('« Tous les types » coche tout, et envoie « toutes » (commandes sans type comprises)', async () => {
    await monter()
    await wrapper.find('.p-multiselect').trigger('click') // ouvrir la liste
    await flushPromises()
    const caseTous = document.getElementById('planning-types-tous')
    caseTous.click()
    await flushPromises()
    expect(wrapper.findComponent(MultiSelect).props('modelValue')).toHaveLength(5)

    await generer()
    expect(parametresAppel().type_prestation).toBe('toutes')
  })

  it('TECH_ADMIN : filtre par franchise avec le paramètre franchise_id', async () => {
    await monter('TECH_ADMIN')
    expect(apiGet).toHaveBeenCalledWith('/admin/franchises')
    await choisir(Select, 'planning-franchise', 'f-2')
    await generer()
    expect(parametresAppel().franchise_id).toBe('f-2')
  })

  it('utilisateur de franchise : pas de filtre franchise, ni de chargement des franchises', async () => {
    await monter('USER')
    expect(wrapper.find('#planning-franchise').exists()).toBe(false)
    expect(apiGet).not.toHaveBeenCalledWith('/admin/franchises')
    await generer()
    expect(parametresAppel().franchise_id).toBeUndefined()
  })

  it('refuse une date de début après la date de fin, sans appeler le serveur', async () => {
    await monter()
    await saisir('planning-debut', '2026-11-05')
    await saisir('planning-fin', '2026-11-01')
    await generer()
    expect(appelsPlanning()).toEqual([])
    expect(useNotificationsStore().notifications[0]).toMatchObject({ type: 'error' })
  })

  it('liste les commandes non validées exclues du planning', async () => {
    apiGet.mockResolvedValue({
      ...REPONSE,
      commandes_non_validees: [
        {
          id: 'c9',
          nom_client: 'Leroy',
          delivery_date: '2026-10-28',
          delivery_hour: '10:00:00',
          nombre_couverts: 12,
        },
      ],
    })
    await monter()
    await generer()
    expect(wrapper.text()).toContain('1 commande(s) non validée(s)')
    expect(wrapper.text()).toContain('Leroy : 28/10/2026 à 10:00')
  })

  it('exporte en Excel le planning affiché, avec les options choisies', async () => {
    await monter()
    await choisir(Select, 'planning-categorie', 'salé')
    await generer()
    const bouton = wrapper.findAll('button').find((b) => b.text() === 'Exporter en Excel')
    await bouton.trigger('click')
    await flushPromises()
    expect(exporterPlanning).toHaveBeenCalledWith(REPONSE, {
      afficherTotaux: true,
      categorie: 'salé',
    })
  })

  it('un double-clic sur « Exporter » ne lance qu’un seul export', async () => {
    await monter()
    await generer()
    const bouton = wrapper.findAll('button').find((b) => b.text() === 'Exporter en Excel')
    await bouton.trigger('click')
    await flushPromises()
    await bouton.trigger('click') // l'export est déjà terminé, mais le bouton reste bloqué
    await flushPromises()
    expect(exporterPlanning).toHaveBeenCalledTimes(1)
  })

  it('pas de bouton d’export sans commande', async () => {
    apiGet.mockResolvedValue({ periode: REPONSE.periode, commandes_count: 0, planning: {} })
    await monter()
    await generer()
    expect(wrapper.text()).not.toContain('Exporter en Excel')
  })

  it('indique qu’il n’y a aucune commande sur la période', async () => {
    apiGet.mockResolvedValue({ periode: REPONSE.periode, commandes_count: 0, planning: {} })
    await monter()
    await generer()
    expect(wrapper.text()).toContain('Aucune commande validée sur cette période')
  })

  it('affiche l’erreur du serveur', async () => {
    apiGet.mockRejectedValue(new ApiError('La période ne peut pas dépasser 90 jours.', 400))
    await monter()
    await generer()
    expect(useNotificationsStore().notifications[0]).toMatchObject({
      type: 'error',
      message: 'La période ne peut pas dépasser 90 jours.',
    })
  })
})
