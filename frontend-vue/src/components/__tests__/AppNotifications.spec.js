import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import AppNotifications from '../AppNotifications.vue'
import { useNotificationsStore } from '@/stores/notifications'

let pinia
beforeEach(() => {
  pinia = createPinia()
  setActivePinia(pinia)
})

describe('AppNotifications', () => {
  it('affiche chaque notification avec la classe de son type', async () => {
    const store = useNotificationsStore()
    store.notifications = [
      { id: 1, message: 'Commande créée', type: 'success', visible: true },
      { id: 2, message: 'Erreur réseau', type: 'error', visible: false },
    ]
    const wrapper = mount(AppNotifications, { global: { plugins: [pinia] } })

    const toasts = wrapper.findAll('.toast')
    expect(toasts).toHaveLength(2)
    expect(toasts[0].classes()).toEqual(expect.arrayContaining(['toast-success', 'show']))
    expect(toasts[1].classes()).toContain('toast-error')
    expect(toasts[1].classes()).not.toContain('show')
    expect(toasts[0].text()).toBe('Commande créée')
  })

  it('affiche une balise comme du texte (XSS)', () => {
    const store = useNotificationsStore()
    store.notifications = [
      { id: 1, message: '<img src=x onerror=alert(1)>', type: 'error', visible: true },
    ]
    const wrapper = mount(AppNotifications, { global: { plugins: [pinia] } })

    expect(wrapper.find('img').exists()).toBe(false)
  })
})
