import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ReinitialiserMotDePasseView from '../ReinitialiserMotDePasseView.vue'
import { apiPostPublic } from '@/api/client'
import { useNotificationsStore } from '@/stores/notifications'

vi.mock('@/api/client', () => ({ apiPostPublic: vi.fn() }))
vi.mock('@/api/navigation', () => ({ allerALaConnexion: vi.fn() }))

let pinia
let jetonDansAdresse
vi.mock('vue-router', () => ({ useRoute: () => ({ query: { token: jetonDansAdresse } }) }))

beforeEach(() => {
  pinia = createPinia()
  setActivePinia(pinia)
  vi.clearAllMocks()
  jetonDansAdresse = 'jeton-recu-par-email'
})

async function remplirEtEnvoyer(wrapper, nouveau, confirmation) {
  await wrapper.find('#nouveau-mot-de-passe').setValue(nouveau)
  await wrapper.find('#confirmation-mot-de-passe').setValue(confirmation)
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}

describe('ReinitialiserMotDePasseView', () => {
  it("envoie le jeton de l'adresse avec le nouveau mot de passe", async () => {
    apiPostPublic.mockResolvedValue({ message: 'ok' })
    const wrapper = mount(ReinitialiserMotDePasseView, { global: { plugins: [pinia] } })

    await remplirEtEnvoyer(wrapper, 'NouveauMdp1', 'NouveauMdp1')

    expect(apiPostPublic).toHaveBeenCalledWith('/auth/reset-password', {
      token: 'jeton-recu-par-email',
      new_password: 'NouveauMdp1',
    })
    expect(wrapper.text()).toContain('Mot de passe réinitialisé')
  })

  it("refuse avant l'envoi un mot de passe trop faible", async () => {
    const wrapper = mount(ReinitialiserMotDePasseView, { global: { plugins: [pinia] } })

    await remplirEtEnvoyer(wrapper, 'faible', 'faible')

    expect(apiPostPublic).not.toHaveBeenCalled()
    expect(useNotificationsStore().notifications[0]).toMatchObject({ type: 'error' })
  })

  it('lien expiré : message du serveur affiché', async () => {
    apiPostPublic.mockRejectedValue(new Error('Lien invalide ou expiré'))
    const wrapper = mount(ReinitialiserMotDePasseView, { global: { plugins: [pinia] } })

    await remplirEtEnvoyer(wrapper, 'NouveauMdp1', 'NouveauMdp1')

    expect(useNotificationsStore().notifications[0]).toMatchObject({ type: 'error', message: 'Lien invalide ou expiré' })
  })

  it("sans jeton dans l'adresse : pas de formulaire, message d'erreur", () => {
    jetonDansAdresse = undefined
    const wrapper = mount(ReinitialiserMotDePasseView, { global: { plugins: [pinia] } })

    expect(wrapper.find('form').exists()).toBe(false)
    expect(wrapper.text()).toContain('Lien invalide')
  })
})
