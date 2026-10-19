import { describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import MenuLinks from '@/components/navigation/MenuLinks.vue'

const Stub = { template: '<div />' }
const cats = [
  { id: 1, name: 'Automatiser des tâches avec l\'IA', audience: 'apprendre', superMenu: { id: 20, name: 'Automatiser et gérer les données', ordre: 1 } },
  { id: 2, name: 'Construire un atelier', audience: 'former' },
]
const menusByCategory = {
  'Automatiser des tâches avec l\'IA': [{ label: 'Chapitre 1', items: [{ title: 'Premier cours', page: { slug: '/premier-cours' } }] }],
}

const monter = async (props = {}) => {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:p(.*)*', component: Stub }] })
  router.push('/')
  await router.isReady()
  const wrapper = mount(MenuLinks, { props: { cats, menusByCategory, ...props }, global: { plugins: [router] } })
  await flushPromises()
  return wrapper
}

describe('menu mobile et tablette', () => {
  it('déplie au toucher les seuls parcours « J\'apprends », puis les chapitres d\'un parcours', async () => {
    const wrapper = await monter()
    const bouton = wrapper.get('[data-testid="deplier-apprendre-mobile"]')
    expect(bouton.attributes('aria-expanded')).toBe('false')

    await bouton.trigger('click')
    const panneau = wrapper.get('#parcours-apprendre-mobile')
    expect(panneau.text()).toContain('Automatiser des tâches avec l\'IA')
    expect(panneau.text()).not.toContain('Construire un atelier')

    // Un parcours est un bouton : il demande l'ouverture de ses chapitres
    await panneau.get('button.parcours-row').trigger('click')
    expect(wrapper.emitted('openMenu')).toEqual([['Automatiser des tâches avec l\'IA']])

    await wrapper.setProps({ clickMenu: 'Automatiser des tâches avec l\'IA' })
    expect(wrapper.get('.parcours-panel').text()).toContain('Premier cours')
  })

  it('applique la même logique à « Je forme à l\'IA », avec ses propres parcours', async () => {
    const wrapper = await monter()
    await wrapper.get('[data-testid="deplier-former-mobile"]').trigger('click')
    const panneau = wrapper.get('#parcours-former-mobile')
    expect(panneau.text()).toContain('Construire un atelier')
    expect(panneau.text()).not.toContain('Automatiser des tâches')
    expect(panneau.classes()).toContain('audience-panel--green')
    // Les deux entrées s'ouvrent indépendamment
    expect(wrapper.find('#parcours-apprendre-mobile').exists()).toBe(false)
  })

  it('n\'affiche pas de bouton sans parcours, et garde des textes foncés', async () => {
    const wrapper = await monter({ cats: [] })
    expect(wrapper.find('[data-testid="deplier-apprendre-mobile"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="deplier-former-mobile"]').exists()).toBe(false)
    expect(wrapper.findAll('a').every((lien) => !lien.classes().includes('text-gray-600'))).toBe(true)
  })
})
