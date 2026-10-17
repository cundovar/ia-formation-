import { cloner } from '../moteur/cloner.js'
import { cheminsDuGabarit, ecrireChemin, remplirGabarit, verifierChemin } from '../moteur/expressions.js'
import { METHODES_MCP, traiterMessage } from '../simulateurs/mcpFictif.js'

const LIBELLES_METHODES = {
  initialize: 'initialize (ouvrir la session)',
  'tools/list': 'tools/list (lister les outils)',
  'tools/call': 'tools/call (appeler un outil)',
}

const lireArguments = (texte) => {
  if (!String(texte ?? '').trim()) return { valeur: {} }
  try {
    const valeur = JSON.parse(texte)
    if (!valeur || typeof valeur !== 'object' || Array.isArray(valeur)) return { erreur: 'Les arguments forment un objet JSON, par exemple {"ville": "{{demande.ville}}"}.' }
    return { valeur }
  } catch {
    return { erreur: 'Les arguments ne sont pas un JSON valide.' }
  }
}

// Les {{…}} sont remplis dans les textes du JSON, après sa lecture : une donnée ne peut pas en casser la forme
const remplirValeurs = (valeur, donnees) => {
  if (typeof valeur === 'string') return remplirGabarit(valeur, donnees)
  if (Array.isArray(valeur)) return valeur.map((element) => remplirValeurs(element, donnees))
  if (valeur && typeof valeur === 'object') return Object.fromEntries(Object.entries(valeur).map(([cle, element]) => [cle, remplirValeurs(element, donnees)]))
  return valeur
}

const estAppel = (config) => config.methode === 'tools/call'

export default {
  type: 'mcp',
  libelle: 'Client MCP (fictif)',
  description: 'Envoie un message JSON-RPC à un serveur MCP fictif et range sa réponse. Aucun vrai serveur n\'est contacté.',
  icone: 'fas fa-plug',
  couleur: 'teal',
  entrees: ['entree'],
  sorties: [{ id: 'sortie', libelle: 'Ensuite' }],
  champs: [
    { nom: 'methode', libelle: 'Message envoyé', type: 'selection', options: METHODES_MCP.map((methode) => ({ valeur: methode, libelle: LIBELLES_METHODES[methode] })) },
    { nom: 'outil', libelle: 'Nom de l\'outil', type: 'texte', aide: 'Un nom exact de la liste renvoyée par « tools/list ».', visibleSi: estAppel },
    { nom: 'arguments', libelle: 'Arguments (JSON)', type: 'zone', aide: 'Par exemple {"ville": "{{demande.ville}}"}', visibleSi: estAppel },
    { nom: 'champ', libelle: 'Où ranger l\'échange (chemin)', type: 'texte', aide: 'Par exemple « mcp » : vous lirez ensuite mcp.reponse.result.' },
  ],
  configParDefaut: () => ({ methode: 'initialize', outil: '', arguments: '', champ: 'mcp' }),
  resumer: (config) => `${config.methode}${estAppel(config) ? ` « ${config.outil || '?'} »` : ''} → « ${config.champ || '?'} »`,
  informations: (simulateurs) => (simulateurs?.mcp ? [`Serveur : ${simulateurs.mcp.nom}. Il répond à initialize, tools/list et tools/call.`] : []),
  verifierConfig: (config) => {
    const erreurs = [verifierChemin(config.champ)]
    if (!METHODES_MCP.includes(config.methode)) erreurs.push('Choisissez le message à envoyer.')
    if (estAppel(config)) {
      if (!String(config.outil ?? '').trim()) erreurs.push('Indiquez le nom de l\'outil à appeler.')
      const lu = lireArguments(config.arguments)
      erreurs.push(lu.erreur)
      erreurs.push(...cheminsDuGabarit(config.arguments).map(verifierChemin))
    }
    return erreurs.filter(Boolean)
  },
  executer: ({ entree, config, contexte }) => {
    const etat = cloner(contexte.etat ?? {})
    const session = etat.mcp ?? { initialisee: false, prochainId: 1 }
    const id = session.prochainId ?? 1
    const requete = { jsonrpc: '2.0', id, method: config.methode }
    if (config.methode === 'initialize') {
      requete.params = { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'Laboratoire (client fictif)', version: '1.0.0' } }
    }
    if (estAppel(config)) {
      requete.params = { name: String(config.outil).trim(), arguments: remplirValeurs(lireArguments(config.arguments).valeur, entree) }
    }

    const traite = traiterMessage(contexte.simulateurs ?? {}, requete, session)
    etat.mcp = { ...traite.session, prochainId: id + 1 }
    const { reponse } = traite
    const evenements = [{ type: 'mcp', requete: cloner(requete), reponse: cloner(reponse) }]
    if (traite.appel) evenements.push({ type: 'outil', ...traite.appel })

    const lignes = [`Message « ${config.methode} » envoyé (id ${id}).`]
    if (reponse.error) lignes.push(`Le serveur fictif répond une erreur ${reponse.error.code} : ${reponse.error.message}`)
    else if (config.methode === 'tools/list') lignes.push(`Le serveur propose ${reponse.result.tools.length} outil(s) : ${reponse.result.tools.map((outil) => outil.name).join(', ')}.`)
    else if (traite.appel) lignes.push(`L'outil « ${traite.appel.outil} » a répondu.`)
    else lignes.push('La session est ouverte.')
    lignes.push(`L'échange est rangé dans « ${config.champ} » (${config.champ}.requete et ${config.champ}.reponse).`)

    return {
      donnees: ecrireChemin(entree, config.champ, { requete, reponse }),
      explication: lignes.join(' '),
      evenements,
      etat,
    }
  },
}
