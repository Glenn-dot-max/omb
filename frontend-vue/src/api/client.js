// ==============================================
// CLIENT API : appels au backend avec le token, erreurs lisibles,
// renvoi vers la connexion quand la session a expiré.
// (Repris de frontend/js/auth.js, en une seule fonction commune.)
// ==============================================
import { allerALaConnexion } from './navigation'

const API_URL = import.meta.env.VITE_API_URL

// Mêmes clés que l'ancien frontend : la connexion est partagée pendant la migration
const TOKEN_KEY = 'omb_token'
const USER_KEY = 'omb_user'

// Après un changement de mot de passe, le serveur renvoie un nouveau token (l'ancien est invalidé)
export function saveToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

// Utilisateur renvoyé à la connexion : encore lu par l'ancien frontend (Produits, Formules)
export function saveUser(utilisateur) {
  localStorage.setItem(USER_KEY, JSON.stringify(utilisateur))
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function removeToken() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

// Erreur renvoyée par l'API : un message lisible + le code HTTP (404, 409, 422…)
export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

// Transforme la réponse d'erreur du backend en message lisible :
// - 422 (validation) : { detail: "Données invalides", errors: [{ msg }] } -> les messages précis
// - erreurs FastAPI par défaut : { detail: [{ msg }] } ou { detail: "texte" }
export function getErrorMessage(body) {
  if (Array.isArray(body?.errors) && body.errors.length > 0) {
    return body.errors.map((e) => e.msg).join(' ')
  }
  if (Array.isArray(body?.detail)) {
    return body.detail.map((e) => e.msg).join(' ')
  }
  return body?.detail || 'Erreur inattendue, veuillez réessayer.'
}

// publique = true : page sans connexion (mot de passe oublié, réinitialisation)
// -> pas de token, et un 401 y veut dire « mauvais identifiants », pas « session expirée »
async function request(method, endpoint, data, { publique = false } = {}) {
  const options = { method, headers: {} }
  if (!publique) {
    const token = getToken()
    if (!token) {
      allerALaConnexion()
      throw new ApiError('Vous devez être connecté.', 401)
    }
    options.headers.Authorization = `Bearer ${token}`
  }
  if (data !== undefined) {
    options.headers['Content-Type'] = 'application/json'
    options.body = JSON.stringify(data)
  }

  let response
  try {
    response = await fetch(`${API_URL}${endpoint}`, options)
  } catch {
    throw new ApiError(
      'Impossible de joindre le serveur. Vérifiez votre connexion et réessayez.',
      0,
    )
  }

  // Token expiré ou invalide : on oublie la session et on renvoie vers la connexion
  if (response.status === 401 && !publique) {
    removeToken()
    allerALaConnexion()
    throw new ApiError('Session expirée, veuillez vous reconnecter.', 401)
  }

  // Réponse vide (ex. certaines suppressions) ou non JSON (ex. page d'erreur d'un proxy) : body = null
  const text = await response.text()
  let body = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = null
  }

  if (!response.ok) {
    throw new ApiError(getErrorMessage(body), response.status)
  }
  return body
}

export const apiGet = (endpoint) => request('GET', endpoint)
export const apiPost = (endpoint, data) => request('POST', endpoint, data)
export const apiPut = (endpoint, data) => request('PUT', endpoint, data)
export const apiPatch = (endpoint, data) => request('PATCH', endpoint, data)
export const apiDelete = (endpoint) => request('DELETE', endpoint)
// Appel sans connexion (pages publiques)
export const apiPostPublic = (endpoint, data) => request('POST', endpoint, data, { publique: true })
