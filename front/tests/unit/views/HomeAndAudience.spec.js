import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'

// useData ouvre IndexedDB et appelle l'API : on le remplace par des données contrôlées
const cats = ref([])
const menus = ref([])
const fetchMenus = vi.fn(async () => {})
vi.mock('@/utils/fetchDataPwa', () => ({ useData: () => ({ cats, menus, fetchMenus }) }))

const { default: HomePage } = await import('@/components/features/home/HomePage.vue')
const { default: AudiencePage } = await import('@/views/AudiencePage.vue')
const { default: CategoryPage } = await import('@/views/CategoryPage.vue')
const { default: RubriquePage } = await import('@/views/RubriquePage.vue')

const Stub = { template: '<div />' }

const mountAt = async (component, props = {}, path = '/') => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: Stub },
      { path: '/apprendre', component: Stub },
      { path: '/former', component: Stub },
      { path: '/category/:category', component: Stub },
      { path: '/rubrique/:id', component: Stub },
      { path: '/laboratoires', component: Stub },
    ],
  })
  router.push(path)
  await router.isReady()
  const wrapper = mount(component, { props, global: { plugins: [router] } })
  await flushPromises()
  return wrapper
}

const hrefs = (wrapper) => wrapper.findAll('a').map((link) => link.attributes('href'))

beforeEach(() => {
  setActivePinia(createPinia())
  cats.value = []
  menus.value = []
})

describe('accueil', () => {
  it('propose les laboratoires', async () => {
    const wrapper = await mountAt(HomePage)
    expect(wrapper.get('[data-testid="entry-laboratoires"] h2 a').attributes('href')).toBe('/laboratoires')
  })

  it('propose les deux entrées comme des liens titrés', async () => {
    const wrapper = await mountAt(HomePage)

    const apprendre = wrapper.get('[data-testid="entry-apprendre"] h2 a')
    const former = wrapper.get('[data-testid="entry-former"] h2 a')
    expect(apprendre.text()).toBe("J'apprends à utiliser l'IA")
    expect(apprendre.attributes('href')).toBe('/apprendre')
    expect(former.text()).toBe("Je forme à l'IA")
    expect(former.attributes('href')).toBe('/former')
  })

  it('a un seul titre principal et rappelle que le site n\'est pas un service officiel', async () => {
    const wrapper = await mountAt(HomePage)

    expect(wrapper.findAll('h1')).toHaveLength(1)
    expect(wrapper.text()).toContain("Ce site n'est pas un service de l'administration")
    expect(wrapper.text()).not.toMatch(/inscri(s|v)ez-vous|connexion/i)
  })
})

describe('catalogue d\'un public', () => {
  it('liste les parcours de ce public et renvoie vers l\'autre entrée', async () => {
    cats.value = [
      { id: 1, name: 'messagerie', audience: 'apprendre' },
      { id: 2, name: 'animer un atelier', audience: 'former' },
    ]
    menus.value = [{ category: { id: 1 } }, { category: { id: 2 } }]

    const wrapper = await mountAt(AudiencePage, { audienceKey: 'apprendre' })

    expect(fetchMenus).toHaveBeenCalled()
    expect(wrapper.get('h1').text()).toBe("J'apprends à utiliser l'IA")
    const list = wrapper.get('[data-testid="parcours-list"]')
    expect(list.findAll('li')).toHaveLength(1)
    expect(list.get('a').attributes('href')).toBe('/category/messagerie')
    expect(list.text()).toContain('1 cours')
    expect(hrefs(wrapper)).toContain('/former')
  })

  it('réserve une place à la miniature : image si le parcours en a une, icône sinon', async () => {
    cats.value = [
      { id: 1, name: 'avec miniature', audience: 'apprendre', ordre: 1, illustrationUrl: '/uploads/course-media/a.png', illustrationAlt: 'Un clavier et une souris' },
      { id: 2, name: 'sans miniature', audience: 'apprendre', ordre: 2 },
    ]
    menus.value = [{ category: { id: 1 } }, { category: { id: 2 } }]

    const wrapper = await mountAt(AudiencePage, { audienceKey: 'apprendre' })

    const thumbs = wrapper.findAll('[data-testid="parcours-thumb"]')
    expect(thumbs).toHaveLength(2)
    const image = thumbs[0].get('img')
    expect(image.attributes('src')).toBe('/uploads/course-media/a.png')
    expect(image.attributes('alt')).toBe('Un clavier et une souris')
    expect(thumbs[1].find('img').exists()).toBe(false)
    expect(thumbs[1].get('i').attributes('aria-hidden')).toBe('true')
  })

  it('annonce simplement qu\'aucun parcours n\'est encore publié', async () => {
    const wrapper = await mountAt(AudiencePage, { audienceKey: 'former' })

    expect(wrapper.find('[data-testid="parcours-list"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="parcours-empty"]').text()).toContain('en préparation')
  })
})

