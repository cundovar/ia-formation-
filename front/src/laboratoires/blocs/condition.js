import { decrireCondition, evaluerCondition, OPERATEURS, OPERATEURS_SANS_VALEUR, verifierChemin } from '../moteur/expressions.js'

export const LIAISONS = { '': 'Un seul test', et: 'Les deux tests doivent être vrais (et)', ou: 'Un des deux tests suffit (ou)' }

const optionsOperateurs = Object.entries(OPERATEURS).map(([valeur, libelle]) => ({ valeur, libelle }))
const avecSecondTest = (config) => config.liaison === 'et' || config.liaison === 'ou'

// Configuration à plat → condition du moteur : { chemin… }, { toutes: [...] } ou { une: [...] }
export function conditionDe(config) {
  const premier = { chemin: config.chemin, operateur: config.operateur, valeur: config.valeur }
  if (!avecSecondTest(config)) return premier
  const second = { chemin: config.chemin2, operateur: config.operateur2, valeur: config.valeur2 }
  return config.liaison === 'et' ? { toutes: [premier, second] } : { une: [premier, second] }
}

export default {
  type: 'condition',
  libelle: 'Condition',
  description: 'Pose une question sur les données et choisit un chemin : « Si vrai » ou « Si faux ». Elle peut combiner deux tests.',
  icone: 'fas fa-code-branch',
  couleur: 'violet',
  entrees: ['entree'],
  sorties: [
    { id: 'vrai', libelle: 'Si vrai' },
    { id: 'faux', libelle: 'Si faux' },
  ],
  champs: [
    { nom: 'chemin', libelle: 'Donnée à tester (chemin)', type: 'texte', aide: 'Par exemple « email.objet ».' },
    { nom: 'operateur', libelle: 'Test', type: 'selection', options: optionsOperateurs },
    { nom: 'valeur', libelle: 'Valeur à comparer', type: 'texte', visibleSi: (config) => !OPERATEURS_SANS_VALEUR.includes(config.operateur) },
    { nom: 'liaison', libelle: 'Deuxième test', type: 'selection', options: Object.entries(LIAISONS).map(([valeur, libelle]) => ({ valeur, libelle })) },
    { nom: 'chemin2', libelle: 'Deuxième donnée à tester (chemin)', type: 'texte', visibleSi: avecSecondTest },
    { nom: 'operateur2', libelle: 'Deuxième test', type: 'selection', options: optionsOperateurs, visibleSi: avecSecondTest },
    {
      nom: 'valeur2',
      libelle: 'Deuxième valeur à comparer',
      type: 'texte',
      visibleSi: (config) => avecSecondTest(config) && !OPERATEURS_SANS_VALEUR.includes(config.operateur2),
    },
  ],
  configParDefaut: () => ({ chemin: '', operateur: 'contient', valeur: '', liaison: '', chemin2: '', operateur2: 'egal', valeur2: '' }),
  resumer: (config) => (config.chemin ? `Teste si ${decrireCondition(conditionDe(config))}` : 'Condition à configurer'),
  verifierConfig: (config) => {
    const erreurs = [verifierChemin(config.chemin)]
    if (!Object.prototype.hasOwnProperty.call(OPERATEURS, config.operateur)) erreurs.push('Choisissez un test.')
    if (config.liaison && !avecSecondTest(config)) erreurs.push('Choisissez « et » ou « ou » pour le deuxième test.')
    if (avecSecondTest(config)) {
      const erreurChemin = verifierChemin(config.chemin2)
      if (erreurChemin) erreurs.push(`Deuxième test : ${erreurChemin}`)
      if (!Object.prototype.hasOwnProperty.call(OPERATEURS, config.operateur2)) erreurs.push('Choisissez le deuxième test.')
    }
    return erreurs.filter(Boolean)
  },
  executer: ({ entree, config }) => {
    const condition = conditionDe(config)
    const resultat = evaluerCondition(condition, entree)
    return {
      donnees: entree,
      sortiesActives: [resultat ? 'vrai' : 'faux'],
      explication: `Test : ${decrireCondition(condition)}. Réponse : ${resultat ? 'vrai' : 'faux'}. Les données suivent le chemin « ${resultat ? 'Si vrai' : 'Si faux'} ».`,
    }
  },
}
