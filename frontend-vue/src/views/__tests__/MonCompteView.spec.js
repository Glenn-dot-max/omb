import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import MonCompteView from '../MonCompteView.vue'
import { useUtilisateurStore } from '@/stores/utilisateur'
import { useNotificationsStore } from '@/stores/notifications'
import { apiPost, saveToken, ApiError } from '@/api/client'

vi.mock('@/api/client', async () => {
  const vrai = await vi.importActual('@/api/client')
  return {
    ApiError: vrai.ApiError,
    apiPost: vi.fn(),
    apiGet: vi.fn(),
    saveToken: vi.fn(),
    removeToken: vi.fn(),
  }
})
vi.mock('@/api/navigation', () => ({ allerALaConnexion: vi.fn() }))

let pinia
function monter(utilisateur = { email: 'paris@omb.fr', role: 'USER', franchise_nom: 'Paris' }) {
  useUtilisateurStore().utilisateur = utilisateur
  return mount(MonCompteView, { global: { plugins: [pinia] } })
}
async function remplirEtEnvoyer(wrapper, ancien, nouveau, confirmation) {
  await wrapper.find('#ancien-mot-de-passe').setValue(ancien)
  await wrapper.find('#nouveau-mot-de-passe').setValue(nouveau)
  await wrapper.find('#confirmation-mot-de-passe').setValue(confirmation)
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}

beforeEach(() => {
  pinia = createPinia()
  setActivePinia(pinia)
  vi.clearAllMocks()
})

describe('MonCompteView', () => {
  it("affiche les informations de l'utilisateur", () => {
    const wrapper = monter()
    expect(wrapper.text()).toContain('paris@omb.fr')
    expect(wrapper.text()).toContain('Paris')
    expect(wrapper.text()).toContain('Utilisateur')
  })

  it("affiche le bon libellé pour l'administrateur", () => {
    const wrapper = monter({ email: 'admin@omb.fr', role: 'TECH_ADMIN', franchise_nom: null })
    expect(wrapper.text()).toContain('Administrateur')
    expect(wrapper.text()).toContain('Aucune franchise')
  })

  it('affiche exactement 3 champs de mot de passe, chacun avec un id unique', () => {
    const wrapper = monter()
    const ids = wrapper.findAll('input').map((champ) => champ.attributes('id'))
    expect(ids).toEqual([
      'ancien-mot-de-passe',
      'nouveau-mot-de-passe',
      'confirmation-mot-de-passe',
    ])
  })
  it('change le mot de passe et enregistre le nouveau token', async () => {
    apiPost.mockResolvedValue({ message: 'ok', access_token: 'nouveau-jeton' })
    const wrapper = monter()

    await remplirEtEnvoyer(wrapper, 'AncienMdp1', 'NouveauMdp1', 'NouveauMdp1')

    expect(apiPost).toHaveBeenCalledWith('/auth/change-password', {
      old_password: 'AncienMdp1',
      new_password: 'NouveauMdp1',
    })
    expect(saveToken).toHaveBeenCalledWith('nouveau-jeton')
    expect(useNotificationsStore().notifications[0]).toMatchObject({ type: 'success' })
    expect(wrapper.find('#ancien-mot-de-passe').element.value).toBe('') // formulaire vidé
  })

  it("refuse avant l'envoi si la confirmation ne correspond pas", async () => {
    const wrapper = monter()

    await remplirEtEnvoyer(wrapper, 'AncienMdp1', 'NouveauMdp1', 'Autre1234')

    expect(apiPost).not.toHaveBeenCalled()
    expect(useNotificationsStore().notifications[0]).toMatchObject({
      type: 'error',
      message: 'Les mots de passe ne correspondent pas.',
    })
  })

  it('affiche le message du serveur en cas de refus', async () => {
    apiPost.mockRejectedValue(new ApiError('Mot de passe actuel incorrect', 400))
    const wrapper = monter()

    await remplirEtEnvoyer(wrapper, 'Faux12345', 'NouveauMdp1', 'NouveauMdp1')

    expect(saveToken).not.toHaveBeenCalled()
    expect(useNotificationsStore().notifications[0]).toMatchObject({
      type: 'error',
      message: 'Mot de passe actuel incorrect',
    })
  })
})
