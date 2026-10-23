import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import FormulaireCommande from '../FormulaireCommande.vue'
import EcranInfos from '../EcranInfos.vue'
import { useNotificationsStore } from '@/stores/notifications'
import { commandeVide } from '@/utils/nouvelleCommande'
import { apiPost, apiGet, apiPut, ApiError } from '@/api/client'

vi.mock('@/api/client', async () => {
  const vrai = await vi.importActual('@/api/client')
  return { ApiError: vrai.ApiError, apiPost: vi.fn(), apiGet: vi.fn(), apiPut: vi.fn() }
})
vi.mock('@/api/navigation', () => ({ allerALaConnexion: vi.fn() }))

let wrapper
async function ouvrir(autresProps = {}) {
  wrapper = mount(FormulaireCommande, {
    attachTo: document.body,
    props: {
      visible: false,
      'onUpdate:visible': (v) => wrapper.setProps({ visible: v }),
      aujourdhui: '2026-10-22',
      ...autresProps,
    },
  })
  await wrapper.setProps({ visible: true }) // ouverture : le formulaire se remet à zéro
  await flushPromises()
}
const bouton = (nom) => document.querySelector(`[data-test="${nom}"]`)
async function cliquer(nom) {
  bouton(nom).click()
  await flushPromises()
}
async function saisir(id, valeur) {
  const champ = document.getElementById(id)
  champ.value = valeur
  champ.dispatchEvent(new Event('input'))
  await flushPromises()
}
// Remplit la commande d'un coup (sans passer par les écrans)
async function remplir(champs) {
  wrapper
    .findComponent(EcranInfos)
    .vm.$emit('update:modelValue', { ...commandeVide('2026-10-22'), ...champs })
  await flushPromises()
}
const COMPLETE = {
  nom_client: 'Mairie de Caen',
  nombre_couverts: 20,
  formules: [{ formule_id: 'f1', nom: 'Brunch', couverts: 20, produits_exclus: [] }],
}
const ecranVisible = (n) => {
  const ecran = document.querySelector(`[data-test="ecran-${n}"]`)
  return !!ecran && ecran.closest('[role="tabpanel"]')?.style.display !== 'none'
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  apiGet.mockResolvedValue([]) // catalogue de l'écran 2 (formules, produits, unités)
})
afterEach(() => wrapper?.unmount())

