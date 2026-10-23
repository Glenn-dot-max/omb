import { describe, it, expect } from 'vitest'
import {
  commandeDepuisServeur,
  modificationPourLeServeur,
  copieDeCommande,
} from '../modificationCommande'
import { ajouterFormule, retirerFormule, ajouterProduit, retirerProduit } from '../contenuCommande'

// Ce que renvoie le serveur pour une commande existante
const LIGNE = {
  id: 'cmd-1',
  nom_client: 'Mairie de Caen',
  delivery_date: '2026-11-02',
  delivery_hour: '10:00:00',
  nombre_couverts: 20,
  type_prestation: 'brunch',
  coefficient_ponderation: 0.9,
  avec_service: true,
  nb_repas_personnel: 3,
  notes: 'Sans gluten',
  validated: true,
  nb_adultes: null,
  nb_enfants: null,
  taux_enfant: null,
}
const FORMULES = [
  { id: 708, formule_id: 'f1', quantite_finale: 20, produits_exclus: ['p9'] },
  { id: 709, formule_id: 'f2', quantite_finale: 10, produits_exclus: [] },
]
const PRODUITS = [{ id: 31, produit_id: 'p1', quantite: 2, unite: 'L' }]
const NOMS = { f1: 'Brunch Salé', f2: 'Brunch Sucré', p1: 'Café' }

const origine = () => commandeDepuisServeur(LIGNE, FORMULES, PRODUITS, NOMS)

describe('commande lue sur le serveur → formulaire pré-rempli', () => {
  it('reprend les informations, en % et au format de l’écran', () => {
    expect(origine()).toMatchObject({
      nom_client: 'Mairie de Caen',
      delivery_date: '2026-11-02',
      delivery_hour: '10:00',
      type_prestation: 'brunch',
      nombre_couverts: 20,
      ponderation: 90,
      avec_service: true,
      nb_repas_personnel: 3,
      a_une_note: true,
      notes: 'Sans gluten',
      en_attente: false,
      taux_enfant: 80, // vide en base : 80 % par défaut
    })
  })

  it('reprend les formules (couverts, exclusions) et les produits, avec leurs noms', () => {
    const c = origine()
    expect(c.formules[0]).toEqual({
      commande_formule_id: 708,
      formule_id: 'f1',
      nom: 'Brunch Salé',
      couverts: 20,
      produits_exclus: ['p9'],
    })
    expect(c.produits).toEqual([
      { commande_produit_id: 31, produit_id: 'p1', nom: 'Café', quantite: 2, unite: 'L' },
    ])
  })

  it('commande sans note, en attente, mariage', () => {
    const c = commandeDepuisServeur(
      {
        ...LIGNE,
        notes: null,
        validated: false,
        type_prestation: 'mariage',
        nb_adultes: 50,
        nb_enfants: 10,
        taux_enfant: 70,
      },
      [],
      [],
      {},
    )
    expect(c).toMatchObject({
      a_une_note: false,
      notes: '',
      en_attente: true,
      nb_adultes: 50,
      nb_enfants: 10,
      taux_enfant: 70,
    })
  })
})

