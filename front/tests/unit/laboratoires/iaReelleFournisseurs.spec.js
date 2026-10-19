import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import LaboratoirePlayer from '@/components/features/laboratoires/LaboratoirePlayer.vue'
import { trouverLaboratoire } from '@/laboratoires/catalogue'
import { ErreurIaReelle, FOURNISSEURS, LIMITES_IA_REELLE, repondre } from '@/services/iaReelle'
import { ADRESSE as ADRESSE_DEEPSEEK } from '@/services/iaReelle/deepseek'
import { ADRESSE as ADRESSE_GLM } from '@/services/iaReelle/glm'
import { useIaReelleStore } from '@/stores/iaReelle'

// Valeurs de test, jamais de vraies clés
// Construites à l'exécution pour ne ressembler à aucune vraie clé dans le code source
const FICTIF = 'EXEMPLEFICTIF'
const CLES = { deepseek: `sk-${FICTIF.repeat(3)}`, glm: `${FICTIF.repeat(3)}.${FICTIF}` }
const reponseJson = (statut, corps) => ({ ok: statut >= 200 && statut < 300, status: statut, json: async () => corps })
const succes = (modele) => vi.fn(async () => reponseJson(200, { model: modele, choices: [{ message: { role: 'assistant', content: 'Bonjour !' } }] }))
const appel = (fournisseur, options = {}) => repondre({ fournisseur, modele: FOURNISSEURS[fournisseur].modeles[0].id, cle: CLES[fournisseur], consigne: 'Sois poli.', contexte: 'Quels horaires ?', ...options })

describe('fournisseurs compatibles OpenAI', () => {
  it('sont proposés par ordre alphabétique, avec le lieu de traitement des données', () => {
    expect(Object.keys(FOURNISSEURS)).toEqual(['anthropic', 'deepseek', 'glm'])
    expect(FOURNISSEURS.deepseek).toMatchObject({ lieuDonnees: 'en Chine', horsUnionEuropeenne: true })
    expect(FOURNISSEURS.glm.aideCle).toMatch(/z\.ai/)
    expect(FOURNISSEURS.glm.formatCle.test(CLES.glm)).toBe(true)
    expect(FOURNISSEURS.deepseek.formatCle.test(CLES.deepseek)).toBe(true)
    expect(FOURNISSEURS.deepseek.formatCle.test('sk-ant-test-0000000000000000000000')).toBe(false)
  })

  it.each([
    ['deepseek', ADRESSE_DEEPSEEK, 'deepseek-flash'],
    ['glm', ADRESSE_GLM, 'glm-4.7-flash'],
  ])('%s : clé seulement dans l\'en-tête, sans réflexion préalable', async (id, adresse, modele) => {
    const fetch = succes(modele)
    expect(await appel(id, { fetch })).toEqual({ texte: 'Bonjour !', fournisseur: FOURNISSEURS[id].libelle, modele })
    const [url, init] = fetch.mock.calls[0]
    expect(url).toBe(adresse)
    expect(init).toMatchObject({ method: 'POST', credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store' })
    expect(init.headers.authorization).toBe(`Bearer ${CLES[id]}`)
    expect(init.body).not.toContain(CLES[id])
    expect(JSON.parse(init.body)).toEqual({
      model: modele,
      max_tokens: LIMITES_IA_REELLE.maxJetons,
      messages: [{ role: 'system', content: 'Sois poli.' }, { role: 'user', content: 'Quels horaires ?' }],
      thinking: { type: 'disabled' },
      stream: false,
    })
  })

  it('omet le message système sans consigne et refuse une réponse vide', async () => {
    const fetch = succes('deepseek-flash')
    await appel('deepseek', { fetch, consigne: '' })
    expect(JSON.parse(fetch.mock.calls[0][1].body).messages).toEqual([{ role: 'user', content: 'Quels horaires ?' }])
    const vide = vi.fn(async () => reponseJson(200, { choices: [{ message: { content: '', reasoning_content: 'Je réfléchis…' } }] }))
    await expect(appel('deepseek', { fetch: vide })).rejects.toMatchObject({ code: 'REPONSE_ILLISIBLE' })
  })

  it.each([
    ['deepseek', 401, {}, 'CLE_REFUSEE'],
    ['deepseek', 402, {}, 'CREDIT_EPUISE'],
    ['deepseek', 429, {}, 'TROP_DE_REQUETES'],
    ['deepseek', 503, {}, 'INDISPONIBLE'],
    ['deepseek', 422, {}, 'DEMANDE_REFUSEE'],
    ['glm', 401, { error: { code: '1000' } }, 'CLE_REFUSEE'],
    ['glm', 429, { error: { code: '1113' } }, 'CREDIT_EPUISE'],
    ['glm', 429, { error: { code: '1302' } }, 'TROP_DE_REQUETES'],
    ['glm', 400, { error: { code: '1211' } }, 'MODELE_INCONNU'],
    ['glm', 400, { error: { code: '1301' } }, 'CONTENU_FILTRE'],
  ])('%s : statut %i traduit en message clair, sans la clé', async (id, statut, corps, code) => {
    const exception = await appel(id, { fetch: vi.fn(async () => reponseJson(statut, corps)) }).catch((erreur) => erreur)
    expect(exception).toBeInstanceOf(ErreurIaReelle)
    expect(exception.code).toBe(code)
    expect(exception.message).not.toContain(CLES[id])
  })
})

describe('panneau avec plusieurs fournisseurs', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    document.body.innerHTML = ''
  })

  it('dit où sont traitées les données et change de modèle avec le fournisseur', async () => {
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:p(.*)*', component: { template: '<div />' } }] })
    router.push('/')
    await router.isReady()
    const wrapper = mount(LaboratoirePlayer, { props: { laboratoire: trouverLaboratoire('premier-agent') }, global: { plugins: [router] }, attachTo: document.body })
    await flushPromises()
    await wrapper.get('[data-testid="mode-reel"]').setValue(true)

    expect(wrapper.findAll('#ia-fournisseur option').map((option) => option.text())).toEqual(['Anthropic', 'DeepSeek', 'GLM (Zhipu AI)'])
    expect(wrapper.get('[data-testid="ia-lieu-donnees"]').text()).toMatch(/Anthropic, qui les traite aux États-Unis, hors de l'Union européenne/)

    await wrapper.get('#ia-fournisseur').setValue('glm')
    expect(useIaReelleStore().modele).toBe('glm-4.7-flash')
    expect(wrapper.get('[data-testid="ia-lieu-donnees"]').text()).toMatch(/GLM \(Zhipu AI\), qui les traite en Chine/)
    expect(wrapper.get('#ia-cle-aide').text()).toMatch(/clé z\.ai .* ne fonctionne pas/)
    wrapper.unmount()
  })
})
