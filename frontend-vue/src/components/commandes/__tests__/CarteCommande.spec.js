import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CarteCommande from '../CarteCommande.vue'

const COMMANDE = {
  id: 'c1',
  nom_client: '<b>Dupont</b>',
  delivery_date: '2026-10-22',
  delivery_hour: '09:30:00',
  nombre_couverts: 20,
  avec_service: true,
  type_prestation: 'brunch',
  notes: 'Sans gluten',
  validated: true,
}
const monter = (commande = {}, props = {}) =>
  mount(CarteCommande, {
    props: { commande: { ...COMMANDE, ...commande }, aujourdhui: '2026-10-21', ...props },
  })

describe('CarteCommande', () => {
  it('affiche le client (en texte), la date, l’heure, les couverts, le service et les notes', () => {
    const wrapper = monter()
    expect(wrapper.text()).toContain('<b>Dupont</b>')
    expect(wrapper.find('.client b').exists()).toBe(false)
    expect(wrapper.text()).toContain('Demain · ⏰ 09:30')
    expect(wrapper.text()).toContain('20 couverts')
    expect(wrapper.text()).toContain('Avec service')
    expect(wrapper.text()).toContain('Sans gluten')
  })

  it('date : « Aujourd’hui », ou le jour et la date', () => {
    expect(monter({ delivery_date: '2026-10-21' }).text()).toContain("Aujourd'hui")
    expect(monter({ delivery_date: '2026-10-26' }).text()).toContain('Lun 26/10/2026')
  })

  it('commande validée : seulement « Supprimer »', async () => {
    const wrapper = monter()
    expect(wrapper.text()).not.toContain('Confirmer la commande')
    await wrapper.find('[data-test="supprimer-c1"]').trigger('click')
    expect(wrapper.emitted('supprimer')[0][0].id).toBe('c1')
  })

  it('commande en attente : « Confirmer » et « Abandonner »', async () => {
    const wrapper = monter({ validated: false })
    expect(wrapper.text()).toContain('En attente de validation')
    await wrapper.find('[data-test="valider-c1"]').trigger('click')
    expect(wrapper.emitted('valider')[0][0].id).toBe('c1')
  })

  it('commande archivée : aucune action, mais son historique reste consultable', () => {
    const wrapper = monter({ validated: false }, { archivee: true })
    expect(wrapper.find('[data-test^="supprimer"]').exists()).toBe(false)
    expect(wrapper.find('[data-test^="valider"]').exists()).toBe(false)
    expect(wrapper.find('[data-test^="modifier"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="historique-c1"]').exists()).toBe(true)
  })

  it('« Modifier » sur une commande validée comme sur une commande en attente', async () => {
    for (const validated of [true, false]) {
      const wrapper = monter({ validated })
      await wrapper.find('[data-test="modifier-c1"]').trigger('click')
      expect(wrapper.emitted('modifier')[0][0].id).toBe('c1')
    }
  })

  it('chaque commande a son horloge d’historique', () => {
    expect(monter().find('[data-test="historique-c1"]').exists()).toBe(true)
  })
})
