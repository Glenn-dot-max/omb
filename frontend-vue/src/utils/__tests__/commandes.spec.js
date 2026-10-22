import { describe, it, expect } from 'vitest'
import { blocsDeCommandes, filtrerCommandes, sansAccents } from '../commandes'

// Une commande réduite à l'essentiel
const cmd = (id, date, heure = '10:00:00', couverts = 10, nom = `Client ${id}`) => ({
  id,
  nom_client: nom,
  delivery_date: date,
  delivery_hour: heure,
  nombre_couverts: couverts,
})
const ids = (bloc) => bloc.commandes.map((c) => c.id)
const parCle = (blocs) => Object.fromEntries(blocs.map((b) => [b.cle, b]))

describe('blocs de la liste des commandes', () => {
  // Mercredi 21/10/2026 : J+2 = vendredi 23, dimanche = 25, semaine prochaine = 26/10 → 01/11
  const AUJOURDHUI = '2026-10-21'
  const COMMANDES = [
    cmd('a', '2026-10-21', '14:00:00'),
    cmd('b', '2026-10-21', '09:00:00'),
    cmd('c', '2026-10-23'),
    cmd('d', '2026-10-24', '10:00:00', 30),
    cmd('e', '2026-10-25', '10:00:00', 5),
    cmd('f', '2026-10-26'),
    cmd('g', '2026-11-01'),
    cmd('h', '2026-11-02'),
    cmd('i', '2026-10-20'), // date passée, pas encore archivée (non validée)
  ]

  it('range chaque commande dans un seul bloc, triée par date puis heure', () => {
    const blocs = parCle(blocsDeCommandes(COMMANDES, AUJOURDHUI))
    expect(ids(blocs.prochains)).toEqual(['i', 'b', 'a', 'c'])
    expect(ids(blocs.semaine)).toEqual(['d', 'e'])
    expect(ids(blocs.suivante)).toEqual(['f', 'g'])
    expect(ids(blocs.plusTard)).toEqual(['h'])
  })

  it('donne le titre, les dates et le total de couverts de chaque bloc', () => {
    const blocs = parCle(blocsDeCommandes(COMMANDES, AUJOURDHUI))
    expect(blocs.prochains.titre).toBe('Prochains jours')
    expect(blocs.semaine).toMatchObject({
      titre: 'Semaine en cours',
      debut: '2026-10-24',
      fin: '2026-10-25',
      couverts: 35,
    })
    expect(blocs.suivante).toMatchObject({
      titre: 'Semaine prochaine',
      debut: '2026-10-26',
      fin: '2026-11-01',
    })
    expect(blocs.plusTard.titre).toBe('Plus tard')
  })

  it('le vendredi, la semaine en cours est déjà couverte par les prochains jours', () => {
    // Vendredi 23/10 : J+2 = dimanche 25
    const blocs = parCle(blocsDeCommandes(COMMANDES, '2026-10-23'))
    expect(ids(blocs.prochains)).toEqual(['i', 'b', 'a', 'c', 'd', 'e'])
    expect(blocs.semaine).toBeUndefined() // bloc vide : pas affiché
    expect(ids(blocs.suivante)).toEqual(['f', 'g'])
  })

  it('le samedi, la semaine prochaine ne reprend pas ce qui est dans les prochains jours', () => {
    // Samedi 24/10 : J+2 = lundi 26, déjà dans les prochains jours
    const blocs = parCle(blocsDeCommandes(COMMANDES, '2026-10-24'))
    expect(ids(blocs.prochains)).toContain('f')
    expect(ids(blocs.suivante)).toEqual(['g'])
    expect(blocs.suivante.debut).toBe('2026-10-27')
  })

  it("n'affiche que les blocs qui ont des commandes", () => {
    expect(blocsDeCommandes([], AUJOURDHUI)).toEqual([])
  })
})

describe('filtres de la liste', () => {
  const COMMANDES = [
    cmd('a', '2026-10-21', '10:00:00', 10, 'Société Générale'),
    cmd('b', '2026-10-22', '10:00:00', 10, 'Mairie de Caen'),
    cmd('c', '2026-10-22', '10:00:00', 10, "L'Équipe"),
  ]

  it('trouve les clients dont le nom CONTIENT le texte, sans accents ni majuscules', () => {
    expect(filtrerCommandes(COMMANDES, { recherche: 'gen' }).map((c) => c.id)).toEqual(['a'])
    expect(filtrerCommandes(COMMANDES, { recherche: 'EQUIPE' }).map((c) => c.id)).toEqual(['c'])
    expect(filtrerCommandes(COMMANDES, { recherche: 'e' })).toHaveLength(3)
  })

  it('filtre par date de livraison', () => {
    expect(filtrerCommandes(COMMANDES, { date: '2026-10-22' }).map((c) => c.id)).toEqual(['b', 'c'])
  })

  it('sans filtre : tout', () => {
    expect(filtrerCommandes(COMMANDES, {})).toHaveLength(3)
  })

  it('sansAccents', () => {
    expect(sansAccents('Équipe Crème')).toBe('equipe creme')
  })
})
