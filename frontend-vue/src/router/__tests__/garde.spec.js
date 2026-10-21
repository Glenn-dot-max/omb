import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { verifierAcces } from '../garde'
import { apiGet, getToken } from '@/api/client'
import { allerALaConnexion } from '@/api/navigation'

vi.mock('@/api/client', () => ({ apiGet: vi.fn(), getToken: vi.fn(), removeToken: vi.fn() }))
vi.mock('@/api/navigation', () => ({
  allerALaConnexion: vi.fn(),
}))

const USER = {
  id: 'u1',
  email: 'paris@omb.fr',
  role: 'USER',
  franchise_id: 'f1',
  must_change_password: false,
}
const ADMIN = { ...USER, id: 'a1', role: 'TECH_ADMIN', franchise_id: null }

const pageNormale = { meta: {} }
const pageAdmin = { meta: { techAdmin: true } }

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  getToken.mockReturnValue('jeton-123')
})

describe('garde du routeur', () => {
  it('sans token : renvoie vers la connexion', async () => {
    getToken.mockReturnValue(null)

    expect(await verifierAcces(pageNormale)).toBe(false)
    expect(allerALaConnexion).toHaveBeenCalledOnce()
    expect(apiGet).not.toHaveBeenCalled()
  })

  it('connecté : accès autorisé, utilisateur chargé une seule fois', async () => {
    apiGet.mockResolvedValue(USER)

    expect(await verifierAcces(pageNormale)).toBe(true)
    expect(await verifierAcces(pageNormale)).toBe(true)
    expect(apiGet).toHaveBeenCalledOnce()
  })

  it('mot de passe à changer : redirige vers la page de changement', async () => {
    apiGet.mockResolvedValue({ ...USER, must_change_password: true })

    expect(await verifierAcces(pageNormale)).toEqual({ name: 'changer-mot-de-passe' })
  })

  it('mot de passe à changer : la page de changement elle-même reste accessible', async () => {
    apiGet.mockResolvedValue({ ...USER, must_change_password: true })

    expect(await verifierAcces({ name: 'changer-mot-de-passe', meta: {} })).toBe(true)
  })

  it("page admin refusée à un utilisateur de franchise : retour à l'accueil", async () => {
    apiGet.mockResolvedValue(USER)

    expect(await verifierAcces(pageAdmin)).toEqual({ name: 'accueil' })
  })

  it('page admin autorisée au TECH_ADMIN', async () => {
    apiGet.mockResolvedValue(ADMIN)

    expect(await verifierAcces(pageAdmin)).toBe(true)
  })

  it("serveur en erreur au chargement de l'utilisateur : navigation annulée", async () => {
    apiGet.mockRejectedValue(new Error('Impossible de joindre le serveur'))

    expect(await verifierAcces(pageNormale)).toBe(false)
  })

  it('page publique : accessible sans token, sans appel au serveur', async () => {
    getToken.mockReturnValue(null)

    expect(await verifierAcces({ meta: { publique: true } })).toBe(true)
    expect(allerALaConnexion).not.toHaveBeenCalled()
    expect(apiGet).not.toHaveBeenCalled()
  })
})
