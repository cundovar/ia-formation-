/**
 * API fictive : répond aux requêtes d'un bloc API d'après la définition du laboratoire.
 * Aucune requête ne part sur le réseau : la réponse est cherchée dans une table.
 *
 * simulateurs.api : [{
 *   methode: 'GET', url: 'https://meteo.exemple.test/previsions',
 *   reponses: [{ si?: condition sur { requete }, statut, corps }]   // la première qui convient
 * }]
 */
import { evaluerCondition } from '../moteur/expressions.js'
import { ErreurExecution } from '../moteur/erreurs.js'

export const METHODES = ['GET', 'POST']

// Domaines réservés aux exemples : aucun vrai service ne peut être visé (LAB-02)
const DOMAINE_FICTIF = /(^|[.-])exemple\.(fr|test)$|\.test$|(^|\.)example\.(com|org|net)$/

export const LIBELLES_STATUT = {
  200: 'OK',
  201: 'Créé',
  400: 'Requête incorrecte',
  401: 'Non autorisé',
  403: 'Interdit',
  404: 'Introuvable',
  405: 'Méthode non autorisée',
  429: 'Trop de requêtes',
  500: 'Erreur du serveur',
}

/**
 * Découpe une adresse. Renvoie { url, adresse, parametres } ou { erreur }.
 */
export function analyserUrl(texte) {
  let url
  try {
    url = new URL(String(texte ?? '').trim())
  } catch {
    return { erreur: 'L\'adresse n\'est pas valide. Elle commence par https://' }
  }
  if (url.protocol !== 'https:') return { erreur: 'L\'adresse doit commencer par https://' }
  if (!DOMAINE_FICTIF.test(url.hostname)) {
    return { erreur: `Le domaine « ${url.hostname} » n'est pas un domaine d'exemple : le simulateur ne contacte que des API fictives (exemple.test, exemple.fr).` }
  }
  return { adresse: `${url.origin}${url.pathname}`, parametres: Object.fromEntries(url.searchParams) }
}

// Une réponse dont la condition lit un paramètre absent ne correspond simplement pas
const correspond = (condition, requete) => {
  try {
    return evaluerCondition(condition, { requete })
  } catch {
    return false
  }
}

export function repondre(simulateursApi = [], requete) {
  const service = simulateursApi.find((candidat) => candidat.methode === requete.methode && candidat.url === requete.adresse)
  if (!service) {
    const autreMethode = simulateursApi.some((candidat) => candidat.url === requete.adresse)
    return autreMethode
      ? { statut: 405, corps: { erreur: `La méthode ${requete.methode} n'est pas acceptée à cette adresse.` } }
      : { statut: 404, corps: { erreur: 'Aucun service à cette adresse.' } }
  }
  const reponse = service.reponses.find((candidat) => !candidat.si || correspond(candidat.si, requete))
  if (!reponse) throw new ErreurExecution('API_SANS_REPONSE', 'L\'API fictive n\'a pas de réponse prévue pour cette requête.')
  return { statut: reponse.statut, corps: reponse.corps ?? null }
}

export const decrireStatut = (statut) => `${statut} ${LIBELLES_STATUT[statut] ?? ''}`.trim()
