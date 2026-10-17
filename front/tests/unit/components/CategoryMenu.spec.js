import { describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import CategoryMenu from '@/components/navigation/CategoryMenu.vue'

const Stub = { template: '<div />' }

const cats = [
  { id: 1, name: 'Automatisation avec n8n', superMenu: { id: 20, name: 'Automatiser et gérer les données', ordre: 2 } },
  { id: 2, name: "Découvrir l'IA", superMenu: { id: 10, name: "Découvrir et utiliser l'IA", ordre: 1 } },
  { id: 3, name: 'Sans rubrique' },
]
const menusByCategory = {
  'Automatisation avec n8n': [
    { label: 'Chapitre 1 – Premiers pas', items: [{ title: 'Créer un workflow', page: { slug: '/creer-un-workflow' } }] },
  ],
}

const mountMenu = async (props = {}, path = '/') => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: Stub },
      { path: '/category/:category', component: Stub },
      { path: '/pages/:slug', component: Stub },
    ],
  })
  router.push(path)
  await router.isReady()
  const wrapper = mount(CategoryMenu, { props: { cats, menusByCategory, ...props }, global: { plugins: [router] } })
  await flushPromises()
  return wrapper
}

describe('menu des parcours', () => {
  it('range les parcours sous leur rubrique, dans l\'ordre des rubriques', async () => {
    const wrapper = await mountMenu()

    expect(wrapper.findAll('.rubrique-name').map((name) => name.text())).toEqual([
      "Découvrir et utiliser l'IA",
      'Automatiser et gérer les données',
      'Autres parcours',
    ])
    expect(wrapper.findAll('details')[0].attributes('open')).toBeDefined()
    expect(wrapper.findAll('details')[1].attributes('open')).toBeUndefined()
  })

  it('ouvre la rubrique du parcours affiché', async () => {
    const wrapper = await mountMenu({}, '/category/Automatisation avec n8n')

    expect(wrapper.findAll('details')[1].attributes('open')).toBeDefined()
  })

  it('montre les chapitres et cours du parcours ouvert', async () => {
    const wrapper = await mountMenu({ clickMenu: 'Automatisation avec n8n' })

    expect(wrapper.find('[aria-expanded="true"]').text()).toBe('Automatisation avec n8n')
    expect(wrapper.find('.parcours-chapter-title').text()).toBe('Chapitre 1 – Premiers pas')
    expect(wrapper.find('.parcours-course').attributes('href')).toBe('/pages/creer-un-workflow')
  })
})