describe('FormulaireCommande', () => {
  it('commence au premier écran, sans bouton « Précédent »', async () => {
    await ouvrir()
    expect(document.getElementById('commande-client')).not.toBeNull()
    expect(bouton('precedent')).toBeNull()
  })

  it('refuse de passer à l’écran suivant tant que l’écran 1 est incomplet', async () => {
    await ouvrir()
    await cliquer('suivant')
    expect(useNotificationsStore().notifications[0]).toMatchObject({ type: 'error' })
    expect(ecranVisible(2)).toBe(false)
  })

  it('passe à l’écran 2 quand l’écran 1 est complet, et peut revenir', async () => {
    await ouvrir()
    await saisir('commande-client', 'Mairie de Caen')
    await cliquer('suivant')
    expect(ecranVisible(2)).toBe(true)
    await cliquer('precedent')
    expect(document.getElementById('commande-client').value).toBe('Mairie de Caen')
  })

  it('écran 2 : refuse d’aller au récapitulatif sans formule ni produit, accepte avec', async () => {
    await ouvrir()
    await saisir('commande-client', 'Mairie de Caen')
    await cliquer('suivant')
    await cliquer('suivant')
    expect(ecranVisible(3)).toBe(false)
    expect(useNotificationsStore().notifications.at(-1).message).toMatch(/au moins une formule/)

    await remplir(COMPLETE)
    await cliquer('suivant')
    expect(ecranVisible(3)).toBe(true)
  })

  it('récapitulatif : « Créer la commande » enregistre la commande validée', async () => {
    apiPost.mockResolvedValue({ id: 'cmd-1' })
    await ouvrir()
    await remplir(COMPLETE)
    await cliquer('suivant')
    await cliquer('suivant')
    expect(ecranVisible(3)).toBe(true)
    expect(bouton('creer').textContent).toContain('Créer la commande')

    await cliquer('creer')
    expect(apiPost).toHaveBeenCalledTimes(1)
    expect(apiPost).toHaveBeenCalledWith(
      '/commandes/complete',
      expect.objectContaining({ nom_client: 'Mairie de Caen', validated: true }),
    )
    expect(wrapper.emitted('enregistree')).toHaveLength(1)
    expect(wrapper.props('visible')).toBe(false)
  })

  it('récapitulatif : commande cochée « en attente » → enregistrée non validée', async () => {
    apiPost.mockResolvedValue({ id: 'cmd-1' })
    await ouvrir()
    await remplir({ ...COMPLETE, en_attente: true })
    await cliquer('suivant')
    await cliquer('suivant')
    expect(bouton('creer').textContent).toContain('Enregistrer en attente')
    await cliquer('creer')
    expect(apiPost.mock.calls[0][1].validated).toBe(false)
  })

  it('récapitulatif : erreur du serveur affichée, la saisie est gardée', async () => {
    apiPost.mockRejectedValue(new ApiError('La date de livraison est dans le passé', 422))
    await ouvrir()
    await remplir(COMPLETE)
    await cliquer('suivant')
    await cliquer('suivant')
    await cliquer('creer')
    expect(useNotificationsStore().notifications.at(-1).message).toBe(
      'La date de livraison est dans le passé',
    )
    expect(wrapper.props('visible')).toBe(true)
    expect(ecranVisible(3)).toBe(true)
  })

  it('récapitulatif : « Modifier » revient à l’écran 1', async () => {
    await ouvrir()
    await remplir(COMPLETE)
    await cliquer('suivant')
    await cliquer('suivant')
    await cliquer('modifier-1')
    expect(document.getElementById('commande-client').value).toBe('Mairie de Caen')
    expect(ecranVisible(3)).toBe(false)
  })

  it('« Quitter » sans rien saisir : ferme sans rien demander', async () => {
    await ouvrir()
    await cliquer('quitter')
    expect(bouton('quitter-sans-enregistrer')).toBeNull()
    expect(wrapper.props('visible')).toBe(false)
  })

  it('« Quitter » après une saisie : continuer, ou quitter sans enregistrer', async () => {
    await ouvrir()
    await saisir('commande-client', 'Mairie de Caen')
    await cliquer('quitter')
    await cliquer('continuer')
    expect(wrapper.props('visible')).toBe(true)
    expect(document.getElementById('commande-client').value).toBe('Mairie de Caen')

    await cliquer('quitter')
    await cliquer('quitter-sans-enregistrer')
    expect(wrapper.props('visible')).toBe(false)
    expect(apiPost).not.toHaveBeenCalled()
  })

  it('« Mettre en attente » enregistre la commande, non validée', async () => {
    apiPost.mockResolvedValue({ id: 'cmd-1' })
    await ouvrir()
    await remplir(COMPLETE)
    await cliquer('quitter')
    await cliquer('mettre-en-attente')
    expect(apiPost).toHaveBeenCalledWith(
      '/commandes/complete',
      expect.objectContaining({ nom_client: 'Mairie de Caen', validated: false }),
    )
    expect(wrapper.emitted('enregistree')).toHaveLength(1)
    expect(wrapper.props('visible')).toBe(false)
  })

  it('« Mettre en attente » refusé si la commande est incomplète (sans formule ni produit)', async () => {
    await ouvrir()
    await saisir('commande-client', 'Mairie de Caen')
    await cliquer('quitter')
    await cliquer('mettre-en-attente')
    expect(apiPost).not.toHaveBeenCalled()
    expect(useNotificationsStore().notifications[0].message).toMatch(
      /mettre la commande en attente/,
    )
    expect(wrapper.props('visible')).toBe(true)
  })

  it('« Mettre en attente » : erreur du serveur affichée, rien n’est fermé', async () => {
    apiPost.mockRejectedValue(new ApiError('Une commande identique existe déjà', 409))
    await ouvrir()
    await remplir(COMPLETE)
    await cliquer('quitter')
    await cliquer('mettre-en-attente')
    expect(useNotificationsStore().notifications[0].message).toBe(
      'Une commande identique existe déjà',
    )
    expect(wrapper.props('visible')).toBe(true)
  })

  it('pas de croix de fermeture : on quitte par le bouton « Quitter »', async () => {
    await ouvrir()
    expect(document.querySelector('.p-dialog-close-button')).toBeNull()
  })
})

