import { cheminsDuGabarit, ecrireChemin, remplirGabarit, verifierChemin } from '../moteur/expressions.js'

export const DECISIONS = { approuver: 'Approuvé', refuser: 'Refusé' }

// Question posée à la personne ; une donnée absente ne bloque pas la question
export const questionDe = (config, entree) => {
  try {
    return remplirGabarit(config.question || 'Autoriser la suite du workflow ?', entree)
  } catch {
    return config.question || 'Autoriser la suite du workflow ?'
  }
}

export default {
  type: 'validation',
  libelle: 'Validation humaine',
  description: 'Met le workflow en pause et demande à une personne d\'approuver ou de refuser avant de continuer.',
  icone: 'fas fa-user-check',
  couleur: 'yellow',
  // Le moteur attend une décision avant d'exécuter ce bloc
  humain: true,
  questionDe,
  entrees: ['entree'],
  sorties: [
    { id: 'approuve', libelle: 'Si approuvé' },
    { id: 'refuse', libelle: 'Si refusé' },
  ],
  champs: [
    { nom: 'question', libelle: 'Question posée à la personne', type: 'texte', aide: 'Pour reprendre une donnée : Autoriser l\'outil {{agent.appel.outil}} ?' },
  ],
  configParDefaut: () => ({ question: 'Autoriser l\'outil {{agent.appel.outil}} ?' }),
  resumer: (config) => `Demande : « ${config.question || '?'} »`,
  verifierConfig: (config) => {
    const erreurs = []
    if (!String(config.question ?? '').trim()) erreurs.push('Écrivez la question posée à la personne.')
    erreurs.push(...cheminsDuGabarit(config.question).map(verifierChemin))
    return erreurs.filter(Boolean)
  },
  executer: ({ entree, config, contexte }) => {
    const decision = contexte.decision === 'approuver' ? 'approuver' : 'refuser'
    const question = questionDe(config, entree)
    return {
      donnees: ecrireChemin(entree, 'validation', { question, decision }),
      sortiesActives: [decision === 'approuver' ? 'approuve' : 'refuse'],
      explication: `Question : « ${question} ». Décision : ${DECISIONS[decision].toLowerCase()}. Les données suivent le chemin « ${decision === 'approuver' ? 'Si approuvé' : 'Si refusé'} ».`,
    }
  },
}
