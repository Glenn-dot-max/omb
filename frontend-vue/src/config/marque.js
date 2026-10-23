// Identité de l'organisation affichée dans l'application (marque blanche).
// Aujourd'hui : les valeurs d'Oh My Brunch
// Plus tard (tâche T.7) : chargées depuis le backend, selon l'organisation de l'utilisateur.
// Règle : aucun composant n'écrit le nom de la marque en dur, il lit cette configuration.
export const marque = {
  nom: 'Oh My Brunch',
  emoji: '🥐',
  // Logo de l'ancien frontend (même site, dossier assets/) : page de connexion
  logo: '/assets/logo-rond.svg',
}
