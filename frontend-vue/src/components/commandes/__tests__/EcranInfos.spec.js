import { describe, it, expect, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import SelectButton from 'primevue/selectbutton'
import EcranInfos from '../EcranInfos.vue'
import { commandeVide, NOTE_PAR_DEFAUT } from '@/utils/nouvelleCommande'

let wrapper
// L'écran modifie la commande par v-model : on garde la dernière version reçue
function monter(champs = {}) {
  wrapper = mount(EcranInfos, {
    attachTo: document.body,
    props: {
      modelValue: { ...commandeVide('2026-10-22'), ...champs },
      'onUpdate:modelValue': (valeur) => wrapper.setProps({ modelValue: valeur }),
      aujourdhui: '2026-10-22',
    },
  })
  return wrapper
}
const commande = () => wrapper.props('modelValue')
const ids = () => wrapper.findAll('input, textarea').map((e) => e.attributes('id'))
async function choisir(dataTest, valeur) {
  wrapper
    .findAllComponents(SelectButton)
    .find((s) => s.attributes('data-test') === dataTest)
    .vm.$emit('update:modelValue', valeur)
  await flushPromises()
}
afterEach(() => wrapper?.unmount())

describe('EcranInfos', () => {
  it('demande le type de prestation AVANT le nombre de couverts', () => {
    monter()
    expect(ids().indexOf('commande-type')).toBeLessThan(ids().indexOf('commande-couverts'))
  })

  it('mariage : adultes, enfants et part d’un enfant à la place des couverts', () => {
    monter({ type_prestation: 'mariage', nb_adultes: 50, nb_enfants: 10 })
    expect(ids()).toContain('commande-adultes')
    expect(ids()).toContain('commande-taux-enfant')
    expect(ids()).not.toContain('commande-couverts')
    expect(wrapper.text()).toContain('60 convives · 58 parts produites')
  })

  it('« Sans service » par défaut ; avec service, demande les repas du personnel', async () => {
    monter()
    expect(ids()).not.toContain('commande-repas')
    await choisir('service', true)
    expect(commande().avec_service).toBe(true)
    expect(ids()).toContain('commande-repas')
  })

  it('repas du personnel : un compteur avec des boutons − et +', async () => {
    monter({ avec_service: true, nb_repas_personnel: 2 })
    const compteur = wrapper.find('.compteur')
    expect(compteur.findAll('button')).toHaveLength(2)
    const plus = compteur.find('.p-inputnumber-increment-button')
    await plus.trigger('mousedown')
    await plus.trigger('mouseup')
    expect(commande().nb_repas_personnel).toBe(3)
  })

  it('« Ajouter une note ? » : « Oui » ouvre la zone de texte, pré-remplie', async () => {
    monter()
    expect(wrapper.text()).toContain('Ajouter une note ?')
    expect(ids()).not.toContain('commande-notes')
    await choisir('note', true)
    expect(commande().notes).toBe(NOTE_PAR_DEFAUT)
    expect(wrapper.find('#commande-notes').element.value).toBe(NOTE_PAR_DEFAUT)
  })

  it('le texte proposé par défaut est en italique gris, une vraie note non', async () => {
    monter({ a_une_note: true, notes: NOTE_PAR_DEFAUT })
    expect(wrapper.find('#commande-notes').classes()).toContain('note-par-defaut')
    await wrapper.find('#commande-notes').setValue('Sans gluten')
    expect(wrapper.find('#commande-notes').classes()).not.toContain('note-par-defaut')
  })

  it('note : « Non » referme et vide la note', async () => {
    monter({ a_une_note: true, notes: 'Sans gluten' })
    await choisir('note', false)
    expect(commande().notes).toBe('')
    expect(ids()).not.toContain('commande-notes')
  })

  it('le « ? » explique la pondération : formules et produits, arrondi supérieur', async () => {
    monter()
    await wrapper.find('[data-test="aide-ponderation"]').trigger('click')
    await flushPromises()
    const aide = document.querySelector('[data-test="texte-aide-ponderation"]')
    expect(aide.textContent).toContain('des formules et des produits')
    expect(aide.textContent).toContain("arrondies à l'unité supérieure")
  })

  it('affiche le nom du client tel quel (pas de HTML interprété)', async () => {
    monter()
    await wrapper.find('#commande-client').setValue('<b>Dupont</b>')
    expect(commande().nom_client).toBe('<b>Dupont</b>')
  })
})
