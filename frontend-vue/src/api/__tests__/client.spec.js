import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiGet, apiPost, apiDelete, getErrorMessage, ApiError } from '../client'
import { allerALaConnexion } from '../navigation'

// On remplace la redirection (impossible dans les tests) par une fausse fonction qu'on peut surveiller
vi.mock('../navigation', () => ({ allerALaConnexion: vi.fn() }))

// Fausse réponse du backend
function reponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
  }
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  vi.stubGlobal('fetch', vi.fn())
})

describe('getErrorMessage', () => {
  it('erreur de validation (422) : les messages précis', () => {
    const body = {
      detail: 'Données invalides',
      errors: [{ msg: 'Les caractères < et > ne sont pas autorisés' }],
    }
    expect(getErrorMessage(body)).toBe('Les caractères < et > ne sont pas autorisés')
  })
  it('erreur FastAPI par défaut (liste dans detail) : les messages', () => {
    expect(
      getErrorMessage({
        detail: [{ msg: 'Field required' }, { msg: 'Input should be a valid UUID' }],
      }),
    ).toBe('Field required Input should be a valid UUID')
  })
  it('erreur simple : le texte de detail', () => {
    expect(getErrorMessage({ detail: 'Commande not found' })).toBe('Commande not found')
  })
  it('réponse vide : un message par défaut', () => {
    expect(getErrorMessage(null)).toBe('Erreur inattendue, veuillez réessayer.')
  })
})

describe('client API', () => {
  it('envoie le token et renvoie les données', async () => {
    localStorage.setItem('omb_token', 'jeton-123')
    fetch.mockResolvedValue(reponse(200, [{ id: 1 }]))

    const data = await apiGet('/unite/')

    expect(data).toEqual([{ id: 1 }])
    const [url, options] = fetch.mock.calls[0]
    expect(url).toMatch(/\/unite\/$/)
    expect(options.method).toBe('GET')
    expect(options.headers.Authorization).toBe('Bearer jeton-123')
  })

  it('envoie les données en JSON pour un POST', async () => {
    localStorage.setItem('omb_token', 'jeton-123')
    fetch.mockResolvedValue(reponse(200, { id: 9 }))

    await apiPost('/types/', { name: 'Salé' })

    const options = fetch.mock.calls[0][1]
    expect(options.headers['Content-Type']).toBe('application/json')
    expect(options.body).toBe('{"name":"Salé"}')
  })

  it('erreur du backend : ApiError avec le message lisible et le code', async () => {
    localStorage.setItem('omb_token', 'jeton-123')
    fetch.mockResolvedValue(reponse(409, { detail: 'Ce type existe déjà' }))

    const erreur = await apiPost('/types/', { name: 'Salé' }).catch((e) => e)

    expect(erreur).toBeInstanceOf(ApiError)
    expect(erreur.message).toBe('Ce type existe déjà')
    expect(erreur.status).toBe(409)
  })

  it('session expirée (401) : oublie le token et renvoie vers la connexion', async () => {
    localStorage.setItem('omb_token', 'jeton-expire')
    localStorage.setItem('omb_user', '{}')
    fetch.mockResolvedValue(reponse(401, { detail: 'Token expiré' }))

    await expect(apiGet('/auth/me')).rejects.toThrow('Session expirée')
    expect(localStorage.getItem('omb_token')).toBeNull()
    expect(localStorage.getItem('omb_user')).toBeNull()
    expect(allerALaConnexion).toHaveBeenCalledOnce()
  })

  it("sans token : renvoie vers la connexion sans appeler l'API", async () => {
    await expect(apiGet('/auth/me')).rejects.toThrow()
    expect(fetch).not.toHaveBeenCalled()
    expect(allerALaConnexion).toHaveBeenCalledOnce()
  })

  it('serveur injoignable : message clair', async () => {
    localStorage.setItem('omb_token', 'jeton-123')
    fetch.mockRejectedValue(new TypeError('Load failed'))

    await expect(apiGet('/unite/')).rejects.toThrow('Impossible de joindre le serveur')
  })

  it('suppression avec réponse vide : pas d’erreur', async () => {
    localStorage.setItem('omb_token', 'jeton-123')
    fetch.mockResolvedValue(reponse(200))

    await expect(apiDelete('/types/1')).resolves.toBeNull()
  })
})
