import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import LaboratoirePlayer from '@/components/features/laboratoires/LaboratoirePlayer.vue'
import { trouverLaboratoire } from '@/laboratoires/catalogue'
import { validerLaboratoire } from '@/laboratoires/catalogue/validerLaboratoire'
import { evaluerCriteres } from '@/laboratoires/moteur/criteres'
import { executerTout } from '@/laboratoires/moteur/execution'
import api from '@/services/api'
import { LOGOUT_EVENT } from '@/services/auth'
import { ErreurIaReelle, LIMITES_IA_REELLE, repondre } from '@/services/iaReelle'
import { ADRESSE } from '@/services/iaReelle/anthropic'
import { useIaReelleStore } from '@/stores/iaReelle'
import { useLaboratoireStore } from '@/stores/laboratoire'

// Valeur de test, jamais une vraie clé
const CLE = 'sk-ant-test-0000000000000000000000'
const premierAgent = trouverLaboratoire('premier-agent')
const jeu = (id) => premierAgent.jeuxDeDonnees.find((candidat) => candidat.id === id)

const reponseJson = (statut, corps) => ({ ok: statut >= 200 && statut < 300, status: statut, json: async () => corps })
const succes = (texte = 'Bonjour, la médiathèque ouvre à 10 h.') => vi.fn(async () => reponseJson(200, { model: 'claude-haiku-5-5', content: [{ type: 'text', text: texte }] }))
const appel = (options = {}) => repondre({ fournisseur: 'anthropic', modele: 'claude-haiku-5-5', cle: CLE, consigne: 'Sois poli.', contexte: 'Quels horaires ?', ...options })

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('appel direct au fournisseur', () => {
  it('envoie la clé seulement au fournisseur, sans cookie ni adresse de page', async () => {
    const fetch = succes()
    const reponse = await appel({ fetch })
    expect(reponse).toEqual({ texte: 'Bonjour, la médiathèque ouvre à 10 h.', fournisseur: 'Anthropic', modele: 'claude-haiku-5-5' })

    const [url, init] = fetch.mock.calls[0]
    expect(url).toBe(ADRESSE)
    expect(init).toMatchObject({ method: 'POST', credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store' })
    expect(init.headers).toMatchObject({ 'x-api-key': CLE, 'anthropic-dangerous-direct-browser-access': 'true' })
    const corps = JSON.parse(init.body)
    expect(corps).toEqual({ model: 'claude-haiku-5-5', max_tokens: LIMITES_IA_REELLE.maxJetons, system: 'Sois poli.', messages: [{ role: 'user', content: 'Quels horaires ?' }] })
    expect(init.body).not.toContain(CLE)
  })

  it('transmet une donnée structurée en JSON lisible, ou signale son absence', async () => {
    const fetch = succes()
    await appel({ fetch, contexte: { texte: 'Bonjour' } })
    await appel({ fetch, contexte: undefined, consigne: '' })
    expect(JSON.parse(fetch.mock.calls[0][1].body).messages[0].content).toBe('{\n  "texte": "Bonjour"\n}')
    const sansContexte = JSON.parse(fetch.mock.calls[1][1].body)
    expect(sansContexte.messages[0].content).toBe('(Aucune donnée transmise.)')
    expect(sansContexte).not.toHaveProperty('system')
  })

  it('refuse avant tout appel une clé absente, un modèle inconnu ou une entrée trop longue', async () => {
    const fetch = succes()
    await expect(appel({ fetch, cle: '  ' })).rejects.toMatchObject({ code: 'CLE_MANQUANTE' })
    await expect(appel({ fetch, modele: 'autre' })).rejects.toMatchObject({ code: 'MODELE_INCONNU' })
    await expect(appel({ fetch, fournisseur: 'inconnu' })).rejects.toBeInstanceOf(ErreurIaReelle)
    await expect(appel({ fetch, contexte: 'x'.repeat(LIMITES_IA_REELLE.message + 1) })).rejects.toMatchObject({ code: 'ENTREE_TROP_LONGUE' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it.each([
    [401, {}, 'CLE_REFUSEE'],
    [403, {}, 'ACCES_REFUSE'],
    [400, { error: { message: 'Your credit balance is too low' } }, 'CREDIT_EPUISE'],
    [429, {}, 'TROP_DE_REQUETES'],
    [404, { error: { type: 'not_found_error' } }, 'MODELE_INCONNU'],
    [529, {}, 'INDISPONIBLE'],
    [400, {}, 'DEMANDE_REFUSEE'],
  ])('traduit le statut %i en message clair, sans la clé', async (statut, corps, code) => {
    const exception = await appel({ fetch: vi.fn(async () => reponseJson(statut, corps)) }).catch((erreur) => erreur)
    expect(exception).toBeInstanceOf(ErreurIaReelle)
    expect(exception.code).toBe(code)
    expect(exception.message).not.toContain(CLE)
  })

  it('distingue réseau coupé, réponse vide, délai dépassé et annulation', async () => {
    await expect(appel({ fetch: vi.fn(async () => { throw new TypeError('Failed to fetch') }) })).rejects.toMatchObject({ code: 'RESEAU' })
    await expect(appel({ fetch: vi.fn(async () => reponseJson(200, { content: [] })) })).rejects.toMatchObject({ code: 'REPONSE_ILLISIBLE' })

    const attendreAnnulation = vi.fn((url, init) => new Promise((resolve, reject) => {
      init.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
    }))
    vi.useFakeTimers()
    const lent = appel({ fetch: attendreAnnulation })
    vi.advanceTimersByTime(LIMITES_IA_REELLE.delaiMs)
    await expect(lent).rejects.toMatchObject({ code: 'DELAI_DEPASSE' })
    vi.useRealTimers()

    const controleur = new AbortController()
    const annule = appel({ fetch: attendreAnnulation, signal: controleur.signal })
    controleur.abort()
    await expect(annule).rejects.toMatchObject({ code: 'ANNULE' })
  })
})

describe('moteur avec une vraie IA injectée', () => {
  const workflow = premierAgent.correction.workflow
  const options = { blocsDisponibles: premierAgent.blocsDisponibles, simulateurs: premierAgent.simulateurs }

  it('confie le bloc Agent à la fonction reçue et le dit dans le journal', async () => {
    const agentReel = vi.fn(async () => ({ texte: 'Réponse d\'une vraie IA', fournisseur: 'Anthropic', modele: 'claude-haiku-5-5' }))
    const execution = await executerTout(workflow, jeu('horaires'), { ...options, agentReel })
    expect(execution.statut).toBe('termine')
    expect(agentReel).toHaveBeenCalledWith({ consigne: expect.stringContaining('Médiathèque Exemple'), contexte: jeu('horaires').donnees.message.texte })
    expect(execution.resultat.agent).toEqual({ reponse: 'Réponse d\'une vraie IA' })
    const etape = execution.journal.find((entree) => entree.noeudId === 'assistant')
    expect(etape.iaReelle).toEqual({ fournisseur: 'Anthropic', modele: 'claude-haiku-5-5' })
    expect(etape.explication).toMatch(/Mode IA réelle.*Anthropic/)
  })

  it('arrête l\'étape avec un message clair si l\'appel échoue', async () => {
    const agentReel = vi.fn(async () => { throw new ErreurIaReelle('CLE_REFUSEE', 'Le fournisseur refuse cette clé.') })
    const execution = await executerTout(workflow, jeu('horaires'), { ...options, agentReel })
    expect(execution.statut).toBe('erreur')
    expect(execution.erreur).toMatchObject({ code: 'IA_REELLE', noeudId: 'assistant' })
    expect(execution.erreur.message).toMatch(/refuse cette clé.*repasser en simulation/)
  })

  it('reste en simulation sans fonction, et la vérification n\'appelle jamais de vraie IA', async () => {
    const execution = await executerTout(workflow, jeu('horaires'), options)
    expect(execution.journal.find((entree) => entree.noeudId === 'assistant').iaReelle).toBeUndefined()
    const fetch = vi.spyOn(globalThis, 'fetch')
    const verification = await evaluerCriteres(premierAgent, workflow)
    expect(verification.reussi).toBe(true)
    expect(fetch).not.toHaveBeenCalled()
  })
})

describe('catalogue', () => {
  it('n\'accepte modeReel que booléen, et avec le bloc agent', () => {
    expect(validerLaboratoire(premierAgent)).toEqual([])
    expect(validerLaboratoire({ ...premierAgent, modeReel: 'oui' }).join(' ')).toMatch(/modeReel/)
    const sansAgent = { ...premierAgent, blocsDisponibles: premierAgent.blocsDisponibles.filter((type) => type !== 'agent') }
    expect(validerLaboratoire(sansAgent).join(' ')).toMatch(/demande le bloc agent/)
  })
})

describe('stores', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('ne confie l\'agent à une vraie IA que si le laboratoire le prévoit, le mode est choisi et une clé saisie', () => {
    const ia = useIaReelleStore()
    const laboratoire = useLaboratoireStore()
    laboratoire.charger(premierAgent)
    expect(laboratoire.agentReel).toBeNull()
    ia.activer(true)
    expect(laboratoire.agentReel).toBeNull()
    ia.definirCle(CLE)
    expect(typeof laboratoire.agentReel).toBe('function')
    expect(laboratoire.modeIaReelle).toBe(true)

    laboratoire.charger(trouverLaboratoire('comprendre-un-workflow'))
    expect(laboratoire.agentReel).toBeNull()
  })

  it('n\'envoie la clé qu\'au fournisseur : aucune requête vers le site', async () => {
    // Toute requête axios vers le site passe par l'adaptateur : il est remplacé par un espion
    const adaptateur = api.defaults.adapter
    const versLeSite = vi.fn(async (config) => ({ data: {}, status: 200, statusText: 'OK', headers: {}, config }))
    api.defaults.adapter = versLeSite
    const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(succes())
    const ia = useIaReelleStore()
    const laboratoire = useLaboratoireStore()
    laboratoire.charger(premierAgent)
    laboratoire.chargerCorrection()
    ia.activer(true)
    ia.definirCle(CLE)
    await laboratoire.toutExecuter()
    expect(laboratoire.execution.statut).toBe('termine')
    expect(fetch.mock.calls.map(([url]) => url)).toEqual([ADRESSE])
    expect(versLeSite).not.toHaveBeenCalled()

    // La vérification des objectifs reste simulée
    await laboratoire.verifier()
    expect(fetch).toHaveBeenCalledTimes(1)
    api.defaults.adapter = adaptateur
  })

  it('oublie la clé à la déconnexion', () => {
    const ia = useIaReelleStore()
    ia.activer(true)
    ia.definirCle(CLE)
    window.dispatchEvent(new Event(LOGOUT_EVENT))
    expect(ia.cle).toBe('')
    expect(ia.actif).toBe(false)
  })

  it('teste la clé et rapporte une erreur lisible', async () => {
    const ia = useIaReelleStore()
    expect((await ia.tester()).etat).toBe('erreur')
    ia.definirCle(CLE)
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(reponseJson(401, {}))
    const test = await ia.tester()
    expect(test.etat).toBe('erreur')
    expect(test.message).not.toContain(CLE)
  })
})

describe('lecteur', () => {
  const monter = async (slug) => {
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:p(.*)*', component: { template: '<div />' } }] })
    router.push('/')
    await router.isReady()
    const wrapper = mount(LaboratoirePlayer, { props: { laboratoire: trouverLaboratoire(slug) }, global: { plugins: [router] }, attachTo: document.body })
    await flushPromises()
    return wrapper
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    document.body.innerHTML = ''
  })

  it('ne propose le mode que dans un laboratoire qui le prévoit', async () => {
    expect((await monter('comprendre-un-workflow')).find('[data-testid="mode-ia-reelle"]').exists()).toBe(false)
    expect((await monter('premier-agent')).find('[data-testid="mode-ia-reelle"]').exists()).toBe(true)
  })

  it('avertit, masque la clé et change le bandeau', async () => {
    const wrapper = await monter('premier-agent')
    expect(wrapper.find('[data-testid="ia-cle"]').exists()).toBe(false)
    await wrapper.get('[data-testid="mode-reel"]').setValue(true)
    expect(wrapper.get('[data-testid="ia-avertissements"]').text()).toMatch(/facturée.*personnel.*mot de passe/s)
    const champ = wrapper.get('[data-testid="ia-cle"]')
    expect(champ.attributes('type')).toBe('password')
    expect(champ.attributes('autocomplete')).toBe('off')
    expect(wrapper.get('[data-testid="bandeau-simulation"]').text()).toMatch(/^Simulation\./)

    await champ.setValue(CLE)
    expect(wrapper.get('[data-testid="bandeau-simulation"]').text()).toMatch(/Mode IA réelle.*Anthropic/)

    await wrapper.get('[data-testid="ia-oublier"]').trigger('click')
    expect(useIaReelleStore().cle).toBe('')
    expect(wrapper.get('[data-testid="bandeau-simulation"]').text()).toMatch(/^Simulation\./)
    wrapper.unmount()
  })
})
