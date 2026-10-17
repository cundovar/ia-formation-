import { afterEach, describe, expect, it, vi } from 'vitest'
import { trouverLaboratoire } from '@/laboratoires/catalogue'
import { EVALUATEURS, evaluerCriteres } from '@/laboratoires/moteur/criteres'
import { executerTout } from '@/laboratoires/moteur/execution'
import { ERREURS_JSON_RPC, traiterMessage } from '@/laboratoires/simulateurs/mcpFictif'

afterEach(() => vi.restoreAllMocks())

const lab = trouverLaboratoire('appel-outil-mcp')
const { simulateurs } = lab
const message = (method, params, id = 1) => ({ jsonrpc: '2.0', id, method, ...(params ? { params } : {}) })

describe('serveur MCP fictif (JSON-RPC 2.0)', () => {
  it('exige « initialize » avant toute autre méthode', () => {
    const refus = traiterMessage(simulateurs, message('tools/list'), {})
    expect(refus.reponse).toEqual({ jsonrpc: '2.0', id: 1, error: { code: ERREURS_JSON_RPC.requeteInvalide, message: expect.stringMatching(/initialize/) } })
    const ouverture = traiterMessage(simulateurs, message('initialize', {}), {})
    expect(ouverture.reponse.result).toMatchObject({ protocolVersion: '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: simulateurs.mcp.nom } })
    expect(ouverture.session.initialisee).toBe(true)
  })

  it('liste les outils avec leur schéma d\'entrée', () => {
    const { reponse } = traiterMessage(simulateurs, message('tools/list', null, 2), { initialisee: true })
    expect(reponse.id).toBe(2)
    expect(reponse.result.tools.map((outil) => outil.name)).toEqual(['lister_sorties', 'prevoir_meteo'])
    expect(reponse.result.tools[1].inputSchema).toEqual({ type: 'object', properties: { ville: { type: 'string', description: 'Nom de la ville' } }, required: ['ville'] })
  })

  it('appelle un outil ou répond une erreur codée', () => {
    const session = { initialisee: true }
    const espion = vi.spyOn(globalThis, 'fetch')
    const appel = traiterMessage(simulateurs, message('tools/call', { name: 'prevoir_meteo', arguments: { ville: 'Port-Exemple' } }), session)
    expect(appel.reponse.result).toMatchObject({ structuredContent: { temperature: 12 }, isError: false, content: [{ type: 'text' }] })
    expect(appel.appel).toEqual({ outil: 'prevoir_meteo', arguments: { ville: 'Port-Exemple' }, permission: 'lecture' })
    expect(traiterMessage(simulateurs, message('tools/call', { name: 'meteo' }), session).reponse.error.code).toBe(ERREURS_JSON_RPC.parametresInvalides)
    expect(traiterMessage(simulateurs, message('tools/call', { name: 'prevoir_meteo', arguments: {} }), session).reponse.error.message).toMatch(/« ville » manque/)
    expect(traiterMessage(simulateurs, message('resources/list'), session).reponse.error.code).toBe(ERREURS_JSON_RPC.methodeInconnue)
    expect(traiterMessage(simulateurs, { id: 3, method: 'initialize' }, session).reponse.error.code).toBe(ERREURS_JSON_RPC.requeteInvalide)
    expect(espion).not.toHaveBeenCalled()
  })
})

describe('bloc Client MCP', () => {
  const jeu = lab.jeuxDeDonnees[0]

  it('numérote les messages et garde la session pendant l\'exécution', async () => {
    const execution = await executerTout(lab.correction.workflow, jeu, { simulateurs })
    const messages = execution.evenements.filter((evenement) => evenement.type === 'mcp')
    expect(messages.map((m) => [m.requete.method, m.requete.id, m.reponse.id])).toEqual([['initialize', 1, 1], ['tools/list', 2, 2], ['tools/call', 3, 3]])
    expect(execution.resultat.message).toBe('À Ville-sur-Exemple, il fera 18 °C, ciel ensoleillé.')
    expect(EVALUATEURS.mcpAvant({ methode: 'tools/list', avant: 'tools/call' }, null, { jeu: execution })).toBe(true)
    expect(EVALUATEURS.mcpAvant({ methode: 'tools/call', avant: 'tools/list' }, null, { jeu: execution })).toBe(false)
  })

  it('montre l\'erreur du serveur quand la session n\'est pas ouverte', async () => {
    const execution = await executerTout(lab.workflowInitial, jeu, { simulateurs })
    expect(execution.journal[1].explication).toMatch(/erreur -32600 : Session non initialisée/)
    expect(execution.erreur.code).toBe('CHEMIN_INTROUVABLE')
  })

  it('remplit les arguments sans qu\'une donnée puisse casser le JSON', async () => {
    const piege = { id: 'p', libelle: 'p', donnees: { demande: { ville: 'Port-Exemple", "autre": "x' } } }
    const execution = await executerTout(lab.correction.workflow, piege, { simulateurs })
    const appel = execution.evenements.find((evenement) => evenement.type === 'mcp' && evenement.requete.method === 'tools/call')
    expect(appel.requete.params.arguments).toEqual({ ville: 'Port-Exemple", "autre": "x' })
  })

  it('la correction réussit, le départ non', async () => {
    expect((await evaluerCriteres(lab, lab.correction.workflow)).reussi).toBe(true)
    const depart = await evaluerCriteres(lab, lab.workflowInitial)
    expect(depart.details.filter((detail) => detail.reussi).map((detail) => detail.id)).toEqual([])
  })
})

describe('séparation d\'avec le connecteur de rédaction', () => {
  // Les simulateurs n'ont aucun lien avec le vrai serveur MCP du site (src/Mcp, route /mcp)
  const sources = import.meta.glob('/src/laboratoires/**/*.{js,json}', { query: '?raw', import: 'default', eager: true })

  it('aucun fichier des laboratoires ne cite la route ou le code du connecteur', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(20)
    Object.entries(sources).forEach(([fichier, contenu]) => {
      expect(contenu, fichier).not.toMatch(/['"`]\/mcp\b|src\/Mcp|\/api\/|MCP_PUBLIC_URL/)
    })
  })
})
