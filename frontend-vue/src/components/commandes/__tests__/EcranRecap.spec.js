import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import EcranRecap from '../EcranRecap.vue'
import { commandeVide } from '@/utils/nouvelleCommande'

const commande = (champs = {}) => ({
  ...commandeVide('2026-10-26'),
  nom_client: "L'Équipe",
  type_prestation: 'brunch',
  nombre_couverts: 20,
  delivery_hour: '09:30',
  formules: [{ formule_id: 'f1', nom: 'Brunch Salé', couverts: 20, produits_exclus: ['p9'] }],
  produits: [{ produit_id: 'p1', nom: 'Café', quantite: 2.5, unite: 'L' }],
  ...champs,
})
const monter = (champs) => mount(EcranRecap, { props: { commande: commande(champs) } })

describe('EcranRecap', () => {
  it('reprend les informations, les formules et les produits', () => {
    const texte = monter().text()
    expect(texte).toContain("L'Équipe")
    expect(texte).toContain('Brunch')
    expect(texte).toContain('Lun 26/10/2026 à 09:30')
    expect(texte).toContain('20 couverts')
    expect(texte).toContain('1 produit(s) retiré(s)')
    expect(texte).toContain('Café · 2.5 L')
    expect(texte).toContain('Sans service')
    expect(texte).toContain('Aucune') // pas de note
  })

  it('mariage : adultes, enfants et parts produites', () => {
    const texte = monter({
      type_prestation: 'mariage',
      nb_adultes: 50,
      nb_enfants: 10,
      taux_enfant: 80,
    }).text()
    expect(texte).toContain('50 adultes + 10 enfants (enfant à 80 %) = 58 parts')
  })

  it('pondération différente de 100 % : rappelle l’arrondi à l’unité supérieure', () => {
    expect(monter().find('[data-test="recap-arrondi"]').exists()).toBe(false)
    expect(monter({ ponderation: 90 }).find('[data-test="recap-arrondi"]').text()).toContain(
      "arrondies à l'unité supérieure",
    )
  })

  it('service, repas du personnel, note et mise en attente', () => {
    const texte = monter({
      avec_service: true,
      nb_repas_personnel: 4,
      a_une_note: true,
      notes: 'Sans gluten',
      en_attente: true,
    }).text()
    expect(texte).toMatch(/Avec service\s*·\s*4 repas du personnel/)
    expect(texte).toContain('Sans gluten')
    expect(texte).toContain('EN ATTENTE')
  })

  it('« Modifier » renvoie à l’écran concerné', async () => {
    const wrapper = monter()
    await wrapper.find('[data-test="modifier-2"]').trigger('click')
    expect(wrapper.emitted('aller')[0]).toEqual(['2'])
  })
})
