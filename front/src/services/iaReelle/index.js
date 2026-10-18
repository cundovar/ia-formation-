/**
 * Mode IA réelle des laboratoires (LAB-08) : le navigateur appelle directement le fournisseur choisi,
 * avec la clé de l'apprenant. Ce module est hors du moteur des laboratoires, qui reste sans réseau :
 * il lui est passé sous forme de fonction (`agentReel`).
 */
import anthropic from './anthropic.js'
import { erreur, ErreurIaReelle } from './erreurs.js'

export { ErreurIaReelle }

// Seuls les fournisseurs qui acceptent l'appel direct depuis un navigateur (phase 6, T6.0)
export const FOURNISSEURS = Object.fromEntries([anthropic].map((fournisseur) => [fournisseur.id, fournisseur]))

export const LIMITES_IA_REELLE = {
  consigne: 2000,
  message: 4000,
  maxJetons: 300,
  delaiMs: 30000,
}

export const trouverFournisseur = (id) => (Object.prototype.hasOwnProperty.call(FOURNISSEURS, id) ? FOURNISSEURS[id] : null)

// La donnée transmise à l'agent devient le message de la personne : du texte, ou du JSON lisible
export const versMessage = (contexte) => {
  if (contexte === undefined || contexte === null || contexte === '') return '(Aucune donnée transmise.)'
  return typeof contexte === 'string' ? contexte : JSON.stringify(contexte, null, 2)
}

/**
 * Demande une réponse à une vraie IA. Renvoie { texte, fournisseur, modele }.
 * Lève une ErreurIaReelle (message clair, sans la clé) en cas de problème.
 */
export async function repondre({ fournisseur: idFournisseur, modele, cle, consigne = '', contexte, signal, fetch: fetchFn = globalThis.fetch }) {
  const fournisseur = trouverFournisseur(idFournisseur)
  if (!fournisseur) throw new ErreurIaReelle('FOURNISSEUR_INCONNU', 'Ce fournisseur n\'est pas proposé.')
  if (!fournisseur.modeles.some((candidat) => candidat.id === modele)) throw erreur('MODELE_INCONNU')
  if (typeof cle !== 'string' || !cle.trim()) throw erreur('CLE_MANQUANTE')
  const message = versMessage(contexte)
  if (String(consigne).length > LIMITES_IA_REELLE.consigne || message.length > LIMITES_IA_REELLE.message) throw erreur('ENTREE_TROP_LONGUE')

  // Délai maximal, combiné à une annulation éventuelle par l'appelant
  const controleur = new AbortController()
  let delaiDepasse = false
  const minuteur = setTimeout(() => {
    delaiDepasse = true
    controleur.abort()
  }, LIMITES_IA_REELLE.delaiMs)
  const relayer = () => controleur.abort()
  signal?.addEventListener('abort', relayer, { once: true })

  const { url, init } = fournisseur.requete({ cle: cle.trim(), modele, consigne: String(consigne), message, maxJetons: LIMITES_IA_REELLE.maxJetons })
  try {
    let reponse
    try {
      reponse = await fetchFn(url, { ...init, signal: controleur.signal })
    } catch {
      if (delaiDepasse) throw erreur('DELAI_DEPASSE')
      if (signal?.aborted) throw erreur('ANNULE')
      throw erreur('RESEAU')
    }
    const { texte, modele: modeleRepondu } = await fournisseur.lireReponse(reponse)
    return { texte, fournisseur: fournisseur.libelle, modele: modeleRepondu ?? modele }
  } finally {
    clearTimeout(minuteur)
    signal?.removeEventListener('abort', relayer)
  }
}
