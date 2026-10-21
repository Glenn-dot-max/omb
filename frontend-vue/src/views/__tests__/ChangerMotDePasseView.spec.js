import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ChangerMotDePasseView from '../ChangerMotDePasseView.vue'
import { useUtilisateurStore } from '@/stores/utilisateur'
import { apiPost } from '@/api/client'
import { allerAuxCommandes } from '@/api/navigation'

vi.mock('@/api/client', async () => {
  const vrai = await vi.importActual('@/api/client')
  return { ApiError: vrai.ApiError, apiPost: vi.fn(), apiGet: vi.fn(), saveToken: vi.fn(), removeToken: vi.fn() }
})
vi.mock('@/api/navigation', () => ({ allerALaConnexion: vi.fn(), allerAuxCommandes: vi.fn() }))

let pinia
beforeEach(() => {
  pinia = createPinia()
  setActivePinia(pinia)
  vi.clearAllMocks()
  useUtilisateurStore().utilisateur = { email: 'nouveau@omb.fr', role: 'USER', must_change_password: true }
})

describe('ChangerMotDePasseView (première connexion)', () => {
  it('demande le mot de passe provisoire', () => {
    const wrapper = mount(ChangerMotDePasseView, { global: { plugins: [pinia] } })
    expect(wrapper.find('label[for="ancien-mot-de-passe"]').text()).toContain('provisoire')
  })

  it('après le changement : plus de mot de passe à changer, direction les commandes', async () => {
    apiPost.mockResolvedValue({ access_token: 'nouveau-jeton' })
    const wrapper = mount(ChangerMotDePasseView, { global: { plugins: [pinia] } })

    await wrapper.find('#ancien-mot-de-passe').setValue('Provisoire1')
    await wrapper.find('#nouveau-mot-de-passe').setValue('NouveauMdp1')
    await wrapper.find('#confirmation-mot-de-passe').setValue('NouveauMdp1')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(useUtilisateurStore().utilisateur.must_change_password).toBe(false)
    expect(allerAuxCommandes).toHaveBeenCalledOnce()
  })

  it("en cas d'erreur : on reste sur la page", async () => {
    apiPost.mockRejectedValue(new Error('Mot de passe actuel incorrect'))
    const wrapper = mount(ChangerMotDePasseView, { global: { plugins: [pinia] } })

    await wrapper.find('#ancien-mot-de-passe').setValue('Faux12345')
    await wrapper.find('#nouveau-mot-de-passe').setValue('NouveauMdp1')
    await wrapper.find('#confirmation-mot-de-passe').setValue('NouveauMdp1')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(allerAuxCommandes).not.toHaveBeenCalled()
    expect(useUtilisateurStore().utilisateur.must_change_password).toBe(true)
  })
})
