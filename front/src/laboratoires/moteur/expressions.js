/**
 * Mini-langage des laboratoires : lecture de chemins, conditions et gabarits.
 * Aucun code fourni par l'apprenant n'est exécuté : tout passe par ces fonctions déclaratives.
 */
import { ErreurExecution, LIMITES } from './erreurs.js'
import { cloner } from './cloner.js'

// Segments interdits : ils donneraient accès aux prototypes JavaScript
const SEGMENTS_INTERDITS = new Set(['__proto__', 'prototype', 'constructor'])
const SEGMENT_VALIDE = /^[\p{L}\p{N}_-]+$/u

export const OPERATEURS = {
  egal: 'est égal à',
  different: 'est différent de',
  contient: 'contient',
  commencePar: 'commence par',
  superieur: 'est supérieur à',
  inferieur: 'est inférieur à',
  existe: 'existe',
  absent: "n'existe pas",
}

// Opérateurs qui n'ont pas besoin d'une valeur à comparer
export const OPERATEURS_SANS_VALEUR = ['existe', 'absent']

/**
 * Vérifie un chemin comme « email.objet » ou « documents.0.titre ».
 * Renvoie un message d'erreur, ou null si le chemin est valide.
 */
export function verifierChemin(chemin) {
  if (typeof chemin !== 'string' || chemin.trim() === '') return 'Indiquez un chemin, par exemple « email.objet ».'
  const segments = chemin.trim().split('.')
  if (segments.length > LIMITES.profondeurChemin) return `Le chemin ne peut pas dépasser ${LIMITES.profondeurChemin} niveaux.`
  for (const segment of segments) {
    if (SEGMENTS_INTERDITS.has(segment)) return `Le nom « ${segment} » n'est pas autorisé dans un chemin.`
    if (!SEGMENT_VALIDE.test(segment)) return `Le chemin « ${chemin} » contient un caractère non autorisé. Utilisez des lettres, des chiffres et des points.`
  }
  return null
}

const segmentsDe = (chemin) => {
  const erreur = verifierChemin(chemin)
  if (erreur) throw new ErreurExecution('CHEMIN_INVALIDE', erreur)
  return chemin.trim().split('.')
}

const estObjet = (valeur) => valeur !== null && typeof valeur === 'object'

/**
 * Lit une valeur à un chemin. Renvoie { trouve, valeur }.
 */
export function lireChemin(donnees, chemin) {
  let courant = donnees
  for (const segment of segmentsDe(chemin)) {
    if (!estObjet(courant) || !Object.prototype.hasOwnProperty.call(courant, segment)) {
      return { trouve: false, valeur: undefined }
    }
    courant = courant[segment]
  }
  return { trouve: true, valeur: courant }
}

// Lit une valeur ou lève une erreur pédagogique si elle manque
export function lireCheminObligatoire(donnees, chemin) {
  const { trouve, valeur } = lireChemin(donnees, chemin)
  if (!trouve) {
    throw new ErreurExecution('CHEMIN_INTROUVABLE', `Aucune donnée à l'emplacement « ${chemin} ». Regardez les données reçues par ce bloc.`)
  }
  return valeur
}

/**
 * Renvoie une copie des données avec la valeur écrite au chemin (les objets intermédiaires sont créés).
 */
export function ecrireChemin(donnees, chemin, valeur) {
  const segments = segmentsDe(chemin)
  const racine = estObjet(donnees) ? cloner(donnees) : {}
  let courant = racine
  segments.slice(0, -1).forEach((segment) => {
    if (!estObjet(courant[segment])) courant[segment] = {}
    courant = courant[segment]
  })
  courant[segments.at(-1)] = valeur
  return racine
}

export function supprimerChemin(donnees, chemin) {
  const segments = segmentsDe(chemin)
  const racine = cloner(donnees)
  let courant = racine
  for (const segment of segments.slice(0, -1)) {
    if (!estObjet(courant[segment])) return racine
    courant = courant[segment]
  }
  delete courant[segments.at(-1)]
  return racine
}

