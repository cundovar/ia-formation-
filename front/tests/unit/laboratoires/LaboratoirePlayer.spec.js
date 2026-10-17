import { beforeEach, describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import LaboratoirePlayer from '@/components/features/laboratoires/LaboratoirePlayer.vue'
import { trouverLaboratoire } from '@/laboratoires/catalogue'
import { useLaboratoireStore } from '@/stores/laboratoire'

const Stub = { template: '<div />' }

const monter = async (slug = 'comprendre-un-workflow') => {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:p(.*)*', component: Stub }] })
  router.push('/')
  await router.isReady()
  const wrapper = mount(LaboratoirePlayer, {
    props: { laboratoire: trouverLaboratoire(slug) },
    global: { plugins: [router] },
    attachTo: document.body,
  })
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  setActivePinia(createPinia())
  document.body.innerHTML = ''
})

describe('lecteur de laboratoire', () => {
  it('annonce la simulation et présente la situation', async () => {
    const wrapper = await monter()
    expect(wrapper.get('[data-testid="bandeau-simulation"]').text()).toMatch(/Simulation.*aucune IA/)
    expect(wrapper.find('h2#consigne-titre').exists()).toBe(true)
    expect(wrapper.findAll('#consigne-titre ~ ol li')).toHaveLength(5)
  })

  it('signale le bloc non relié et bloque l\'exécution', async () => {
    const wrapper = await monter()
    expect(wrapper.get('[data-testid="bloc-resultat"]').text()).toMatch(/ne reçoit aucune donnée/)
    expect(wrapper.get('[data-testid="pas-a-pas"]').attributes('disabled')).toBeDefined()
    // Le bloc fourni est verrouillé : ni réglage ni suppression
    expect(wrapper.find('[data-testid="supprimer-declencheur"]').exists()).toBe(false)
  })

  it('se termine au clavier : relier, exécuter pas à pas, vérifier', async () => {
    const wrapper = await monter()

    await wrapper.get('#relier-accuse-sortie').setValue('resultat')
    await wrapper.get('[data-testid="relier-accuse-sortie"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="bloc-accuse"]').text()).toMatch(/Envoie vers :.*Résultat/s)
    // Plus aucune destination possible : le focus reste sur le bloc, pas sur la page
    expect(document.activeElement.id).toBe('bloc-accuse')
    expect(wrapper.get('[data-testid="pas-a-pas"]').attributes('disabled')).toBeUndefined()

    await wrapper.get('[data-testid="pas-a-pas"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="etat-declencheur"]').text()).toBe('Exécuté')
    expect(wrapper.get('[data-testid="etat-accuse"]').text()).toBe('Prochaine étape')
    expect(wrapper.get('[data-testid="annonce"]').text()).toMatch(/Étape 1, Un message arrive/)

    await wrapper.get('[data-testid="pas-a-pas"]').trigger('click')
    await wrapper.get('[data-testid="pas-a-pas"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="resultat-final"]').text()).toContain('Bonjour Léa, nous avons bien reçu votre message.')
    expect(wrapper.get('[data-testid="annonce"]').text()).toMatch(/Exécution terminée/)

    await wrapper.get('[data-testid="jeu-donnees"]').setValue('karim')
    expect(wrapper.find('[data-testid="resultat-final"]').exists()).toBe(false)

    await wrapper.get('[data-testid="verifier"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="bilan"]').text()).toMatch(/tous les objectifs/)
    expect(document.activeElement).toBe(wrapper.get('[data-testid="bilan"]').element)
    expect(wrapper.get('[data-testid="a-retenir"]').text()).toMatch(/suite de blocs/)
    wrapper.unmount()
  })

  it('indique les objectifs à revoir avec du texte, pas seulement une couleur', async () => {
    const wrapper = await monter('trier-des-emails')
    await wrapper.get('[data-testid="verifier"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="critere-condition"]').text()).toMatch(/^À revoir/)
    expect(wrapper.get('[data-testid="critere-invitation"]').text()).toMatch(/^Réussi/)
    expect(wrapper.get('[data-testid="bilan"]').text()).toMatch(/2 objectif\(s\) atteint\(s\) sur 5/)
    wrapper.unmount()
  })

  it('ajoute et configure un bloc, puis montre l\'erreur d\'exécution', async () => {
    const wrapper = await monter('trier-des-emails')
    const store = useLaboratoireStore()
    await wrapper.get('#ajout-type').setValue('condition')
    await wrapper.get('[data-testid="ajouter-bloc"]').trigger('click')
    await flushPromises()
    expect(document.activeElement.id).toBe('bloc-condition-1')

    await wrapper.get('[data-testid="modifier-condition-1"]').trigger('click')
    await wrapper.get('#config-condition-1-chemin').setValue('email.sujet')
    await wrapper.get('#config-condition-1-valeur').setValue('facture')
    expect(store.workflow.noeuds.at(-1).config).toMatchObject({ chemin: 'email.sujet', valeur: 'facture' })
    store.delier('l1')
    store.relier('declencheur', 'sortie', 'condition-1')
    store.relier('condition-1', 'faux', 'a-lire')
    await flushPromises()

    await wrapper.get('[data-testid="lecture"]').trigger('click')
    await store.toutExecuter()
    await flushPromises()
    expect(wrapper.get('[data-testid="erreur-execution"]').text()).toMatch(/email.sujet/)
    expect(wrapper.get('[data-testid="etat-condition-1"]').text()).toBe('Erreur')
    wrapper.unmount()
  })

  it('affiche indices et correction à la demande', async () => {
    const wrapper = await monter('trier-des-emails')
    expect(wrapper.find('[data-testid="indices"]').exists()).toBe(false)
    await wrapper.get('[data-testid="indice"]').trigger('click')
    expect(wrapper.findAll('[data-testid="indices"] li')).toHaveLength(1)
    await wrapper.get('[data-testid="voir-correction"]').trigger('click')
    expect(wrapper.get('[data-testid="correction"]').text()).toMatch(/ne tient pas compte des majuscules/)
    await wrapper.get('[data-testid="charger-correction"]').trigger('click')
    expect(wrapper.find('[data-testid="bloc-est-facture"]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('propose la vue graphique sur grand écran, et seulement là', async () => {
    window.innerWidth = 1280
    const wrapper = await monter('trier-des-emails')
    expect(wrapper.get('[data-testid="vue-etapes"]').attributes('aria-pressed')).toBe('true')
    await wrapper.get('[data-testid="vue-graphe"]').trigger('click')
    expect(wrapper.get('[data-testid="vue-graphe"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.find('[data-testid="bloc-a-lire"]').exists()).toBe(false)
    wrapper.unmount()

    window.innerWidth = 375
    const mobile = await monter('trier-des-emails')
    expect(mobile.find('[data-testid="vue-graphe"]').exists()).toBe(false)
    expect(mobile.find('[data-testid="bloc-a-lire"]').exists()).toBe(true)
    mobile.unmount()
    window.innerWidth = 1024
  })

  it('annule et rétablit depuis l\'éditeur, et duplique un bloc', async () => {
    const wrapper = await monter('trier-des-emails')
    expect(wrapper.get('[data-testid="annuler"]').attributes('disabled')).toBeDefined()
    await wrapper.get('[data-testid="dupliquer-a-lire"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="bloc-transformation-1"]').exists()).toBe(true)
    expect(document.activeElement.id).toBe('bloc-transformation-1')
    await wrapper.get('[data-testid="annuler"]').trigger('click')
    expect(wrapper.find('[data-testid="bloc-transformation-1"]').exists()).toBe(false)
    await wrapper.get('[data-testid="retablir"]').trigger('click')
    expect(wrapper.find('[data-testid="bloc-transformation-1"]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('vide la séance en quittant la page', async () => {
    const wrapper = await monter()
    const store = useLaboratoireStore()
    expect(store.lab).not.toBeNull()
    wrapper.unmount()
    expect(store.lab).toBeNull()
  })
})
