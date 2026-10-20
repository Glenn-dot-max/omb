import { describe, it, expect, vi } from 'vitest'
import { useAction } from '../useAction'

describe('useAction (anti double-clic)', () => {
  it("ignore un deuxième clic tant que l'action est en cours", async () => {
    let terminer
    const action = vi.fn(() => new Promise((resolve) => (terminer = resolve)))
    const { executer, enCours } = useAction(action)

    const premier = executer('a')
    executer('b') // double-clic : ignoré
    expect(enCours.value).toBe(true)
    expect(action).toHaveBeenCalledOnce()
    expect(action).toHaveBeenCalledWith('a')

    terminer()
    await premier
    expect(enCours.value).toBe(false)
  })

  it("se débloque aussi quand l'action échoue", async () => {
    const { executer, enCours } = useAction(() => Promise.reject(new Error('Erreur')))

    await expect(executer()).rejects.toThrow('Erreur')
    expect(enCours.value).toBe(false)
  })
})