// ---------- Modification d'une commande existante (V5.4c2b) ----------
const COMMANDE_EXISTANTE = {
  id: 'cmd-1',
  nom_client: 'Mairie de Caen',
  delivery_date: '2026-11-02',
  delivery_hour: '10:00:00',
  nombre_couverts: 20,
  type_prestation: 'brunch',
  coefficient_ponderation: 1,
  avec_service: false,
  notes: null,
  validated: true,
}
function serveurAvecLaCommande() {
  apiGet.mockImplementation(async (url) => {
    if (url === '/commandes/cmd-1') return COMMANDE_EXISTANTE
    if (url === '/commande-formules/commande/cmd-1')
      return [{ id: 708, formule_id: 'f1', quantite_finale: 20, produits_exclus: [] }]
    if (url === '/commande-produits/commande/cmd-1') return []
    if (url === '/formules/') return [{ id: 'f1', name: 'Brunch Salé' }]
    return [] // produits, unités
  })
}

describe('FormulaireCommande : modification', () => {
  beforeEach(serveurAvecLaCommande)

  it('charge la commande et pré-remplit le formulaire', async () => {
    await ouvrir({ commandeId: 'cmd-1' })
    expect(apiGet).toHaveBeenCalledWith('/commandes/cmd-1')
    expect(apiGet).toHaveBeenCalledWith('/commande-formules/commande/cmd-1')
    expect(apiGet).toHaveBeenCalledWith('/commande-produits/commande/cmd-1')
    expect(document.body.textContent).toContain('Modifier la commande')
    expect(document.getElementById('commande-client').value).toBe('Mairie de Caen')
  })

  it('horloge d’historique en haut de la fenêtre', async () => {
    await ouvrir({ commandeId: 'cmd-1' })
    expect(document.querySelector('.p-dialog-header [data-test="historique-cmd-1"]')).not.toBeNull()
  })

  it('nouvelle commande : rien n’est chargé, titre « Nouvelle commande »', async () => {
    await ouvrir()
    expect(apiGet).not.toHaveBeenCalledWith('/commandes/cmd-1')
    expect(document.querySelector('[data-test^="historique-"]')).toBeNull() // pas encore d'historique
    expect(document.body.textContent).toContain('Nouvelle commande')
    expect(document.getElementById('commande-client').value).toBe('')
  })

  it('enregistre seulement ce qui a changé (PUT), puis ferme', async () => {
    apiPut.mockResolvedValue({ id: 'cmd-1' })
    await ouvrir({ commandeId: 'cmd-1' })
    await saisir('commande-client', 'Mairie de Bayeux')
    await cliquer('suivant')
    await cliquer('suivant')
    expect(bouton('creer').textContent).toContain('Enregistrer les modifications')
    await cliquer('creer')
    expect(apiPut).toHaveBeenCalledWith('/commandes/cmd-1/complete', {
      nom_client: 'Mairie de Bayeux',
    })
    expect(apiPost).not.toHaveBeenCalled()
    expect(wrapper.emitted('enregistree')).toHaveLength(1)
    expect(wrapper.props('visible')).toBe(false)
  })

  it('rien de changé : rien n’est envoyé', async () => {
    await ouvrir({ commandeId: 'cmd-1' })
    await cliquer('suivant')
    await cliquer('suivant')
    await cliquer('creer')
    expect(apiPut).not.toHaveBeenCalled()
    expect(useNotificationsStore().notifications.at(-1).message).toMatch(/Aucune modification/)
    expect(wrapper.props('visible')).toBe(false)
  })

  it('erreur du serveur à l’enregistrement : message affiché, la saisie est gardée', async () => {
    apiPut.mockRejectedValue(new ApiError('Formule de commande introuvable', 404))
    await ouvrir({ commandeId: 'cmd-1' })
    await saisir('commande-client', 'Mairie de Bayeux')
    await cliquer('suivant')
    await cliquer('suivant')
    await cliquer('creer')
    expect(useNotificationsStore().notifications.at(-1).message).toBe(
      'Formule de commande introuvable',
    )
    expect(wrapper.props('visible')).toBe(true)
  })

  it('« Quitter » sans changement : ferme sans rien demander', async () => {
    await ouvrir({ commandeId: 'cmd-1' })
    await cliquer('quitter')
    expect(bouton('quitter-sans-enregistrer')).toBeNull()
    expect(wrapper.props('visible')).toBe(false)
  })

  it('« Quitter » après un changement : on peut enregistrer les modifications', async () => {
    apiPut.mockResolvedValue({ id: 'cmd-1' })
    await ouvrir({ commandeId: 'cmd-1' })
    await saisir('commande-client', 'Mairie de Bayeux')
    await cliquer('quitter')
    expect(bouton('mettre-en-attente')).toBeNull() // une commande validée reste validée
    await cliquer('enregistrer-modifications')
    expect(apiPut).toHaveBeenCalledWith('/commandes/cmd-1/complete', {
      nom_client: 'Mairie de Bayeux',
    })
    expect(wrapper.props('visible')).toBe(false)
  })

  it('commande introuvable : message, et la fenêtre se ferme', async () => {
    apiGet.mockRejectedValue(new ApiError('Commande not found', 404))
    await ouvrir({ commandeId: 'cmd-1' })
    expect(useNotificationsStore().notifications.at(-1).type).toBe('error')
    expect(wrapper.props('visible')).toBe(false)
  })
})

