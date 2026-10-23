import { describe, it, expect } from 'vitest'
import { libelleAction, formaterHorodatage, resumeDetails } from '../historique'

describe('historique : libellés et dates', () => {
  it('nomme chaque action en français', () => {
    expect(libelleAction('creation')).toBe('Création')
    expect(libelleAction('modification')).toBe('Modification')
    expect(libelleAction('validation')).toBe('Validation')
    expect(libelleAction('suppression')).toBe('Suppression')
  })

  it('affiche la date et l’heure de Paris (le serveur enregistre en heure universelle)', () => {
    // 10:05 UTC le 23 octobre = 12:05 à Paris (heure d'été) ; 09:00 UTC le 2 novembre = 10:00 (hiver)
    expect(formaterHorodatage('2026-10-23T10:05:00+00:00')).toBe('ven. 23/10/2026 à 12:05')
    expect(formaterHorodatage('2026-11-02T09:00:00+00:00')).toBe('lun. 02/11/2026 à 10:00')
  })
})

describe('historique : ce qui a changé', () => {
  it('création : client, livraison, couverts et contenu', () => {
    expect(
      resumeDetails('creation', {
        nom_client: 'Martin',
        delivery_date: '2026-11-02',
        delivery_hour: '10:00:00',
        nombre_couverts: 20,
        validated: false,
        formules: 2,
        produits: 1,
      }),
    ).toEqual([
      'Client : Martin',
      'Livraison : 02/11/2026 à 10:00',
      'Couverts : 20',
      '2 formule(s), 1 produit(s) ajouté(s)',
      'En attente de validation',
    ])
  })

  it('modification : chaque champ changé, avec un libellé et une valeur lisibles', () => {
    expect(
      resumeDetails('modification', {
        champs: {
          nom_client: 'Martin SA',
          delivery_date: '2026-11-03',
          coefficient_ponderation: 0.9,
          avec_service: true,
          service: true, // ancien champ en double : pas affiché
          notes: null,
        },
        formules_modifiees: 1,
        formules_ajoutees: 0,
        produits_ajoutes: 2,
      }),
    ).toEqual([
      'Client → Martin SA',
      'Date de livraison → 03/11/2026',
      'Pondération → 90 %',
      'Service → Oui',
      'Note → (vide)',
      '1 formule(s) modifiée(s)',
      '2 produit(s) ajouté(s)',
    ])
  })

  it('suppression : le client et la date de la commande supprimée', () => {
    expect(
      resumeDetails('suppression', { nom_client: 'Martin', delivery_date: '2026-11-02' }),
    ).toEqual(['Client : Martin', 'Livraison prévue : 02/11/2026'])
  })

  it('validation, ou détails absents : rien de plus', () => {
    expect(resumeDetails('validation', {})).toEqual([])
    expect(resumeDetails('modification', null)).toEqual([])
  })
})
