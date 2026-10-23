import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import MotDePasseOublieView from '../MotDePasseOublieView.vue'
import { apiPostPublic } from '@/api/client'
import { useNotificationsStore } from '@/stores/notifications'

vi.mock('@/api/client', () => ({ apiPostPublic: vi.fn() }))
vi.mock('@/api/navigation', () => ({ allerALaConnexion: vi.fn() }))
// Adresse de contact modifiable par test : sans adresse = envoi d'un lien par email (Resend, B1)
const marque = vi.hoisted(() => ({ nom: 'Traiteur Test', contactMotDePasse: null }))
vi.mock('@/config/marque', () => ({ marque }))

let pinia
beforeEach(() => {
  pinia = createPinia()
  setActivePinia(pinia)
  vi.clearAllMocks()
  marque.contactMotDePasse = null
})

describe('MotDePasseOublieView', () => {
  it("envoie l'email et affiche le message du serveur (le même, que le compte existe ou non)", async () => {
    apiPostPublic.mockResolvedValue({
      message: 'Si un compte existe avec cet email, un lien vient de vous être envoyé.',
    })
    const wrapper = mount(MotDePasseOublieView, { global: { plugins: [pinia] } })

    await wrapper.find('#email').setValue('  paris@omb.fr ')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(apiPostPublic).toHaveBeenCalledWith('/auth/forgot-password', { email: 'paris@omb.fr' })
    expect(wrapper.text()).toContain('Si un compte existe avec cet email')
    expect(wrapper.find('form').exists()).toBe(false) // formulaire remplacé par le message
  })

  it('erreur (ex. trop de demandes) : message affiché, formulaire conservé', async () => {
    apiPostPublic.mockRejectedValue(new Error('Trop de demandes, réessayez dans une minute.'))
    const wrapper = mount(MotDePasseOublieView, { global: { plugins: [pinia] } })

    await wrapper.find('#email').setValue('paris@omb.fr')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(useNotificationsStore().notifications[0]).toMatchObject({ type: 'error' })
    expect(wrapper.find('form').exists()).toBe(true)
  })

  it('adresse de contact configurée : on écrit à cette adresse, pas de formulaire', async () => {
    marque.contactMotDePasse = 'contact@traiteur-test.fr'
    const wrapper = mount(MotDePasseOublieView, { global: { plugins: [pinia] } })

    const lien = wrapper.find('a[href^="mailto:"]')
    expect(lien.text()).toBe('contact@traiteur-test.fr')
    expect(lien.attributes('href')).toContain('mailto:contact@traiteur-test.fr')
    expect(wrapper.find('form').exists()).toBe(false)
    expect(apiPostPublic).not.toHaveBeenCalled()
  })
})
