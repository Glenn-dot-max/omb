import { describe, it, expect } from 'vitest'
import { pluriel } from '../texte'

describe('pluriel', () => {
  it('singulier pour 0 et 1, pluriel à partir de 2', () => {
    expect(pluriel(1, 'couvert')).toBe('1 couvert')
    expect(pluriel(0, 'couvert')).toBe('0 couvert')
    expect(pluriel(20, 'couvert')).toBe('20 couverts')
  })
})
