/**
 * Outils fictifs d'un laboratoire : un agent simulé peut demander à les utiliser.
 * Aucun outil n'agit pour de vrai : la réponse est cherchée dans une table.
 *
 * simulateurs.outils : [{
 *   nom: 'chercher_livre', description: '…', permission: 'lecture' | 'ecriture',
 *   parametres: { titre: { type: 'texte' | 'nombre' | 'booleen', description, obligatoire } },
 *   reponses: [{ si?: condition sur { arguments }, resultat }]   // la première qui convient
 * }]
 */
import { evaluerCondition } from '../moteur/expressions.js'
import { ErreurExecution } from '../moteur/erreurs.js'

export const PERMISSIONS = { lecture: 'lecture seule', ecriture: 'modifie des données' }
export const TYPES_PARAMETRE = { texte: 'string', nombre: 'number', booleen: 'boolean' }

export const trouverOutil = (outils = [], nom) => outils.find((outil) => outil.nom === nom) ?? null

// Une valeur reçue d'un gabarit est un texte : « 3 » est accepté pour un nombre, « vrai » pour un booléen
const convertir = (valeur, type) => {
  if (type === 'nombre' && typeof valeur === 'string' && valeur.trim() !== '' && !Number.isNaN(Number(valeur))) return Number(valeur)
  if (type === 'booleen' && typeof valeur === 'string' && ['true', 'false', 'vrai', 'faux'].includes(valeur.toLowerCase())) {
    return ['true', 'vrai'].includes(valeur.toLowerCase())
  }
  return valeur
}

const typeDe = (valeur) => (typeof valeur === 'number' ? 'nombre' : typeof valeur === 'boolean' ? 'booleen' : typeof valeur === 'string' ? 'texte' : 'autre')

/**
 * Vérifie les arguments d'un appel d'après les paramètres déclarés de l'outil.
 * Renvoie { arguments (convertis), erreurs: [message] }.
 */
export function verifierArguments(outil, argumentsRecus) {
  const recus = argumentsRecus && typeof argumentsRecus === 'object' && !Array.isArray(argumentsRecus) ? argumentsRecus : {}
  const parametres = outil.parametres ?? {}
  const erreurs = []
  const convertis = {}
  Object.entries(recus).forEach(([nom, valeur]) => {
    const parametre = Object.prototype.hasOwnProperty.call(parametres, nom) ? parametres[nom] : null
    if (!parametre) {
      erreurs.push(`le paramètre « ${nom} » n'existe pas pour l'outil « ${outil.nom} ».`)
      return
    }
    const converti = convertir(valeur, parametre.type)
    if (typeDe(converti) !== parametre.type) erreurs.push(`le paramètre « ${nom} » doit être de type ${parametre.type}.`)
    else if (parametre.type === 'texte' && converti.trim() === '' && parametre.obligatoire) erreurs.push(`le paramètre « ${nom} » est vide.`)
    convertis[nom] = converti
  })
  Object.entries(parametres)
    .filter(([nom, parametre]) => parametre.obligatoire && !Object.prototype.hasOwnProperty.call(recus, nom))
    .forEach(([nom]) => erreurs.push(`le paramètre obligatoire « ${nom} » manque.`))
  return { arguments: convertis, erreurs }
}

const correspond = (condition, argumentsAppel) => {
  try {
    return evaluerCondition(condition, { arguments: argumentsAppel })
  } catch {
    return false
  }
}

/**
 * Appelle un outil fictif. Lève une erreur si l'outil est inconnu ; renvoie { outil, arguments, erreurs, resultat }.
 * Des arguments invalides ne lèvent pas d'erreur : l'appelant décide comment le signaler.
 */
export function appelerOutil(outils = [], nom, argumentsRecus) {
  const outil = trouverOutil(outils, nom)
  if (!outil) throw new ErreurExecution('OUTIL_INCONNU', `L'outil « ${nom} » n'existe pas dans ce laboratoire.`)
  const verification = verifierArguments(outil, argumentsRecus)
  if (verification.erreurs.length) return { outil, arguments: verification.arguments, erreurs: verification.erreurs, resultat: null }
  const reponse = (outil.reponses ?? []).find((candidat) => !candidat.si || correspond(candidat.si, verification.arguments))
  if (!reponse) throw new ErreurExecution('OUTIL_SANS_REPONSE', `L'outil fictif « ${nom} » n'a pas de réponse prévue pour ces arguments.`)
  return { outil, arguments: verification.arguments, erreurs: [], resultat: reponse.resultat ?? null }
}

// Description d'un outil pour l'apprenant : « chercher_livre (lecture seule) : … Paramètres : titre (texte, obligatoire) »
export function decrireOutil(outil) {
  const parametres = Object.entries(outil.parametres ?? {})
    .map(([nom, parametre]) => `${nom} (${parametre.type}${parametre.obligatoire ? ', obligatoire' : ''})`)
  return `${outil.nom} (${PERMISSIONS[outil.permission] ?? outil.permission}) : ${outil.description}${parametres.length ? ` Paramètres : ${parametres.join(', ')}.` : ''}`
}
