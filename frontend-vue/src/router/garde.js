import { getToken } from '@/api/client'
import { allerALaConnexion, allerAChangerMotDePasse } from '@/api/navigation'
import { useUtilisateurStore } from '@/stores/utilisateur'

// Vérifiée avant chaque changement de page (router.beforeEach).
// Renvoie true (on y va), false (on annule) ou une autre route (on redirige).
export async function verifierAcces(to) {
  // 1. Pas de token : pas connecté
  if (!getToken()) {
    allerALaConnexion()
    return false
  }

  // 2. Charger l'utilisateur depuis le serveur, une seule fois
  const store = useUtilisateurStore()
  if (!store.estConnecte) {
    try {
      await store.charger()
    } catch {
      // Session expirée (401) : le client API a déjà renvoyé vers la connexion.
      // Serveur injoignable : on annule la navigation.
      return false
    }
  }

  // 3. Mot de passe provisoire : il faut le changer avant tout
  if (store.utilisateur.must_change_password) {
    allerAChangerMotDePasse()
    return false
  }

  // 4. Pages réservées au TECH_ADMIN
  if (to.meta.techAdmin && !store.estTechAdmin) {
    return { name: 'accueil' }
  }

  return true
}
