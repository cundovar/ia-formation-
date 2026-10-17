/**
 * Erreurs du simulateur : un code stable (pour les tests et les critères) et un message en langage clair.
 */

// Limites qui protègent le navigateur d'un workflow trop gros ou mal formé
export const LIMITES = {
  noeuds: 50,
  liens: 100,
  etapes: 200,
  // Taille maximale des données transmises par un bloc (en caractères JSON)
  tailleDonnees: 50000,
  profondeurChemin: 10,
}

export const creerErreur = (code, message, details = {}) => ({ code, message, ...details })

/**
 * Erreur levée par un bloc pendant l'exécution : le moteur l'attrape et l'écrit dans le journal.
 */
export class ErreurExecution extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'ErreurExecution'
    this.code = code
  }
}
