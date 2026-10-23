import { describe, it, expect } from 'vitest'
import { PAGE_CONNEXION, PAGE_COMMANDES } from '../navigation'
import router from '@/router'

// Les adresses de navigation.js doivent être celles des pages Vue du routeur
// (/app/connexion et /app/commandes une fois en ligne : BASE_URL = '/app/')
describe('navigation vers les pages Vue', () => {
  it('connexion : la page Vue, publique (sans connexion)', () => {
    const route = router.resolve({ name: 'connexion' })
    expect(PAGE_CONNEXION).toBe(route.href)
    expect(route.meta.publique).toBe(true)
  })

  it('commandes : la page Vue, réservée aux utilisateurs connectés', () => {
    const route = router.resolve({ name: 'commandes' })
    expect(PAGE_COMMANDES).toBe(route.href)
    expect(route.meta.publique).toBeUndefined()
  })
})
