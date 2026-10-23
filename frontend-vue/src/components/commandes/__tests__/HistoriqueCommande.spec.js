import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import HistoriqueCommande from '../HistoriqueCommande.vue'
import { apiGet, ApiError } from '@/api/client'

vi.mock('@/api/client', async () => {
  const vrai = await vi.importActual('@/api/client')
  return { ApiError: vrai.ApiError, apiGet: vi.fn() }
})
vi.mock('@/api/navigation', () => ({ allerALaConnexion: vi.fn() }))

const HISTORIQUE = [
  {
    action: 'modification',
    details: { champs: { nombre_couverts: 25 } },
    auteur: 'Marie Durand',
    created_at: '2026-10-23T14:30:00+00:00',
  },
  {
    action: 'creation',
    details: {
      nom_client: 'Martin',
      delivery_date: '2026-11-02',
      delivery_hour: '10:00:00',
      nombre_couverts: 20,
      validated: true,
      formules: 1,
      produits: 0,
    },
    auteur: 'caen@omb.fr', // pas de nom renseigné = le serveur renvoie l'email
    created_at: '2026-10-23T10:05:00+00:00',
  },
]

let wrapper
async function ouvrirHorloge() {
  wrapper = mount(HistoriqueCommande, { attachTo: document.body, props: { commandeId: 'c1' } })
  await wrapper.find('[data-test="historique-c1"]').trigger('click')
  await flushPromises()
}
const bandeau = () => document.querySelector('[data-test="bandeau-c1"]')

beforeEach(() => vi.clearAllMocks())
afterEach(() => wrapper?.unmount())

describe('HistoriqueCommande (horloge)', () => {
  it('rien n’est chargé tant qu’on ne clique pas sur l’horloge', () => {
    wrapper = mount(HistoriqueCommande, { props: { commandeId: 'c1' } })
    expect(wrapper.find('[aria-label="Historique de la commande"]').exists()).toBe(true)
    expect(apiGet).not.toHaveBeenCalled()
  })

  it('un clic ouvre le bandeau : quoi, quand et par qui (son nom)', async () => {
    apiGet.mockResolvedValue(HISTORIQUE)
    await ouvrirHorloge()
    expect(apiGet).toHaveBeenCalledWith('/commandes/c1/historique')
    const texte = bandeau().textContent
    expect(texte).toContain('Modification')
    expect(texte).toContain('par Marie Durand')
    expect(texte).toContain('ven. 23/10/2026 à 16:30')
    expect(texte).toContain('Création')
    expect(texte).toContain('par caen@omb.fr')
  })

  it('le détail des modifications est replié : une flèche l’ouvre et le referme', async () => {
    apiGet.mockResolvedValue(HISTORIQUE)
    await ouvrirHorloge()
    expect(bandeau().textContent).not.toContain('Couverts → 25')
    const fleche = document.querySelector('[data-test="deplier-0"]')
    expect(fleche.getAttribute('aria-expanded')).toBe('false')

    fleche.click()
    await flushPromises()
    expect(bandeau().textContent).toContain('Couverts → 25')
    expect(fleche.getAttribute('aria-expanded')).toBe('true')
    expect(bandeau().textContent).not.toContain('Client : Martin') // l'autre étape reste repliée

    fleche.click()
    await flushPromises()
    expect(bandeau().textContent).not.toContain('Couverts → 25')
  })

  it('commande ancienne : explique qu’il n’y a pas encore d’historique', async () => {
    apiGet.mockResolvedValue([])
    await ouvrirHorloge()
    expect(bandeau().textContent).toContain('Aucun historique')
  })

  it('erreur du serveur : message simple, sans planter', async () => {
    apiGet.mockRejectedValue(new ApiError('Erreur', 500))
    await ouvrirHorloge()
    expect(bandeau().textContent).toContain('Historique indisponible')
  })
})
