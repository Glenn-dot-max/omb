import { describe, it, expect } from 'vitest'
import {
  NOTE_PAR_DEFAUT,
  commandeVide,
  partsProduites,
  changerNote,
  erreurEtape,
  donneesPourLeServeur,
} from '../nouvelleCommande'

// Une commande remplie et valide (écrans 1 et 2), modifiée par `champs`
const commande = (champs = {}) => ({
  ...commandeVide('2026-10-22'),
  nom_client: '  Mairie de Caen  ',
  nombre_couverts: 20,
  formules: [{ formule_id: 'f1', nom: 'Brunch', couverts: 20, produits_exclus: ['p9'] }],
  ...champs,
})
const MARIAGE = { type_prestation: 'mariage', nb_adultes: 50, nb_enfants: 10, taux_enfant: 80 }

describe('commande vide (valeurs par défaut)', () => {
  it('sans service, sans note, pondération 100 %, taux enfant 80 %, date du jour', () => {
    expect(commandeVide('2026-10-22')).toMatchObject({
      delivery_date: '2026-10-22',
      delivery_hour: '10:00',
      avec_service: false,
      nb_repas_personnel: 0,
      a_une_note: false,
      notes: '',
      ponderation: 100,
      taux_enfant: 80,
      formules: [],
      produits: [],
    })
  })
})

describe('parts produites (couverts proposés aux formules)', () => {
  it('commande classique : le nombre de couverts', () => {
    expect(partsProduites(commande())).toBe(20)
  })
  it('mariage : adultes + enfants × taux enfant, arrondi à l’unité supérieure', () => {
    expect(partsProduites(commande(MARIAGE))).toBe(58) // 50 + 10 × 80 %
    expect(partsProduites(commande({ ...MARIAGE, nb_enfants: 3 }))).toBe(53) // 50 + 2,4
    expect(partsProduites(commande({ ...MARIAGE, nb_enfants: 5, taux_enfant: 70 }))).toBe(54) // 53,5
  })
})

describe('note', () => {
  it('« Oui » ouvre la note avec « Voir le bon de commande »', () => {
    expect(changerNote(commande(), true)).toMatchObject({
      a_une_note: true,
      notes: NOTE_PAR_DEFAUT,
    })
  })
  it('« Oui » garde une note déjà écrite', () => {
    expect(changerNote(commande({ notes: 'Sans gluten' }), true).notes).toBe('Sans gluten')
  })
  it('« Non » vide la note', () => {
    expect(changerNote(commande({ a_une_note: true, notes: 'Sans gluten' }), false)).toMatchObject({
      a_une_note: false,
      notes: '',
    })
  })
})

describe('vérification de chaque écran', () => {
  it('commande complète : aucune erreur', () => {
    expect([1, 2].map((e) => erreurEtape(commande(), e))).toEqual([null, null])
  })

  it.each([
    [{ nom_client: '  ' }, 'nom du client'],
    [{ nom_client: 'Dupont <b>' }, 'caractères'],
    [{ delivery_date: '' }, 'date'],
    [{ delivery_hour: '' }, 'heure'],
    [{ nombre_couverts: 0 }, 'couverts'],
    [{ ...MARIAGE, nb_adultes: 0, nb_enfants: 0 }, 'adultes'],
    [{ ...MARIAGE, taux_enfant: 120 }, 'taux enfant'],
    [{ ponderation: 0 }, 'pondération'],
    [{ a_une_note: true, notes: '  ' }, 'note'],
    [{ avec_service: true, nb_repas_personnel: null }, 'repas'],
    [{ avec_service: true, nb_repas_personnel: -1 }, 'repas'],
  ])('écran 1 refusé : %o', (champs, motCle) => {
    expect(erreurEtape(commande(champs), 1)).toMatch(new RegExp(motCle, 'i'))
  })

  it('écran 2 : au moins une formule ou un produit, avec des quantités positives', () => {
    expect(erreurEtape(commande({ formules: [] }), 2)).toMatch(/au moins une formule/i)
    expect(
      erreurEtape(
        commande({ formules: [], produits: [{ produit_id: 'p1', quantite: 2, unite: 'kg' }] }),
        2,
      ),
    ).toBeNull()
    expect(
      erreurEtape(commande({ formules: [{ formule_id: 'f1', nom: 'Brunch', couverts: 0 }] }), 2),
    ).toMatch(/Brunch/)
    expect(
      erreurEtape(
        commande({ produits: [{ produit_id: 'p1', nom: 'Café', quantite: 0, unite: 'L' }] }),
        2,
      ),
    ).toMatch(/Café/)
  })

  it('écran 1 : avec service, 0 repas du personnel est accepté', () => {
    expect(erreurEtape(commande({ avec_service: true, nb_repas_personnel: 0 }), 1)).toBeNull()
  })
})

describe('données envoyées au serveur (POST /commandes/complete)', () => {
  it('commande classique : seulement les champs attendus, pondération en décimal', () => {
    expect(donneesPourLeServeur(commande({ ponderation: 90 }))).toEqual({
      nom_client: 'Mairie de Caen',
      delivery_date: '2026-10-22',
      delivery_hour: '10:00',
      type_prestation: 'non-brunch',
      nombre_couverts: 20,
      coefficient_ponderation: 0.9,
      avec_service: false,
      service: false,
      repas_personnel: false,
      notes: null,
      validated: true,
      formules: [{ formule_id: 'f1', quantite_finale: 20, produits_exclus: ['p9'] }],
      produits: [],
    })
  })

  it('mariage : couverts = adultes + enfants, avec le taux enfant', () => {
    expect(donneesPourLeServeur(commande(MARIAGE))).toMatchObject({
      type_prestation: 'mariage',
      nombre_couverts: 60,
      nb_adultes: 50,
      nb_enfants: 10,
      taux_enfant: 80,
    })
  })

  it('service avec repas du personnel, note, commande en attente', () => {
    const donnees = donneesPourLeServeur(
      commande({
        avec_service: true,
        nb_repas_personnel: 4,
        a_une_note: true,
        notes: ' Voir le bon de commande ',
        en_attente: true,
      }),
    )
    expect(donnees).toMatchObject({
      avec_service: true,
      service: true,
      repas_personnel: true,
      nb_repas_personnel: 4,
      notes: 'Voir le bon de commande',
      validated: false,
    })
  })

  it('sans service : jamais de repas du personnel, même saisis avant de décocher', () => {
    const donnees = donneesPourLeServeur(commande({ avec_service: false, nb_repas_personnel: 4 }))
    expect(donnees.repas_personnel).toBe(false)
    expect(donnees).not.toHaveProperty('nb_repas_personnel')
  })

  it('avec service mais 0 repas : pas de repas du personnel', () => {
    const donnees = donneesPourLeServeur(commande({ avec_service: true, nb_repas_personnel: 0 }))
    expect(donnees.repas_personnel).toBe(false)
    expect(donnees).not.toHaveProperty('nb_repas_personnel')
  })

  it('produits ajoutés : quantité et unité', () => {
    const donnees = donneesPourLeServeur(
      commande({ produits: [{ produit_id: 'p1', nom: 'Café', quantite: 2.5, unite: 'L' }] }),
    )
    expect(donnees.produits).toEqual([{ produit_id: 'p1', quantite: 2.5, unite: 'L' }])
  })
})
