import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import DiaporamaActions from '@/components/features/diaporamas/DiaporamaActions.vue'
import DiapositiveHtml from '@/components/features/diaporamas/DiapositiveHtml.vue'
import { maitres, planDiaporama } from '@/diaporamas/miseEnPage'
import demo from '../diaporamas/demo.json'

const telechargerPptx = vi.fn()
vi.mock('@/diaporamas/construirePptx', () => ({ telechargerPptx: (...args) => telechargerPptx(...args) }))
vi.mock('@/diaporamas/images', () => ({ chargerImages: vi.fn().mockResolvedValue({}) }))

const monter = (props = {}) => mount(DiaporamaActions, {
  props: { diaporama: demo, chargerCaptures: vi.fn().mockResolvedValue([]), ...props },
  attachTo: document.body,
})

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('DiaporamaActions', () => {
  it('télécharge le .pptx avec le nom du site', async () => {
    const wrapper = monter()
    await wrapper.get('[data-testid="diaporama-pptx"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.get('[role="status"]').text()).toBe('Le diaporama est téléchargé.'))

    expect(telechargerPptx).toHaveBeenCalledWith(expect.objectContaining({ titre: 'Bien écrire une consigne' }), { images: {}, site: 'Formation IA' })
    expect(wrapper.get('[role="status"]').text()).toBe('Le diaporama est téléchargé.')
    wrapper.unmount()
  })

  it('signale un échec sans bloquer les boutons', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    telechargerPptx.mockRejectedValueOnce(new Error('réseau'))
    const wrapper = monter()
    await wrapper.get('[data-testid="diaporama-pptx"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.get('[role="status"]').text()).toContain('n\'a pas pu être créé'))
    expect(wrapper.get('[data-testid="diaporama-pptx"]').attributes('disabled')).toBeUndefined()
    wrapper.unmount()
  })

  it('affiche l\'aperçu des diapositives à la demande', async () => {
    const wrapper = monter()
    const bouton = wrapper.get('[data-testid="diaporama-apercu"]')
    expect(bouton.attributes('aria-expanded')).toBe('false')

    await bouton.trigger('click')
    await flushPromises()

    expect(bouton.attributes('aria-expanded')).toBe('true')
    const vignettes = wrapper.get('[data-testid="diaporama-vignettes"]').findAll('section')
    expect(vignettes).toHaveLength(demo.diapositives.length)
    expect(vignettes[1].get('h3').text()).toBe('Ce que vous saurez faire')
    wrapper.unmount()
  })

  it('imprime seulement les diapositives, au format de la diapositive ou A4 avec les notes', async () => {
    const formats = []
    vi.spyOn(window, 'print').mockImplementation(() => {
      formats.push(document.head.lastElementChild.textContent)
      expect(document.body.classList.contains('impression-diaporama')).toBe(true)
      expect(document.querySelectorAll('.diaporama-impression__page')).toHaveLength(demo.diapositives.length)
    })
    const wrapper = monter()

    await wrapper.get('[data-testid="diaporama-pdf"]').trigger('click')
    await flushPromises()
    window.dispatchEvent(new Event('afterprint'))
    await flushPromises()
    expect(document.body.classList.contains('impression-diaporama')).toBe(false)
    expect(document.querySelector('.diaporama-impression')).toBeNull()

    await wrapper.get('input[type="checkbox"]').setValue(true)
    await wrapper.get('[data-testid="diaporama-pdf"]').trigger('click')
    await flushPromises()
    expect(document.querySelectorAll('.diaporama-impression__notes').length).toBeGreaterThan(0)
    window.dispatchEvent(new Event('afterprint'))

    expect(formats).toEqual(['@page { size: 13.333in 7.5in; margin: 0; }', '@page { size: A4 portrait; margin: 12mm; }'])
    wrapper.unmount()
  })

  it('titre la section selon la cible', () => {
    const wrapper = monter({ cible: 'chapitre' })
    expect(wrapper.get('h2').text()).toBe('Diaporama du chapitre')
    wrapper.unmount()
  })
})

describe('DiapositiveHtml', () => {
  const plan = planDiaporama(demo, { images: { 42: { data: 'data:image/png;base64,AAAA', alt: 'Conversation fictive' } } })
  const decors = maitres(plan, 'Formation IA')
  const monterDiapositive = (modele) => {
    const index = plan.diapositives.findIndex((d) => d.modele === modele)
    const diapositive = plan.diapositives[index]
    return mount(DiapositiveHtml, { props: { diapositive, maitre: decors[diapositive.maitre], numero: index + 1 } })
  }

  it('présente les points en liste, titre en premier', () => {
    const wrapper = monterDiapositive('objectifs')
    expect(wrapper.attributes('aria-label')).toBe('Diapositive 2 : Ce que vous saurez faire')
    expect(wrapper.find('h3').element).toBe(wrapper.element.querySelector('h3, p, li'))
    expect(wrapper.findAll('li.puce--coche')).toHaveLength(3)
  })

  it('garde le texte alternatif de la capture', () => {
    expect(monterDiapositive('capture').get('img').attributes('alt')).toBe('Conversation fictive')
  })

  it('rend les liens de la dernière diapositive', () => {
    const lien = monterDiapositive('fin').get('a')
    expect(lien.attributes('href')).toBe('https://ia.varascundo.com/spa/cours/exemple')
    expect(lien.attributes('rel')).toBe('noopener')
  })
})
