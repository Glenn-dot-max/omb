// Petites aides pour les textes affichés

// « 1 couvert », « 0 couvert », « 20 couverts » : le pluriel à partir de 2
export const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`
