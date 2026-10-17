import { ErreurExecution } from '../moteur/erreurs.js'
import {
  cheminsDuGabarit,
  ecrireChemin,
  lireCheminObligatoire,
  remplirGabarit,
  supprimerChemin,
  verifierChemin,
} from '../moteur/expressions.js'

export const OPERATIONS = {
  definir: 'Écrire une valeur',
  copier: 'Copier une donnée',
  renommer: 'Déplacer ou renommer une donnée',
  supprimer: 'Supprimer une donnée',
  minuscules: 'Mettre en minuscules',
  compter: 'Compter les éléments d\'une liste',
}

const avecSource = ['copier', 'renommer', 'compter']

const operations = {
  definir: (entree, { champ, valeur }) => {
    const texte = remplirGabarit(valeur, entree)
    return { donnees: ecrireChemin(entree, champ, texte), explication: `Le bloc écrit dans « ${champ} » la valeur « ${texte} ».` }
  },
  copier: (entree, { champ, source }) => ({
    donnees: ecrireChemin(entree, champ, lireCheminObligatoire(entree, source)),
    explication: `Le bloc copie « ${source} » dans « ${champ} ».`,
  }),
  renommer: (entree, { champ, source }) => ({
    donnees: ecrireChemin(supprimerChemin(entree, source), champ, lireCheminObligatoire(entree, source)),
    explication: `Le bloc déplace « ${source} » vers « ${champ} ».`,
  }),
  supprimer: (entree, { champ }) => {
    lireCheminObligatoire(entree, champ)
    return { donnees: supprimerChemin(entree, champ), explication: `Le bloc supprime « ${champ} ».` }
  },
  minuscules: (entree, { champ }) => ({
    donnees: ecrireChemin(entree, champ, String(lireCheminObligatoire(entree, champ)).toLocaleLowerCase('fr')),
    explication: `Le bloc met « ${champ} » en minuscules.`,
  }),
  compter: (entree, { champ, source }) => {
    const liste = lireCheminObligatoire(entree, source)
    if (!Array.isArray(liste)) throw new ErreurExecution('PAS_UNE_LISTE', `« ${source} » n'est pas une liste : impossible de compter ses éléments.`)
    return {
      donnees: ecrireChemin(entree, champ, liste.length),
      explication: `Le bloc compte ${liste.length} élément(s) dans « ${source} » et écrit ce nombre dans « ${champ} ».`,
    }
  },
}

export default {
  type: 'transformation',
  libelle: 'Transformation',
  description: 'Modifie les données : écrire, copier, déplacer, supprimer ou compter.',
  icone: 'fas fa-wand-magic-sparkles',
  couleur: 'emerald',
  entrees: ['entree'],
  sorties: [{ id: 'sortie', libelle: 'Ensuite' }],
  champs: [
    { nom: 'operation', libelle: 'Opération', type: 'selection', options: Object.entries(OPERATIONS).map(([valeur, libelle]) => ({ valeur, libelle })) },
    { nom: 'source', libelle: 'Donnée de départ (chemin)', type: 'texte', visibleSi: (config) => avecSource.includes(config.operation) },
    { nom: 'champ', libelle: 'Donnée à écrire ou à modifier (chemin)', type: 'texte' },
    {
      nom: 'valeur',
      libelle: 'Valeur',
      type: 'texte',
      aide: 'Pour reprendre une donnée, écrivez son chemin entre doubles accolades : {{contact.prenom}}.',
      visibleSi: (config) => config.operation === 'definir',
    },
  ],
  configParDefaut: () => ({ operation: 'definir', champ: '', source: '', valeur: '' }),
  resumer: (config) => {
    if (!config.champ) return 'Transformation à configurer'
    if (config.operation === 'definir') return `Écrit « ${config.valeur} » dans « ${config.champ} »`
    if (avecSource.includes(config.operation)) return `${OPERATIONS[config.operation]} : « ${config.source || '?'} » → « ${config.champ} »`
    return `${OPERATIONS[config.operation] ?? 'Opération'} : « ${config.champ} »`
  },
  verifierConfig: (config) => {
    if (!Object.prototype.hasOwnProperty.call(operations, config.operation)) return ['Choisissez une opération.']
    const erreurs = [verifierChemin(config.champ)]
    if (avecSource.includes(config.operation)) erreurs.push(verifierChemin(config.source))
    if (config.operation === 'definir') erreurs.push(...cheminsDuGabarit(config.valeur).map(verifierChemin))
    return erreurs.filter(Boolean)
  },
  executer: ({ entree, config }) => operations[config.operation](entree, config),
}
