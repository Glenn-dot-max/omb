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

// Mot de passe provisoire (création d'un compte, réinitialisation par l'admin).
// crypto.getRandomValues : vrai hasard, contrairement à Math.random (prévisible).
// Respecte les règles du serveur : au moins une majuscule, une minuscule et un chiffre.
// Sans caractères faciles à confondre en le recopiant (I, l, O, 0, 1).
const MAJUSCULES = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const MINUSCULES = 'abcdefghijkmnopqrstuvwxyz'
const CHIFFRES = '23456789'

function entierAuHasard(max) {
  const nombre = new Uint32Array(1)
  crypto.getRandomValues(nombre)
  return nombre[0] % max
}
const caractereAuHasard = (alphabet) => alphabet[entierAuHasard(alphabet.length)]

export function genererMotDePasse(longueur = 12) {
  const tous = MAJUSCULES + MINUSCULES + CHIFFRES
  // Un caractère de chaque sorte garanti, le reste au hasard
  const caracteres = [
    caractereAuHasard(MAJUSCULES),
    caractereAuHasard(MINUSCULES),
    caractereAuHasard(CHIFFRES),
  ]
  while (caracteres.length < longueur) caracteres.push(caractereAuHasard(tous))
  // Mélange : les caractères garantis ne sont pas toujours au début
  for (let i = caracteres.length - 1; i > 0; i--) {
    const j = entierAuHasard(i + 1)
    ;[caracteres[i], caracteres[j]] = [caracteres[j], caracteres[i]]
  }
  return caracteres.join('')
}