describe('FormulaireCommande : duplication', () => {
  beforeEach(serveurAvecLaCommande)

  it('pré-remplit une NOUVELLE commande, enregistrée par POST (sans horloge)', async () => {
    apiPost.mockResolvedValue({ id: 'cmd-2' })
    await ouvrir({ commandeId: 'cmd-1', copie: true })
    expect(document.body.textContent).toContain('Dupliquer la commande')
    expect(document.querySelector('[data-test^="historique-"]')).toBeNull()
    expect(document.getElementById('commande-client').value).toBe('Copie - Mairie de Caen')

    await cliquer('suivant')
    await cliquer('suivant')
    expect(bouton('creer').textContent).toContain('Créer la commande')
    await cliquer('creer')
    expect(apiPut).not.toHaveBeenCalled()
    expect(apiPost).toHaveBeenCalledWith(
      '/commandes/complete',
      expect.objectContaining({
        nom_client: 'Copie - Mairie de Caen',
        delivery_date: '2026-11-02',
        validated: true,
        formules: [{ formule_id: 'f1', quantite_finale: 20, produits_exclus: [] }],
      }),
    )
    expect(wrapper.emitted('enregistree')).toHaveLength(1)
  })

  it('prévient quand une formule n’est plus disponible (pas copiée)', async () => {
    apiGet.mockImplementation(async (url) => {
      if (url === '/commandes/cmd-1') return COMMANDE_EXISTANTE
      if (url === '/commande-formules/commande/cmd-1')
        return [{ id: 708, formule_id: 'f-retiree', quantite_finale: 20, produits_exclus: [] }]
      return []
    })
    await ouvrir({ commandeId: 'cmd-1', copie: true })
    expect(useNotificationsStore().notifications.at(-1)).toMatchObject({
      type: 'warning',
      message: expect.stringContaining('1 formule ou produit'),
    })
  })
})
