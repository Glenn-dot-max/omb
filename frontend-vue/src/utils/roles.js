// Les rôles des utilisateurs : valeur enregistrée en base -> libellé affiché
export const ROLES = [
  { valeur: 'USER', libelle: 'Utilisateur' },
  { valeur: 'CATALOG_ADMIN', libelle: 'Administrateur du catalogue' },
  { valeur: 'TECH_ADMIN', libelle: 'Administrateur' },
]

export function libelleRole(role) {
  const valeur = String(role || 'USER').toUpperCase()
  return ROLES.find((r) => r.valeur === valeur)?.libelle || valeur
}
