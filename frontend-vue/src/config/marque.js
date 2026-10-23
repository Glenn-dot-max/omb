// Identité de l'organisation affichée dans l'application (marque blanche).
// Aujourd'hui : les valeurs d'Oh My Brunch
// Plus tard (tâche T.7) : chargées depuis le backend, selon l'organisation de l'utilisateur.
// Règle : aucun composant n'écrit le nom de la marque en dur, il lit cette configuration.
export const marque = {
  nom: 'Oh My Brunch',
  emoji: '🥐',
  // Logo de l'ancien frontend (même site, dossier assets/) : page de connexion
  logo: '/assets/logo-rond.svg',
  // « Mot de passe oublié ? » : la personne à qui écrire, tant que l'envoi d'un lien par email
  // n'est pas en place (Resend, BACKLOG B1). Mettre null pour revenir au formulaire d'envoi du lien.
  contactMotDePasse: 'glenn_duval@outlook.com',
}
