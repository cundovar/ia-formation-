import { describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import AppNavigation from '@/components/layout/AppNavigation.vue'

const Stub = { template: '<div />' }
const cats = [{ id: 1, name: 'Automatiser des tâches avec l\'IA', audience: 'apprendre', superMenu: { id: 20, name: 'Automatiser et gérer les données', ordre: 1 } }]

const monter = async () => {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:p(.*)*', component: Stub }] })
  router.push('/')
  await router.isReady()
  const wrapper = mount(AppNavigation, { props: { cats, menusByCategory: {}, isXlOuPlus: true }, global: { plugins: [router] } })
  await flushPromises()
  return wrapper
}

describe('colonne de navigation', () => {
  it('déplie les parcours « J\'apprends » au clic, sous l\'entrée, sans couvrir les suivantes', async () => {
    const wrapper = await monter()
    const bouton = wrapper.get('[data-testid="deplier-apprendre"]')
    expect(bouton.attributes('aria-expanded')).toBe('false')
    expect(wrapper.find('#parcours-apprendre').exists()).toBe(false)

    await bouton.trigger('click')
    expect(bouton.attributes('aria-expanded')).toBe('true')
    expect(bouton.attributes('aria-controls')).toBe('parcours-apprendre')
    const panneau = wrapper.get('#parcours-apprendre')
    expect(panneau.text()).toContain('Automatiser des tâches avec l\'IA')
    // Dans le flux de la colonne : pas de positionnement absolu qui recouvrirait « Je forme à l'IA »
    expect(panneau.classes()).not.toContain('absolute')

    await bouton.trigger('click')
    expect(wrapper.find('#parcours-apprendre').exists()).toBe(false)
  })

  it('donne un nom au bouton de repli de la colonne', async () => {
    const wrapper = await monter()
    expect(wrapper.find('[aria-label="Replier le menu de gauche"]').exists()).toBe(true)
  })
})
