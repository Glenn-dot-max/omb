// Pages de l'ancien frontend vers lesquelles on renvoie, tant qu'elles ne sont pas migrées
// isolé dans son propre fichier pour pouvoir le remplacer facilement dans les tests.

// Connexion (migrée en V6)
export function allerALaConnexion() {
  window.location.href = '/pages/login.html'
}

// Page d'arrivée après le choix du mot de passe (Commandes, migrée en V5)
export function allerAuxCommandes() {
  window.location.href = '/pages/commandes.html'
}
