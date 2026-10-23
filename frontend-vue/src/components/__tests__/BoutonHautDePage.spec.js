import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import BoutonHautDePage from '../BoutonHautDePage.vue'

let wrapper
async function defiler(position) {
  window.scrollY = position
  window.dispatchEvent(new Event('scroll'))
  await wrapper.vm.$nextTick()
}
const bouton = () => wrapper.find('[aria-label="Remonter en haut de la page"]')

afterEach(() => {
  wrapper?.unmount()
  window.scrollY = 0
  vi.restoreAllMocks()
})

describe('BoutonHautDePage', () => {
  it('caché en haut de la page, visible dès qu’on a fait défiler', async () => {
    wrapper = mount(BoutonHautDePage)
    expect(bouton().exists()).toBe(false)
    await defiler(600)
    expect(bouton().exists()).toBe(true)
    await defiler(100)
    expect(bouton().exists()).toBe(false)
  })

  it('un clic remonte en haut, en douceur', async () => {
    const remonter = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    wrapper = mount(BoutonHautDePage)
    await defiler(600)
    await bouton().trigger('click')
    expect(remonter).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
  })

  it('n’écoute plus le défilement une fois la page quittée', () => {
    const retirer = vi.spyOn(window, 'removeEventListener')
    wrapper = mount(BoutonHautDePage)
    wrapper.unmount()
    expect(retirer).toHaveBeenCalledWith('scroll', expect.any(Function))
    wrapper = null
  })
})
