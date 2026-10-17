import { afterEach, describe, expect, it, vi } from 'vitest'
import { BLOCS } from '@/laboratoires/blocs'
import { conditionDe } from '@/laboratoires/blocs/condition'
import { trouverLaboratoire } from '@/laboratoires/catalogue'
import { validerLaboratoire } from '@/laboratoires/catalogue/validerLaboratoire'
import { creerExecution, executerTout } from '@/laboratoires/moteur/execution'
import { analyserUrl, repondre } from '@/laboratoires/simulateurs/apiFictive'

const lab = trouverLaboratoire('json-et-api')
const simulateurs = lab.simulateurs

const workflowApi = (config) => ({
  noeuds: [
    { id: 'd', type: 'declencheur' },
    { id: 'a', type: 'api', config: { methode: 'GET', corps: '', champ: 'reponse', ...config } },
    { id: 'r', type: 'resultat' },
  ],
  liens: [{ source: 'd', cible: 'a' }, { source: 'a', cible: 'r' }],
})

const jeu = (ville) => ({ id: 'j', libelle: 'j', donnees: { demande: { ville } } })

afterEach(() => vi.restoreAllMocks())

describe('API fictive', () => {
  it('n\'accepte que des adresses https sur un domaine d\'exemple', () => {
    expect(analyserUrl('https://meteo.exemple.test/previsions?ville=Lyon')).toEqual({
      adresse: 'https://meteo.exemple.test/previsions',
      parametres: { ville: 'Lyon' },
    })
    expect(analyserUrl('https://api.example.com/x').adresse).toBe('https://api.example.com/x')
    expect(analyserUrl('http://meteo.exemple.test/').erreur).toMatch(/https/)
    expect(analyserUrl('https://api.openai.com/v1').erreur).toMatch(/n'est pas un domaine d'exemple/)
    expect(analyserUrl('https://exemple.test.vrai-site.com/').erreur).toMatch(/domaine d'exemple/)
    expect(analyserUrl('pas une adresse').erreur).toMatch(/pas valide/)
  })

  it('choisit la première réponse qui convient, sans jamais appeler le réseau', () => {
    const espion = vi.spyOn(globalThis, 'fetch')
    const requete = (parametres, methode = 'GET') => ({ methode, adresse: 'https://meteo.exemple.test/previsions', parametres })
    expect(repondre(simulateurs.api, requete({ ville: 'Port-Exemple' })).statut).toBe(200)
    expect(repondre(simulateurs.api, requete({ ville: 'Ailleurs' })).statut).toBe(404)
    expect(repondre(simulateurs.api, requete({}))).toEqual({ statut: 400, corps: { erreur: 'Paramètre « ville » manquant' } })
    expect(repondre(simulateurs.api, requete({}, 'POST')).statut).toBe(405)
    expect(repondre(simulateurs.api, { methode: 'GET', adresse: 'https://autre.exemple.test/', parametres: {} }).statut).toBe(404)
    expect(espion).not.toHaveBeenCalled()
  })
})

describe('bloc API', () => {
  it('range le statut et le corps de la réponse', async () => {
    const espion = vi.spyOn(globalThis, 'fetch')
    const execution = await executerTout(workflowApi({ url: 'https://meteo.exemple.test/previsions?ville={{demande.ville}}' }), jeu('Ville-sur-Exemple'), { simulateurs })
    expect(execution.statut).toBe('termine')
    expect(execution.resultat.reponse).toEqual({
      requete: { methode: 'GET', url: 'https://meteo.exemple.test/previsions?ville=Ville-sur-Exemple' },
      statut: 200,
      corps: { ville: 'Ville-sur-Exemple', temperature: 18, ciel: 'ensoleillé', unite: '°C' },
    })
    expect(execution.journal[1].explication).toMatch(/répond 200 OK/)
    expect(espion).not.toHaveBeenCalled()
  })

  it('ne s\'arrête pas sur une réponse d\'erreur : elle se teste ensuite', async () => {
    const execution = await executerTout(workflowApi({ url: 'https://meteo.exemple.test/previsions?ville={{demande.ville}}' }), jeu('Nulle-part'), { simulateurs })
    expect(execution.statut).toBe('termine')
    expect(execution.resultat.reponse.statut).toBe(404)
    expect(execution.journal[1].explication).toMatch(/404 Introuvable : la demande n'a pas abouti/)
  })

  it('refuse un vrai domaine dès la configuration', () => {
    const execution = creerExecution(workflowApi({ url: 'https://api.vrai-service.com/v1?q={{demande.ville}}' }), jeu('x'), { simulateurs })
    expect(execution.statut).toBe('invalide')
    expect(execution.erreursValidation[0].message).toMatch(/vrai-service.com/)
  })

  it('refuse une adresse qui devient un vrai domaine une fois remplie', async () => {
    // Domaine d'exemple à la configuration, détourné par la donnée (« vrai-site.com/# ») à l'exécution
    const execution = await executerTout(workflowApi({ url: 'https://{{demande.ville}}.exemple.test/meteo' }), jeu('vrai-site.com/#'), { simulateurs })
    expect(execution.erreursValidation).toEqual([])
    expect(execution.erreur).toMatchObject({ code: 'URL_INVALIDE' })
    expect(execution.erreur.message).toMatch(/vrai-site.com/)
  })

  it('envoie un corps JSON en POST et vérifie sa syntaxe', async () => {
    const postSimulateurs = { api: [{ methode: 'POST', url: 'https://inscriptions.exemple.test/sorties', reponses: [{ statut: 201, corps: { ok: true } }] }] }
    const workflow = workflowApi({ methode: 'POST', url: 'https://inscriptions.exemple.test/sorties', corps: '{"ville":"Port-Exemple"}' })
    const execution = await executerTout(workflow, jeu('x'), { simulateurs: postSimulateurs })
    expect(execution.resultat.reponse).toMatchObject({ statut: 201, requete: { corps: { ville: 'Port-Exemple' } } })

    workflow.noeuds[1].config.corps = '{ville:}'
    expect(creerExecution(workflow, jeu('x')).erreursValidation[0].message).toMatch(/JSON valide/)
  })

  it('résume sa configuration', () => {
    expect(BLOCS.api.resumer({ methode: 'GET', url: 'https://a.exemple.test/', champ: 'reponse' })).toBe('GET https://a.exemple.test/ → « reponse »')
  })
})

describe('condition à deux tests', () => {
  const config = { chemin: 'a', operateur: 'egal', valeur: 'oui', chemin2: 'b', operateur2: 'superieur', valeur2: '75' }

  it('combine avec « et » ou « ou »', () => {
    expect(conditionDe({ ...config, liaison: '' })).toEqual({ chemin: 'a', operateur: 'egal', valeur: 'oui' })
    expect(conditionDe({ ...config, liaison: 'et' }).toutes).toHaveLength(2)
    expect(BLOCS.condition.executer({ entree: { a: 'non', b: 80 }, config: { ...config, liaison: 'ou' } }).sortiesActives).toEqual(['vrai'])
    expect(BLOCS.condition.executer({ entree: { a: 'non', b: 80 }, config: { ...config, liaison: 'et' } }).sortiesActives).toEqual(['faux'])
    expect(BLOCS.condition.resumer({ ...config, liaison: 'ou' })).toBe('Teste si « a » est égal à « oui » ou « b » est supérieur à « 75 »')
  })

  it('vérifie le deuxième test seulement s\'il est demandé', () => {
    expect(BLOCS.condition.verifierConfig({ ...config, liaison: '', chemin2: '' })).toEqual([])
    expect(BLOCS.condition.verifierConfig({ ...config, liaison: 'ou', chemin2: '' })).toEqual([expect.stringMatching(/^Deuxième test/)])
    expect(BLOCS.condition.verifierConfig({ ...config, liaison: 'xor' })).toEqual([expect.stringMatching(/« et » ou « ou »/)])
  })
})

describe('validation des API d\'un laboratoire', () => {
  it('refuse un vrai domaine, une adresse avec paramètres ou sans réponse par défaut', () => {
    const casse = structuredClone(lab)
    casse.simulateurs.api.push(
      { methode: 'GET', url: 'https://api.vrai-service.com/x', reponses: [{ statut: 200 }] },
      { methode: 'GET', url: 'https://a.exemple.test/x?ville=1', reponses: [{ statut: 200 }] },
      { methode: 'DELETE', url: 'https://b.exemple.test/x', reponses: [{ si: { chemin: 'a', operateur: 'existe' }, statut: 999 }] },
    )
    expect(validerLaboratoire(casse)).toEqual(expect.arrayContaining([
      expect.stringMatching(/vrai-service.com/),
      expect.stringMatching(/ni paramètres/),
      expect.stringMatching(/méthode inconnue « DELETE »/),
      expect.stringMatching(/code de statut invalide/),
      expect.stringMatching(/réponse par défaut/),
    ]))
  })
})