describe('modification envoyée au serveur : seulement ce qui a changé', () => {
  it('rien de changé : rien à envoyer', () => {
    expect(modificationPourLeServeur(origine(), origine())).toEqual({})
  })

  it('informations changées : seulement ces champs, pondération en décimal', () => {
    const actuelle = { ...origine(), nom_client: '  Mairie de Caen (salle B)  ', ponderation: 100 }
    expect(modificationPourLeServeur(origine(), actuelle)).toEqual({
      nom_client: 'Mairie de Caen (salle B)',
      coefficient_ponderation: 1,
    })
  })

  it('note retirée : envoyée vide (sinon le serveur garderait l’ancienne)', () => {
    const actuelle = { ...origine(), a_une_note: false, notes: '' }
    expect(modificationPourLeServeur(origine(), actuelle)).toEqual({ notes: '' })
  })

  it('mise en attente, ou service retiré', () => {
    expect(modificationPourLeServeur(origine(), { ...origine(), en_attente: true })).toEqual({
      validated: false,
    })
    expect(modificationPourLeServeur(origine(), { ...origine(), avec_service: false })).toEqual({
      avec_service: false,
      service: false,
      repas_personnel: false,
    })
  })

  it('formules : couverts ou exclusions changés, ajoutée, retirée', () => {
    let actuelle = origine()
    actuelle.formules[0] = { ...actuelle.formules[0], couverts: 25, produits_exclus: [] }
    actuelle = retirerFormule(actuelle, 'f2')
    actuelle = ajouterFormule(actuelle, { id: 'f3', name: 'Pause' }, 12)
    expect(modificationPourLeServeur(origine(), actuelle)).toEqual({
      formules_modifiees: [{ commande_formule_id: 708, quantite_finale: 25, produits_exclus: [] }],
      formules_ajoutees: [{ formule_id: 'f3', quantite_finale: 12, produits_exclus: [] }],
      formules_retirees: [709],
    })
  })

  it('formule dont seules les exclusions ont changé : modifiée aussi', () => {
    const actuelle = origine()
    actuelle.formules[1] = { ...actuelle.formules[1], produits_exclus: ['p4'] }
    expect(modificationPourLeServeur(origine(), actuelle)).toEqual({
      formules_modifiees: [
        { commande_formule_id: 709, quantite_finale: 10, produits_exclus: ['p4'] },
      ],
    })
  })

  it('produits : quantité changée, ajouté, retiré', () => {
    let actuelle = origine()
    actuelle.produits[0] = { ...actuelle.produits[0], quantite: 3 }
    expect(modificationPourLeServeur(origine(), actuelle)).toEqual({
      produits_modifies: [{ commande_produit_id: 31, quantite: 3 }],
    })

    actuelle = retirerProduit(origine(), 'p1', 'L')
    actuelle = ajouterProduit(actuelle, { id: 'p2', name: 'Jus' }, 5, 'L')
    expect(modificationPourLeServeur(origine(), actuelle)).toEqual({
      produits_ajoutes: [{ produit_id: 'p2', quantite: 5, unite: 'L' }],
      produits_retires: [31],
    })
  })
})

describe('duplication : une NOUVELLE commande pré-remplie', () => {
  const TOUT = new Set(['f1', 'f2', 'p1'])

  it('même contenu, sans les identifiants de l’ancienne commande, nom « Copie - »', () => {
    const { commande, nonCopies } = copieDeCommande(origine(), '2026-10-23', TOUT)
    expect(commande.nom_client).toBe('Copie - Mairie de Caen')
    expect(commande.formules).toEqual([
      { formule_id: 'f1', nom: 'Brunch Salé', couverts: 20, produits_exclus: ['p9'] },
      { formule_id: 'f2', nom: 'Brunch Sucré', couverts: 10, produits_exclus: [] },
    ])
    expect(commande.produits).toEqual([{ produit_id: 'p1', nom: 'Café', quantite: 2, unite: 'L' }])
    expect(commande.ponderation).toBe(90)
    expect(commande.nb_repas_personnel).toBe(3)
    expect(nonCopies).toBe(0)
  })

  it('date : gardée si elle est à venir, sinon aujourd’hui (le serveur refuse le passé)', () => {
    expect(copieDeCommande(origine(), '2026-10-23', TOUT).commande.delivery_date).toBe('2026-11-02')
    expect(copieDeCommande(origine(), '2026-11-10', TOUT).commande.delivery_date).toBe('2026-11-10')
  })

  it('une copie d’une commande en attente est une commande normale (validée)', () => {
    const enAttente = { ...origine(), en_attente: true }
    expect(copieDeCommande(enAttente, '2026-10-23', TOUT).commande.en_attente).toBe(false)
  })

  it('formules et produits qui ne sont plus disponibles : pas copiés, et comptés', () => {
    const { commande, nonCopies } = copieDeCommande(origine(), '2026-10-23', new Set(['f1']))
    expect(commande.formules.map((f) => f.formule_id)).toEqual(['f1'])
    expect(commande.produits).toEqual([])
    expect(nonCopies).toBe(2)
  })

  it('l’original n’est pas modifié', () => {
    const avant = origine()
    copieDeCommande(avant, '2026-10-23', TOUT)
    expect(avant).toEqual(origine())
  })
})
