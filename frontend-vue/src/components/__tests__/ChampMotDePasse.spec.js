import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ChampMotDePasse from '../ChampMotDePasse.vue'

function monter(props = {}) {
  return mount(ChampMotDePasse, {
    props: { id: 'mdp', modelValue: '', 'onUpdate:modelValue': () => {}, ...props },
  })
}

describe('ChampMotDePasse', () => {
  it('masqué par défaut, affiché puis remasqué avec le bouton œil', async () => {
    const wrapper = monter()
    const champ = wrapper.find('input')
    const bouton = wrapper.find('button')

    expect(champ.attributes('type')).toBe('password')
    expect(bouton.attributes('aria-label')).toBe('Afficher le mot de passe')

    await bouton.trigger('click')
    expect(champ.attributes('type')).toBe('text')
    expect(bouton.attributes('aria-label')).toBe('Masquer le mot de passe')

    await bouton.trigger('click')
    expect(champ.attributes('type')).toBe('password')
  })

  it('l’œil est dans le champ (même bloc), sans emoji coloré', () => {
    const wrapper = monter()
    const bloc = wrapper.find('.champ-mot-de-passe')
    expect(bloc.find('input').exists()).toBe(true)
    expect(bloc.find('button svg').exists()).toBe(true)
    expect(wrapper.find('button').text()).toBe('')
  })

  it("le bouton n'envoie pas le formulaire", () => {
    expect(monter().find('button').attributes('type')).toBe('button')
  })

  it('relié au parent par v-model', async () => {
    const wrapper = monter({
      modelValue: 'Initial1',
      'onUpdate:modelValue': (valeur) => wrapper.setProps({ modelValue: valeur }),
    })
    expect(wrapper.find('input').element.value).toBe('Initial1')

    await wrapper.find('input').setValue('Nouveau1')
    expect(wrapper.props('modelValue')).toBe('Nouveau1')
  })
})