describe('parcours', () => {
  it('affiche un cours publié sans module', async () => {
    cats.value = [{ id: 1, name: 'Premiers gestes numériques', audience: 'apprendre' }]
    menus.value = [{
      title: 'Utiliser un écran tactile',
      category: { id: 1, name: 'Premiers gestes numériques' },
      menu: null,
      page: { slug: '/utiliser-un-ecran-tactile' },
    }]

    const wrapper = await mountAt(
      CategoryPage,
      {},
      '/category/Premiers%20gestes%20num%C3%A9riques',
    )

    expect(wrapper.text()).toContain('Premiers gestes numériques')
    expect(wrapper.text()).toContain('Utiliser un écran tactile')
    expect(wrapper.get('a[href="/pages/utiliser-un-ecran-tactile"]').exists()).toBe(true)
  })
})

describe('rubriques', () => {
  const automatiser = { id: 3, name: '3. Automatiser et gérer les données' }
  const setRubriques = () => {
    cats.value = [
      { id: 1, name: 'automatisation avec n8n', audience: 'apprendre', superMenu: automatiser },
      { id: 2, name: 'stockage des données', audience: 'apprendre', superMenu: automatiser },
    ]
    menus.value = [{ category: { id: 1 } }, { category: { id: 2 } }]
  }

  it('affiche les rubriques à l\'accueil, en gardant les deux entrées par profil', async () => {
    setRubriques()
    const wrapper = await mountAt(HomePage)

    const rubrique = wrapper.get('[data-testid="rubriques-list"] h3 a')
    expect(rubrique.text()).toBe('3. Automatiser et gérer les données')
    expect(rubrique.attributes('href')).toBe('/rubrique/3')
    expect(wrapper.get('[data-testid="rubriques-list"]').text()).toContain('Automatisation avec n8n')
    expect(wrapper.find('[data-testid="entry-former"]').exists()).toBe(true)
    expect(wrapper.findAll('h1')).toHaveLength(1)
  })

  it('n\'affiche que les parcours de la rubrique ouverte', async () => {
    setRubriques()
    cats.value.push({ id: 4, name: 'autre rubrique', audience: 'apprendre', superMenu: { id: 5, name: 'Autre' } })
    menus.value.push({ category: { id: 4 } })

    const wrapper = await mountAt(RubriquePage, { id: '3' })

    expect(wrapper.get('h1').text()).toBe('3. Automatiser et gérer les données')
    expect(wrapper.get('[data-testid="parcours-list"]').findAll('li')).toHaveLength(2)
    expect(wrapper.text()).not.toContain('Autre rubrique')
  })

  it('présente les modules d\'un parcours comme des chapitres numérotés', async () => {
    cats.value = [{ id: 1, name: 'n8n', audience: 'apprendre' }]
    const course = (title, slug, label) => ({ title, category: { id: 1, name: 'n8n' }, menu: { label }, page: { slug } })
    menus.value = [
      course('Premier nœud', '/premier-noeud', 'Construire un premier workflow'),
      course('Pourquoi automatiser', '/pourquoi', 'Comprendre l’automatisation'),
    ]

    const wrapper = await mountAt(CategoryPage, {}, '/category/n8n')

    const titles = wrapper.findAll('[data-testid="chapters"] .chapter-title').map((t) => t.text())
    expect(titles).toEqual(['Chapitre 1 — Construire un premier workflow', 'Chapitre 2 — Comprendre l’automatisation'])
    expect(wrapper.get('a[href="/pages/pourquoi"]').exists()).toBe(true)
  })
})
