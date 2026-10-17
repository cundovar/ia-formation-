import { ErreurExecution } from '../moteur/erreurs.js'
import { ecrireChemin, lireChemin, verifierChemin } from '../moteur/expressions.js'
import { appelerOutil, decrireOutil, PERMISSIONS } from '../simulateurs/outilsFictifs.js'

export default {
  type: 'outil',
  libelle: 'Outil (fictif)',
  description: 'Exécute l\'outil demandé par un agent, après avoir vérifié ses arguments. L\'outil est fictif : il ne modifie rien pour de vrai.',
  icone: 'fas fa-screwdriver-wrench',
  couleur: 'orange',
  entrees: ['entree'],
  sorties: [{ id: 'sortie', libelle: 'Ensuite' }],
  champs: [
    { nom: 'appel', libelle: 'Demande d\'outil à exécuter (chemin)', type: 'texte', aide: 'Là où l\'agent a rangé sa demande, par exemple « agent.appel ».' },
    { nom: 'champ', libelle: 'Où ranger le résultat (chemin)', type: 'texte', aide: 'Par exemple « resultatOutil ».' },
  ],
  configParDefaut: () => ({ appel: 'agent.appel', champ: 'resultatOutil' }),
  resumer: (config) => `Exécute « ${config.appel || '?'} » → « ${config.champ || '?'} »`,
  informations: (simulateurs) => (simulateurs?.outils ?? []).map((outil) => `Outil ${decrireOutil(outil)}`),
  verifierConfig: (config) => [verifierChemin(config.appel), verifierChemin(config.champ)].filter(Boolean),
  executer: ({ entree, config, contexte }) => {
    const { trouve, valeur: demande } = lireChemin(entree, config.appel)
    if (!trouve || !demande || typeof demande.outil !== 'string') {
      throw new ErreurExecution('APPEL_MANQUANT', `Aucune demande d'outil à « ${config.appel} ». Reliez ce bloc à la sortie « S'il demande un outil » d'un agent.`)
    }
    const appel = appelerOutil(contexte.simulateurs?.outils ?? [], demande.outil, demande.arguments)
    if (appel.erreurs.length) {
      throw new ErreurExecution('ARGUMENTS_INVALIDES', `L'outil « ${demande.outil} » refuse la demande : ${appel.erreurs.join(' ')}`)
    }
    const ecriture = appel.outil.permission === 'ecriture'
    const valide = lireChemin(entree, 'validation.decision').valeur === 'approuver'
    const lignes = [`Outil « ${demande.outil} » (${PERMISSIONS[appel.outil.permission] ?? appel.outil.permission}) exécuté avec ${JSON.stringify(appel.arguments)}.`]
    if (ecriture) lignes.push(valide ? 'Une personne a approuvé cette action.' : 'Attention : cet outil modifie des données et personne n\'a validé l\'action.')
    lignes.push(`Le résultat est rangé dans « ${config.champ} ».`)
    return {
      donnees: ecrireChemin(entree, config.champ, appel.resultat),
      explication: lignes.join(' '),
      evenements: [{ type: 'outil', outil: demande.outil, arguments: appel.arguments, permission: appel.outil.permission }],
    }
  },
}
