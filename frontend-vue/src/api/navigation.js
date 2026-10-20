// Pages de l'ancien frontend vers lesquelles on renvoie, tant qu'elles ne sont pas migrées.
// Isolé dans son propre fichier pour pouvoir le remplacer facilement dans les tests.

// Connexion (migrée en V6)
export function allerALaConnexion() {
  window.location.href = '/pages/login.html'
}

// Changement de mot de passe obligatoire à la première connexion (migré en V2)
export function allerAChangerMotDePasse() {
  window.location.href = '/pages/change-password.html'
}
