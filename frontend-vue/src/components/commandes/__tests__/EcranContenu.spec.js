import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import AutoComplete from 'primevue/autocomplete'
import EcranContenu from '../EcranContenu.vue'
import { useUtilisateurStore } from '@/stores/utilisateur'
import { useNotificationsStore } from '@/stores/notifications'
import { commandeVide } from '@/utils/nouvelleCommande'
import { apiGet } from '@/api/client'

vi.mock('@/api/client', async () => {
  const vrai = await vi.importActual('@/api/client')
  return { ApiError: vrai.ApiError, apiGet: vi.fn() }
})
vi.mock('@/api/navigation', () => ({ allerALaConnexion: vi.fn() }))

const FORMULES = [
  { id: 'f1', name: 'Brunch Salé', franchise_ids: ['fr-1'] },
  { id: 'f2', name: 'Petit-déjeuner', franchise_ids: ['fr-1'] },
  { id: 'f3', name: 'Brunch Lyon', franchise_ids: ['fr-2'] }, // autre franchise
]
const PRODUITS = [
  { id: 'p1', name: 'Café' },
  { id: 'p2', name: 'Jus d’orange' },
]
const UNITES = [{ nom: 'kg' }, { nom: 'unité' }, { nom: 'L' }]
const COMPOSITION = [
  { produit_id: 'p8', produit_name: 'Mini croissant', quantite: 2, unite: 'pièce' },
  { produit_id: 'p9', produit_name: 'Quiche', quantite: 1, unite: 'part' },
]

let wrapper
async function monter(champs = {}) {
  useUtilisateurStore().utilisateur = { id: 'u-1', role: 'USER', franchise_id: 'fr-1' }
  wrapper = mount(EcranContenu, {
    attachTo: document.body,
    props: {
      modelValue: { ...commandeVide('2026-10-22'), ...champs },
      'onUpdate:modelValue': (valeur) => wrapper.setProps({ modelValue: valeur }),
      couvertsProposes: 58,
    },
  })
  await flushPromises()
}
const commande = () => wrapper.props('modelValue')
const recherche = (dataTest) =>
  wrapper.findAllComponents(AutoComplete).find((a) => a.attributes('data-test') === dataTest)
// Simule « taper un texte » dans une recherche : renvoie les noms proposés
async function taper(dataTest, texte) {
  recherche(dataTest).vm.$emit('complete', { query: texte })
  await flushPromises()
  return recherche(dataTest)
    .props('suggestions')
    .map((e) => e.name)
}
async function choisir(dataTest, element) {
  recherche(dataTest).vm.$emit('option-select', { value: element })
  await flushPromises()
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  apiGet.mockImplementation(async (url) => {
    if (url === '/formules/') return FORMULES
    if (url === '/produits/') return PRODUITS
    if (url === '/unite/') return UNITES
    if (url.startsWith('/formule-produits/formule/')) return COMPOSITION
  })
})
afterEach(() => wrapper?.unmount())

describe('EcranContenu : formules', () => {
  it('cherche les formules qui CONTIENNENT le texte, seulement celles de ma franchise', async () => {
    await monter()
    expect(await taper('recherche-formule', 'sale')).toEqual(['Brunch Salé'])
    expect(await taper('recherche-formule', 'brunch')).toEqual(['Brunch Salé']) // pas Lyon
    expect(await taper('recherche-formule', 'e')).toEqual(['Brunch Salé', 'Petit-déjeuner'])
  })

  it('ajoute la formule choisie avec les couverts proposés (parts de l’écran 1)', async () => {
    await monter()
    await choisir('recherche-formule', FORMULES[0])
    expect(commande().formules).toEqual([
      { formule_id: 'f1', nom: 'Brunch Salé', couverts: 58, produits_exclus: [] },
    ])
    expect(wrapper.find('#couverts-f1').element.value).toBe('58')
  })

  it('prévient si la formule est déjà dans la commande', async () => {
    await monter()
    await choisir('recherche-formule', FORMULES[0])
    await choisir('recherche-formule', FORMULES[0])
    expect(commande().formules).toHaveLength(1)
    expect(useNotificationsStore().notifications.at(-1).type).toBe('warning')
  })

  it('affiche la composition et retire un produit de la formule pour cette commande', async () => {
    await monter()
    await choisir('recherche-formule', FORMULES[0])
    await wrapper.find('[data-test="composition-f1"]').trigger('click')
    await flushPromises()
    expect(apiGet).toHaveBeenCalledWith('/formule-produits/formule/f1')
    expect(wrapper.text()).toContain('Quiche')

    await wrapper.find('#compo-f1-p9').trigger('click') // décocher la quiche
    expect(commande().formules[0].produits_exclus).toEqual(['p9'])
    expect(wrapper.text()).toContain('1 produit(s) retiré(s)')
  })

  it('ne recharge pas la composition déjà chargée', async () => {
    await monter()
    await choisir('recherche-formule', FORMULES[0])
    const composition = wrapper.find('[data-test="composition-f1"]')
    await composition.trigger('click')
    await composition.trigger('click')
    await composition.trigger('click')
    await flushPromises()
    expect(apiGet.mock.calls.filter(([url]) => url.startsWith('/formule-produits'))).toHaveLength(1)
  })

  it('retire une formule', async () => {
    await monter()
    await choisir('recherche-formule', FORMULES[0])
    await wrapper.find('[data-test="retirer-formule-f1"]').trigger('click')
    expect(commande().formules).toEqual([])
  })
})

describe('EcranContenu : produits ajoutés', () => {
  it('ajoute un produit : quantité proposée = parts, unité « unité » par défaut', async () => {
    await monter()
    expect(await taper('recherche-produit', 'cafe')).toEqual(['Café'])
    await choisir('recherche-produit', PRODUITS[0])
    await wrapper.find('[data-test="ajouter-produit"]').trigger('click')
    expect(commande().produits).toEqual([
      { produit_id: 'p1', nom: 'Café', quantite: 58, unite: 'unité' },
    ])
  })

  it('premier produit : la quantité proposée suit les parts, même modifiées après l’ouverture', async () => {
    await monter()
    // L'écran 2 est créé dès l'ouverture du formulaire, avant la saisie des couverts à l'écran 1
    await wrapper.setProps({ couvertsProposes: 24 })
    await choisir('recherche-produit', PRODUITS[0])
    await wrapper.find('[data-test="ajouter-produit"]').trigger('click')
    expect(commande().produits[0].quantite).toBe(24)
  })

  it('la flèche du menu propose ce qui correspond au texte déjà tapé', async () => {
    await monter()
    expect(recherche('recherche-produit').props('dropdownMode')).toBe('current')
    expect(recherche('recherche-formule').props('dropdownMode')).toBe('current')
  })

  it('refuse d’ajouter sans avoir choisi un produit', async () => {
    await monter()
    await wrapper.find('[data-test="ajouter-produit"]').trigger('click')
    expect(commande().produits).toEqual([])
    expect(useNotificationsStore().notifications[0].type).toBe('warning')
  })

  it('retire un produit', async () => {
    await monter({ produits: [{ produit_id: 'p1', nom: 'Café', quantite: 2, unite: 'L' }] })
    await wrapper.find('[data-test="retirer-produit-p1"]').trigger('click')
    expect(commande().produits).toEqual([])
  })
})
