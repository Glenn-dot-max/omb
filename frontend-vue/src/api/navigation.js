// Pages vers lesquelles on change de page en rechargeant (pour repartir d'un état propre).
// Isolé dans son propre fichier pour pouvoir le remplacer facilement dans les tests.
// BASE_URL vaut '/app/' : ce sont les pages Vue.

export const PAGE_CONNEXION = `${import.meta.env.BASE_URL}connexion` // migrée en V6
export const PAGE_COMMANDES = `${import.meta.env.BASE_URL}commandes` // migrée en V5

// Connexion : après une déconnexion ou une session expirée
export function allerALaConnexion() {
  window.location.href = PAGE_CONNEXION
}

// Page d'arrivée après le choix du mot de passe
export function allerAuxCommandes() {
  window.location.href = PAGE_COMMANDES
}
