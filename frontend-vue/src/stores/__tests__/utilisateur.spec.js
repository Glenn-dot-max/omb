import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUtilisateurStore } from '../utilisateur'
import { apiGet, removeToken } from '@/api/client'
import { allerALaConnexion } from '@/api/navigation'

vi.mock('@/api/client', () => ({ apiGet: vi.fn(), removeToken: vi.fn() }))
vi.mock('@/api/navigation', () => ({ allerALaConnexion: vi.fn() }))

const ADMIN = {
  id: 'a1',
  email: 'admin@omb.fr',
  role: 'TECH_ADMIN',
  franchise_id: null,
  franchise_nom: null,
}
const USER = {
  id: 'u1',
  email: 'paris@omb.fr',
  role: 'USER',
  franchise_id: 'f1',
  franchise_nom: 'Paris',
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

describe('store utilisateur', () => {
  it("charge l'utilisateur depuis GET /auth/me (rôle à jour, tâche 1.10)", async () => {
    apiGet.mockResolvedValue(ADMIN)
    const store = useUtilisateurStore()

    await store.charger()

    expect(apiGet).toHaveBeenCalledWith('/auth/me')
    expect(store.estConnecte).toBe(true)
    expect(store.estTechAdmin).toBe(true)
    expect(store.aAccesCatalogue).toBe(true)
  })

  it("un utilisateur de franchise n'a pas les droits admin", async () => {
    apiGet.mockResolvedValue(USER)
    const store = useUtilisateurStore()

    await store.charger()

    expect(store.estTechAdmin).toBe(false)
    expect(store.aAccesCatalogue).toBe(false)
  })

  it('déconnexion : oublie le token et renvoie vers la connexion', async () => {
    apiGet.mockResolvedValue(USER)
    const store = useUtilisateurStore()
    await store.charger()

    store.deconnecter()

    expect(removeToken).toHaveBeenCalledOnce()
    expect(allerALaConnexion).toHaveBeenCalledOnce()
    expect(store.estConnecte).toBe(false)
  })
})
