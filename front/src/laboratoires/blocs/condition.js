import { decrireCondition, evaluerCondition, OPERATEURS, OPERATEURS_SANS_VALEUR, verifierChemin } from '../moteur/expressions.js'

export default {
  type: 'condition',
  libelle: 'Condition',
  description: 'Pose une question sur les données et choisit un chemin : « Si vrai » ou « Si faux ».',
  icone: 'fas fa-code-branch',
  couleur: 'violet',
  entrees: ['entree'],
  sorties: [
    { id: 'vrai', libelle: 'Si vrai' },
    { id: 'faux', libelle: 'Si faux' },
  ],
  champs: [
    { nom: 'chemin', libelle: 'Donnée à tester (chemin)', type: 'texte', aide: 'Par exemple « email.objet ».' },
    { nom: 'operateur', libelle: 'Test', type: 'selection', options: Object.entries(OPERATEURS).map(([valeur, libelle]) => ({ valeur, libelle })) },
    { nom: 'valeur', libelle: 'Valeur à comparer', type: 'texte', visibleSi: (config) => !OPERATEURS_SANS_VALEUR.includes(config.operateur) },
  ],
  configParDefaut: () => ({ chemin: '', operateur: 'contient', valeur: '' }),
  resumer: (config) => (config.chemin ? `Teste si ${decrireCondition(config)}` : 'Condition à configurer'),
  verifierConfig: (config) => {
    const erreurs = [verifierChemin(config.chemin)]
    if (!Object.prototype.hasOwnProperty.call(OPERATEURS, config.operateur)) erreurs.push('Choisissez un test.')
    return erreurs.filter(Boolean)
  },
  executer: ({ entree, config }) => {
    const resultat = evaluerCondition(config, entree)
    return {
      donnees: entree,
      sortiesActives: [resultat ? 'vrai' : 'faux'],
      explication: `Test : ${decrireCondition(config)}. Réponse : ${resultat ? 'vrai' : 'faux'}. Les données suivent le chemin « ${resultat ? 'Si vrai' : 'Si faux'} ».`,
    }
  },
}
