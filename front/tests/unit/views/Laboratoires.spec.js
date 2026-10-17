import { beforeEach, describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import router from '@/router'
import LaboratoiresPage from '@/views/LaboratoiresPage.vue'
import LaboratoirePage from '@/views/LaboratoirePage.vue'

const Stub = { template: '<div />' }

const monter = async (component, props = {}) => {
  const memoire = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:p(.*)*', component: Stub }] })
  memoire.push('/')
  await memoire.isReady()
  const wrapper = mount(component, { props, global: { plugins: [memoire] } })
  await flushPromises()
  return wrapper
}

beforeEach(() => setActivePinia(createPinia()))

describe('pages des laboratoires', () => {
  it('déclare les routes du catalogue et d\'un laboratoire', () => {
    expect(router.resolve('/laboratoires').name).toBe('laboratoires')
    const route = router.resolve('/laboratoires/trier-des-emails')
    expect(route.name).toBe('laboratoire')
    expect(route.params.slug).toBe('trier-des-emails')
  })

  it('liste les laboratoires et filtre par niveau', async () => {
    const wrapper = await monter(LaboratoiresPage)
    const liens = wrapper.findAll('[data-testid="laboratoires"] h2 a').map((lien) => lien.attributes('href'))
    expect(liens).toEqual(expect.arrayContaining(['/laboratoires/comprendre-un-workflow', '/laboratoires/trier-des-emails']))
    expect(wrapper.findAll('h1')).toHaveLength(1)

    await wrapper.get('[data-testid="filtre-niveau"]').setValue('avance')
    expect(wrapper.findAll('[data-testid="laboratoires"] h2 a').map((lien) => lien.attributes('href'))).toEqual(['/laboratoires/assistant-documentaire-rag', '/laboratoires/memoire-et-contexte', '/laboratoires/deboguer-un-agent', '/laboratoires/injection-et-permissions'])
  })

  it('ouvre un laboratoire avec ses prérequis', async () => {
    const wrapper = await monter(LaboratoirePage, { slug: 'trier-des-emails' })
    expect(wrapper.get('h1').text()).toBe('Trier automatiquement des e-mails fictifs')
    expect(wrapper.text()).toMatch(/Niveau : Débutant/)
    expect(wrapper.find('a[href="/laboratoires/comprendre-un-workflow"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="bandeau-simulation"]').exists()).toBe(true)
  })

  it('explique qu\'un laboratoire est introuvable', async () => {
    const wrapper = await monter(LaboratoirePage, { slug: 'inconnu' })
    expect(wrapper.find('[data-testid="laboratoire-introuvable"]').exists()).toBe(true)
  })
})
