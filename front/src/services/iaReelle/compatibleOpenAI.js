/**
 * Fabrique d'adaptateurs pour les API « compatibles OpenAI » (/chat/completions, clé en en-tête
 * Authorization). Comme pour Anthropic, le navigateur appelle directement le fournisseur avec la clé
 * de l'apprenant : rien ne passe par le site (LAB-08).
 */
import { erreur } from './erreurs.js'

export function creerFournisseurCompatibleOpenAI({ adresse, erreurMetier = () => null, ...fiche }) {
  return {
    ...fiche,
    adresse,

    requete({ cle, modele, consigne, message, maxJetons }) {
      return {
        url: adresse,
        init: {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${cle}`,
          },
          body: JSON.stringify({
            model: modele,
            max_tokens: maxJetons,
            messages: [
              ...(consigne ? [{ role: 'system', content: consigne }] : []),
              { role: 'user', content: message },
            ],
            // Sans réflexion préalable : elle consommerait les jetons et laisserait la réponse vide
            thinking: { type: 'disabled' },
            stream: false,
          }),
          // Aucun cookie du site, aucune adresse de page transmise au fournisseur
          credentials: 'omit',
          referrerPolicy: 'no-referrer',
          cache: 'no-store',
        },
      }
    },

    async lireReponse(reponse) {
      const corps = await reponse.json().catch(() => null)
      if (!reponse.ok) throw erreurMetier(String(corps?.error?.code ?? ''), reponse.status) ?? erreurDuStatut(reponse.status)
      const texte = String(corps?.choices?.[0]?.message?.content ?? '').trim()
      if (!texte) throw erreur('REPONSE_ILLISIBLE')
      return { texte, modele: typeof corps.model === 'string' ? corps.model : null }
    },
  }
}

function erreurDuStatut(statut) {
  if (statut === 401) return erreur('CLE_REFUSEE')
  if (statut === 403) return erreur('ACCES_REFUSE')
  if (statut === 402) return erreur('CREDIT_EPUISE')
  if (statut === 429) return erreur('TROP_DE_REQUETES')
  if (statut === 404) return erreur('MODELE_INCONNU')
  if (statut >= 500) return erreur('INDISPONIBLE')
  return erreur('DEMANDE_REFUSEE')
}
