/**
 * Serveur MCP fictif : il répond en JSON-RPC 2.0 aux messages d'un bloc MCP, sans aucun réseau.
 * Il n'a aucun lien avec le connecteur de rédaction du site : il imite seulement la forme des
 * échanges (initialize, tools/list, tools/call), de façon simplifiée.
 *
 * simulateurs.mcp : { nom, version, outils: ['nom d'un outil de simulateurs.outils', …] }
 */
import { appelerOutil, TYPES_PARAMETRE, trouverOutil } from './outilsFictifs.js'

export const METHODES_MCP = ['initialize', 'tools/list', 'tools/call']
export const VERSION_PROTOCOLE = '2025-06-18'

// Codes d'erreur JSON-RPC 2.0
export const ERREURS_JSON_RPC = {
  requeteInvalide: -32600,
  methodeInconnue: -32601,
  parametresInvalides: -32602,
}

const erreur = (id, code, message) => ({ jsonrpc: '2.0', id, error: { code, message } })
const resultat = (id, contenu) => ({ jsonrpc: '2.0', id, result: contenu })

// Schéma d'entrée d'un outil, à la manière de JSON Schema
const schemaEntree = (outil) => {
  const parametres = Object.entries(outil.parametres ?? {})
  return {
    type: 'object',
    properties: Object.fromEntries(parametres.map(([nom, parametre]) => [nom, { type: TYPES_PARAMETRE[parametre.type] ?? 'string', description: parametre.description ?? '' }])),
    required: parametres.filter(([, parametre]) => parametre.obligatoire).map(([nom]) => nom),
  }
}

const outilsDuServeur = (simulateurs) =>
  (simulateurs.mcp?.outils ?? []).map((nom) => trouverOutil(simulateurs.outils ?? [], nom)).filter(Boolean)

/**
 * Traite un message JSON-RPC. `session` garde l'état de la conversation ({ initialisee }).
 * Renvoie { reponse, session, appel? } ; `appel` décrit l'outil réellement exécuté.
 */
export function traiterMessage(simulateurs = {}, message, session = {}) {
  const id = message?.id ?? null
  if (message?.jsonrpc !== '2.0' || typeof message.method !== 'string') {
    return { reponse: erreur(id, ERREURS_JSON_RPC.requeteInvalide, 'Message JSON-RPC 2.0 invalide.'), session }
  }
  if (!METHODES_MCP.includes(message.method)) {
    return { reponse: erreur(id, ERREURS_JSON_RPC.methodeInconnue, `Méthode inconnue : ${message.method}.`), session }
  }
  if (message.method === 'initialize') {
    return {
      reponse: resultat(id, {
        protocolVersion: VERSION_PROTOCOLE,
        capabilities: { tools: {} },
        serverInfo: { name: simulateurs.mcp?.nom ?? 'Serveur MCP fictif', version: simulateurs.mcp?.version ?? '1.0.0' },
      }),
      session: { ...session, initialisee: true },
    }
  }
  if (!session.initialisee) {
    return { reponse: erreur(id, ERREURS_JSON_RPC.requeteInvalide, 'Session non initialisée : envoyez d\'abord « initialize ».'), session }
  }
  const outils = outilsDuServeur(simulateurs)
  if (message.method === 'tools/list') {
    return {
      reponse: resultat(id, { tools: outils.map((outil) => ({ name: outil.nom, description: outil.description, inputSchema: schemaEntree(outil) })) }),
      session: { ...session, outilsListes: true },
    }
  }

  // tools/call
  const nom = message.params?.name
  if (!outils.some((outil) => outil.nom === nom)) {
    return { reponse: erreur(id, ERREURS_JSON_RPC.parametresInvalides, `Outil inconnu : ${nom ?? '(aucun nom)'}. Consultez la liste renvoyée par « tools/list ».`), session }
  }
  const appel = appelerOutil(simulateurs.outils, nom, message.params?.arguments ?? {})
  if (appel.erreurs.length) {
    return { reponse: erreur(id, ERREURS_JSON_RPC.parametresInvalides, `Arguments invalides : ${appel.erreurs.join(' ')}`), session }
  }
  return {
    reponse: resultat(id, {
      content: [{ type: 'text', text: JSON.stringify(appel.resultat) }],
      structuredContent: appel.resultat,
      isError: false,
    }),
    session,
    appel: { outil: nom, arguments: appel.arguments, permission: appel.outil.permission },
  }
}
