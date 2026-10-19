import { ErreurExecution } from '../moteur/erreurs.js'
import { decrireCondition, ecrireChemin, lireChemin, verifierChemin } from '../moteur/expressions.js'
import { deciderAgent } from '../simulateurs/agentFictif.js'
import { decrireOutil } from '../simulateurs/outilsFictifs.js'

const decrireAlors = (alors = {}) => (alors.outil
  ? `demande l'outil « ${alors.outil} »`
  : `répond « ${alors.reponse} »`)

export default {
  type: 'agent',
  libelle: 'Agent IA (simulé)',
  description: 'Reçoit une consigne et un contexte, puis répond ou demande un outil. Ici, il décide avec des règles fixes : une vraie IA peut répondre autrement.',
  icone: 'fas fa-robot',
  couleur: 'indigo',
  entrees: ['entree'],
  sorties: [
    { id: 'reponse', libelle: 'S\'il répond' },
    { id: 'outil', libelle: 'S\'il demande un outil' },
  ],
  champs: [
    { nom: 'consigne', libelle: 'Consigne donnée à l\'agent', type: 'zone', aide: 'Ce que l\'agent doit faire et ne pas faire.' },
    { nom: 'contexte', libelle: 'Donnée transmise à l\'agent (chemin)', type: 'texte', aide: 'L\'agent ne voit que cette donnée, par exemple « message.texte ». Laissez vide pour ne rien transmettre.' },
    {
      nom: 'outils',
      libelle: 'Outils proposés à l\'agent',
      type: 'cases',
      options: (simulateurs) => (simulateurs?.outils ?? []).map((outil) => ({ valeur: outil.nom, libelle: decrireOutil(outil) })),
      visibleSi: (config, simulateurs) => (simulateurs?.outils ?? []).length > 0,
    },
    { nom: 'champ', libelle: 'Où ranger sa décision (chemin)', type: 'texte', aide: 'Par exemple « agent » : vous lirez ensuite agent.reponse ou agent.appel.' },
  ],
  configParDefaut: () => ({ consigne: '', contexte: '', outils: [], champ: 'agent' }),
  resumer: (config) => {
    const outils = (config.outils ?? []).length ? `, outils : ${config.outils.join(', ')}` : ''
    return `Lit « ${config.contexte || 'rien'} »${outils} → « ${config.champ || '?'} »`
  },
  // Règles de l'agent simulé, montrées à l'apprenant (LAB-01 : la simulation est transparente)
  informations: (simulateurs) => {
    const agent = simulateurs?.agent
    if (!agent) return []
    return [
      ...(agent.regles ?? []).map((regle, index) => `Règle ${index + 1} : si ${regle.si ? decrireCondition(regle.si) : 'toujours'}, l'agent ${decrireAlors(regle.alors)}.`),
      `Sinon, l'agent répond « ${agent.parDefaut?.reponse ?? 'Je ne sais pas répondre à cette demande.'} ».`,
    ]
  },
  verifierConfig: (config) => {
    const erreurs = [verifierChemin(config.champ)]
    if (String(config.contexte ?? '').trim()) erreurs.push(verifierChemin(config.contexte))
    if (!Array.isArray(config.outils ?? []) || (config.outils ?? []).some((outil) => typeof outil !== 'string')) erreurs.push('La liste des outils est invalide.')
    if (String(config.consigne ?? '').length > 2000) erreurs.push('La consigne ne peut pas dépasser 2 000 caractères.')
    return erreurs.filter(Boolean)
  },
  executer: async ({ entree, config, contexte }) => {
    const chemin = String(config.contexte ?? '').trim()
    const lu = chemin ? lireChemin(entree, chemin) : { trouve: false }
    const vu = { consigne: config.consigne ?? '', ...(lu.trouve ? { contexte: lu.valeur } : {}) }
    if (typeof contexte.agentReel === 'function') return executerAvecIaReelle({ entree, config, vu, chemin, lu, agentReel: contexte.agentReel })
    const decision = deciderAgent(contexte.simulateurs?.agent, vu, config.outils ?? [])

    const lignes = []
    if (chemin && !lu.trouve) lignes.push(`Attention : aucune donnée à « ${chemin} », l'agent ne reçoit aucun contexte.`)
    if (!chemin) lignes.push('Aucune donnée n\'est transmise à l\'agent.')
    decision.ecartees.forEach(({ regle, outil }) => lignes.push(`La règle ${regle} demandait l'outil « ${outil} », qui n'est pas proposé à cet agent : elle est écartée.`))
    lignes.push(decision.regle ? `Règle ${decision.regle} appliquée (simulation).` : 'Aucune règle ne correspond : réponse par défaut (simulation).')
    if (decision.injection) lignes.push('L\'agent a suivi une consigne cachée dans les données reçues. Une vraie IA peut aussi se laisser piéger ainsi.')

    if (decision.appel) {
      lignes.push(`L'agent demande l'outil « ${decision.appel.outil} » avec ${JSON.stringify(decision.appel.arguments)}. Il ne l'exécute pas lui-même : un bloc Outil s'en charge.`)
      return {
        donnees: ecrireChemin(entree, config.champ, { appel: decision.appel }),
        sortiesActives: ['outil'],
        explication: lignes.join(' '),
      }
    }
    lignes.push(`Réponse : « ${decision.reponse} »`)
    return {
      donnees: ecrireChemin(entree, config.champ, { reponse: decision.reponse }),
      sortiesActives: ['reponse'],
      explication: lignes.join(' '),
    }
  },
}

// Mode IA réelle (LAB-08) : la réponse vient d'un vrai modèle, sans règle ni outil (v1)
async function executerAvecIaReelle({ entree, config, vu, chemin, lu, agentReel }) {
  let reponse
  try {
    reponse = await agentReel({ consigne: vu.consigne, contexte: vu.contexte })
  } catch (exception) {
    const message = exception?.name === 'ErreurIaReelle' ? exception.message : 'L\'appel à la vraie IA a échoué.'
    throw new ErreurExecution('IA_REELLE', `${message} Vous pouvez repasser en simulation.`)
  }
  const lignes = []
  if (chemin && !lu.trouve) lignes.push(`Attention : aucune donnée à « ${chemin} », l'IA ne reçoit aucun contexte.`)
  if (!chemin) lignes.push('Aucune donnée n\'est transmise à l\'IA.')
  lignes.push(`Mode IA réelle : réponse d'un vrai modèle (${reponse.fournisseur}, ${reponse.modele}), sans règle écrite à l'avance. Elle peut changer d'une exécution à l'autre, et contenir des erreurs.`)
  if ((config.outils ?? []).length) lignes.push('En mode IA réelle, l\'agent ne peut pas encore demander d\'outil : seule sa réponse texte est utilisée.')
  lignes.push(`Réponse : « ${reponse.texte} »`)
  return {
    donnees: ecrireChemin(entree, config.champ, { reponse: reponse.texte }),
    sortiesActives: ['reponse'],
    explication: lignes.join(' '),
    iaReelle: { fournisseur: reponse.fournisseur, modele: reponse.modele },
  }
}
