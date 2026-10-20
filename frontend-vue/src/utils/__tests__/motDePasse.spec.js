import { describe, it, expect } from 'vitest'
import { verifierNouveauMotDePasse } from '../motDePasse'

describe('verifierNouveauMotDePasse (mêmes règles que le serveur)', () => {
  it('mot de passe valide : aucune erreur', () => {
    expect(verifierNouveauMotDePasse('AncienMdp1', 'NouveauMdp1', 'NouveauMdp1')).toBeNull()
  })

  it.each([
    ['AncienMdp1', 'NouveauMdp1', 'Autre1234', 'Les mots de passe ne correspondent pas.'],
    ['AncienMdp1', 'Court1', 'Court1', 'Le mot de passe doit contenir au moins 8 caractères.'],
    [
      'AncienMdp1',
      'sansmajuscule1',
      'sansmajuscule1',
      'Le mot de passe doit contenir au moins une majuscule.',
    ],
    [
      'AncienMdp1',
      'SANSMINUSCULE1',
      'SANSMINUSCULE1',
      'Le mot de passe doit contenir au moins une minuscule.',
    ],
    [
      'AncienMdp1',
      'SansChiffre',
      'SansChiffre',
      'Le mot de passe doit contenir au moins un chiffre.',
    ],
    [
      'AncienMdp1',
      'AncienMdp1',
      'AncienMdp1',
      "Le nouveau mot de passe doit être différent de l'ancien.",
    ],
  ])('refus : %s -> %s', (ancien, nouveau, confirmation, message) => {
    expect(verifierNouveauMotDePasse(ancien, nouveau, confirmation)).toBe(message)
  })
})
