import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useNotificationsStore } from '../notifications'

beforeEach(() => {
  setActivePinia(createPinia())
  vi.useFakeTimers()
})
afterEach(() => vi.useRealTimers())

describe('store notifications', () => {
  it('affiche une notification puis la retire après sa durée', () => {
    const store = useNotificationsStore()

    store.succes('Commande créée')
    expect(store.notifications).toHaveLength(1)
    expect(store.notifications[0]).toMatchObject({ message: 'Commande créée', type: 'success' })

    vi.advanceTimersByTime(20)
    expect(store.notifications[0].visible).toBe(true) // animation d'entrée

    vi.advanceTimersByTime(3000 + 300)
    expect(store.notifications).toHaveLength(0)
  })

  it("une erreur reste affichée plus longtemps qu'un succès", () => {
    const store = useNotificationsStore()

    store.erreur('Ce type existe déjà')
    vi.advanceTimersByTime(3500)

    expect(store.notifications).toHaveLength(1)
    expect(store.notifications[0].type).toBe('error')
  })

  it('plusieurs notifications peuvent coexister', () => {
    const store = useNotificationsStore()

    store.info('Chargement terminé')
    store.avertissement('Le nom du client est requis')

    expect(store.notifications.map((n) => n.type)).toEqual(['info', 'warning'])
  })
})
