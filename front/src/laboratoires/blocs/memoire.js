import { cloner } from '../moteur/cloner.js'
import { ErreurExecution } from '../moteur/erreurs.js'
import { ecrireChemin, lireCheminObligatoire, verifierChemin } from '../moteur/expressions.js'

export const ACTIONS_MEMOIRE = { enregistrer: 'Retenir une donnée', lire: 'Relire la mémoire', oublier: 'Oublier une donnée' }
const CLES_MAX = 10
const CLE_VALIDE = /^[\p{L}\p{N}_-]+$/u

const avecCle = (config) => config.action !== 'lire'

export default {
  type: 'memoire',
  libelle: 'Mémoire',
  description: 'Retient des données d\'un bloc à l\'autre, pendant cette exécution seulement. Rien n\'est gardé après : la mémoire est vide à chaque exécution.',
  icone: 'fas fa-brain',
  couleur: 'fuchsia',
  entrees: ['entree'],
  sorties: [{ id: 'sortie', libelle: 'Ensuite' }],
  champs: [
    { nom: 'action', libelle: 'Action', type: 'selection', options: Object.entries(ACTIONS_MEMOIRE).map(([valeur, libelle]) => ({ valeur, libelle })) },
    { nom: 'cle', libelle: 'Nom du souvenir', type: 'texte', aide: 'Un mot, par exemple « prenom ».', visibleSi: avecCle },
    { nom: 'source', libelle: 'Donnée à retenir (chemin)', type: 'texte', aide: 'Retenez seulement ce qui est utile, jamais une donnée sensible.', visibleSi: (config) => config.action === 'enregistrer' },
    { nom: 'champ', libelle: 'Où ranger la mémoire relue (chemin)', type: 'texte', aide: 'Par exemple « conversation.memoire ».', visibleSi: (config) => config.action === 'lire' },
  ],
  configParDefaut: () => ({ action: 'enregistrer', cle: '', source: '', champ: 'memoire' }),
  resumer: (config) => ({
    enregistrer: `Retient « ${config.source || '?'} » sous « ${config.cle || '?'} »`,
    lire: `Relit la mémoire → « ${config.champ || '?'} »`,
    oublier: `Oublie « ${config.cle || '?'} »`,
  }[config.action] ?? 'Mémoire à configurer'),
  verifierConfig: (config) => {
    if (!(config.action in ACTIONS_MEMOIRE)) return ['Choisissez une action.']
    const erreurs = []
    if (avecCle(config) && !CLE_VALIDE.test(String(config.cle ?? ''))) erreurs.push('Le nom du souvenir est un mot, sans espace ni point.')
    if (['__proto__', 'prototype', 'constructor'].includes(config.cle)) erreurs.push(`Le nom « ${config.cle} » n'est pas autorisé.`)
    if (config.action === 'enregistrer') erreurs.push(verifierChemin(config.source))
    if (config.action === 'lire') erreurs.push(verifierChemin(config.champ))
    return erreurs.filter(Boolean)
  },
  executer: ({ entree, config, contexte }) => {
    const etat = cloner(contexte.etat ?? {})
    const memoire = etat.memoire ?? {}
    if (config.action === 'enregistrer') {
      const valeur = lireCheminObligatoire(entree, config.source)
      if (!(config.cle in memoire) && Object.keys(memoire).length >= CLES_MAX) {
        throw new ErreurExecution('MEMOIRE_PLEINE', `La mémoire garde ${CLES_MAX} souvenirs au plus.`)
      }
      etat.memoire = { ...memoire, [config.cle]: cloner(valeur) }
      return {
        donnees: entree,
        etat,
        evenements: [{ type: 'memoire', action: 'enregistrer', cle: config.cle, valeur: cloner(valeur) }],
        explication: `La mémoire retient « ${config.cle} » : ${JSON.stringify(valeur)}. Elle sera vide à la prochaine exécution.`,
      }
    }
    if (config.action === 'oublier') {
      const { [config.cle]: oublie, ...reste } = memoire
      etat.memoire = reste
      return {
        donnees: entree,
        etat,
        explication: oublie === undefined ? `Rien à oublier : la mémoire ne contient pas « ${config.cle} ».` : `La mémoire oublie « ${config.cle} ».`,
      }
    }
    const cles = Object.keys(memoire)
    return {
      donnees: ecrireChemin(entree, config.champ, cloner(memoire)),
      explication: cles.length
        ? `La mémoire contient ${cles.map((cle) => `« ${cle} »`).join(', ')}. Son contenu est rangé dans « ${config.champ} ».`
        : `La mémoire est vide. « ${config.champ} » reçoit un objet vide.`,
    }
  },
}
