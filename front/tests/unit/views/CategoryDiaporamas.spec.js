import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'

// Page d'un parcours : la présentation du parcours entier est distincte des diaporamas de chapitre
const cats = ref([{ id: 7, name: 'automatiser', audience: 'apprendre' }])
const menus = ref([
  { title: 'Relier des étapes', category: { id: 7, name: 'automatiser' }, menu: { id: 3, label: 'Construire' }, page: { slug: '/relier' } },
])
vi.mock('@/utils/fetchDataPwa', () => ({ useData: () => ({ cats, menus, fetchMenus: vi.fn(async () => {}) }) }))

const chargerDiaporamas = vi.fn(async ({ parcours, chapitres }) => {
  if (parcours === 7) {
    return [{ id: 12, titre: 'Automatiser des tâches avec l’IA', parcours: 7, theme: 'atelier_visuel', couverture: { exploites: 3, total: 18 }, diapositives: [{ modele: 'titre' }, { modele: 'fin' }] }]
  }
  if (chapitres?.includes(3)) return [{ id: 13, titre: 'Construire', chapitre: 3, diapositives: [{ modele: 'titre' }] }]
  return []
})
vi.mock('@/services/diaporamas', async (original) => ({ ...(await original()), chargerDiaporamas }))

const { default: CategoryPage } = await import('@/views/CategoryPage.vue')

describe('page d\'un parcours : diaporamas', () => {
  it('présente le diaporama du parcours, avec sa couverture, à part des diaporamas de chapitre', async () => {
    setActivePinia(createPinia())
    const Stub = { template: '<div />' }
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: Stub },
        { path: '/apprendre', component: Stub },
        { path: '/category/:category', component: Stub },
        { path: '/diaporamas/:id/projection', name: 'diaporama-projection', component: Stub },
      ],
    })
    router.push('/category/automatiser')
    await router.isReady()
    const wrapper = mount(CategoryPage, { global: { plugins: [router] } })
    await flushPromises()

    expect(chargerDiaporamas).toHaveBeenCalledWith({ parcours: 7 })
    const presentation = wrapper.get('[data-testid="parcours-presentation"]')
    expect(presentation.get('h2').text()).toBe('Présentation du parcours')
    expect(presentation.get('[data-testid="diaporama-couverture"]').text()).toContain('3 cours publiés sur 18')
    expect(presentation.get('a[href="/diaporamas/12/projection"]').exists()).toBe(true)
    // Le diaporama du chapitre reste dans son chapitre, avec son propre titre
    expect(wrapper.get('[data-testid="chapters"]').text()).toContain('Diaporama du chapitre')
    expect(wrapper.findAll('h2').filter((h) => h.text() === 'Présentation du parcours')).toHaveLength(1)
  })
})
