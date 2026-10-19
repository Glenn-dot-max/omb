// Page de connexion : celle de l'ancien frontend tant que la connexion n'est pas migrée (V6).
// Isolé dans son propre dichier pour pouvoir le remplacer dans les tests.
export function allerALaConnexion() {
  window.location.href = '/pages/login.html'
}
