// Vérifie un nouveau mot de passe AVANT l'envoi, pour un message immédiat.
// Ce sont les mêmes règles que le serveur (check_mot_de_passe) : le serveur reste le vrai garde-fou.
// Renvoie le message d'erreur, ou null si tout est bon.
export function verifierNouveauMotDePasse(ancien, nouveau, confirmation) {
  if (nouveau !== confirmation) return 'Les mots de passe ne correspondent pas.'
  if (nouveau.length < 8) return 'Le mot de passe doit contenir au moins 8 caractères.'
  if (!/[A-Z]/.test(nouveau)) return 'Le mot de passe doit contenir au moins une majuscule.'
  if (!/[a-z]/.test(nouveau)) return 'Le mot de passe doit contenir au moins une minuscule.'
  if (!/[0-9]/.test(nouveau)) return 'Le mot de passe doit contenir au moins un chiffre.'
  if (nouveau === ancien) return "Le nouveau mot de passe doit être différent de l'ancien."
  return null
}