const enTexte = (valeur) => (estObjet(valeur) ? JSON.stringify(valeur) : String(valeur))

const enNombre = (valeur, chemin) => {
  const nombre = typeof valeur === 'number' ? valeur : Number(String(valeur).replace(',', '.'))
  if (Number.isNaN(nombre)) {
    throw new ErreurExecution('PAS_UN_NOMBRE', `La valeur « ${enTexte(valeur)} »${chemin ? ` (${chemin})` : ''} n'est pas un nombre : impossible de la comparer.`)
  }
  return nombre
}

// Comparaison souple : « 3 » et 3 sont égaux, les majuscules ne comptent pas pour un texte
const egal = (a, b) => {
  if (typeof a === 'number' || typeof b === 'number') {
    const na = Number(a)
    const nb = Number(b)
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na === nb
  }
  if (typeof a === 'boolean' || typeof b === 'boolean') return String(a) === String(b)
  return enTexte(a).trim().toLocaleLowerCase('fr') === enTexte(b).trim().toLocaleLowerCase('fr')
}

/**
 * Évalue une condition simple { chemin, operateur, valeur }
 * ou composée { toutes: [...] } / { une: [...] }.
 */
export function evaluerCondition(condition, donnees) {
  if (Array.isArray(condition?.toutes)) return condition.toutes.every((c) => evaluerCondition(c, donnees))
  if (Array.isArray(condition?.une)) return condition.une.some((c) => evaluerCondition(c, donnees))

  const { chemin, operateur, valeur } = condition ?? {}
  if (!Object.prototype.hasOwnProperty.call(OPERATEURS, operateur)) {
    throw new ErreurExecution('OPERATEUR_INCONNU', `L'opérateur « ${operateur} » n'existe pas.`)
  }
  const lu = lireChemin(donnees, chemin)
  if (operateur === 'existe') return lu.trouve
  if (operateur === 'absent') return !lu.trouve
  if (!lu.trouve) {
    throw new ErreurExecution('CHEMIN_INTROUVABLE', `La condition lit « ${chemin} », mais cette donnée n'existe pas. Vérifiez l'orthographe du chemin.`)
  }

  const actuelle = lu.valeur
  switch (operateur) {
    case 'egal':
      return egal(actuelle, valeur)
    case 'different':
      return !egal(actuelle, valeur)
    case 'contient':
      if (Array.isArray(actuelle)) return actuelle.some((element) => egal(element, valeur))
      return enTexte(actuelle).toLocaleLowerCase('fr').includes(enTexte(valeur).toLocaleLowerCase('fr'))
    case 'commencePar':
      return enTexte(actuelle).trim().toLocaleLowerCase('fr').startsWith(enTexte(valeur).toLocaleLowerCase('fr'))
    case 'superieur':
      return enNombre(actuelle, chemin) > enNombre(valeur)
    case 'inferieur':
      return enNombre(actuelle, chemin) < enNombre(valeur)
    default:
      return false
  }
}

// Phrase lisible : « email.objet contient « facture » »
export function decrireCondition(condition) {
  if (Array.isArray(condition?.toutes)) return condition.toutes.map(decrireCondition).join(' et ')
  if (Array.isArray(condition?.une)) return condition.une.map(decrireCondition).join(' ou ')
  const { chemin, operateur, valeur } = condition ?? {}
  const texte = `« ${chemin} » ${OPERATEURS[operateur] ?? operateur}`
  return OPERATEURS_SANS_VALEUR.includes(operateur) ? texte : `${texte} « ${valeur} »`
}

const GABARIT = /\{\{\s*([^{}\s]+)\s*\}\}/g

/**
 * Remplace {{chemin}} par la valeur lue dans les données. Une donnée absente est une erreur.
 */
export function remplirGabarit(texte, donnees) {
  return String(texte ?? '').replace(GABARIT, (_, chemin) => enTexte(lireCheminObligatoire(donnees, chemin)))
}

export function cheminsDuGabarit(texte) {
  return [...String(texte ?? '').matchAll(GABARIT)].map((m) => m[1])
}
