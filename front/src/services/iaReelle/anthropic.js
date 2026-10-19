/**
 * Adaptateur Anthropic : appel direct du navigateur à l'API Messages, avec la clé de l'apprenant.
 * Rien ne passe par le site (LAB-08). L'en-tête anthropic-dangerous-direct-browser-access autorise
 * cet appel depuis une page web : il est voulu ici, car la clé appartient à la personne qui l'utilise.
 */
import { erreur } from './erreurs.js'

export const ADRESSE = 'https://api.anthropic.com/v1/messages'
const VERSION_API = '2023-06-01'

export default {
  id: 'anthropic',
  libelle: 'Anthropic',
  lieuDonnees: 'aux États-Unis',
  horsUnionEuropeenne: true,
  modeles: [
    { id: 'claude-haiku-5-5', libelle: 'Claude Haiku 5.5 (rapide, le moins cher)' },
    { id: 'claude-sonnet-5-5', libelle: 'Claude Sonnet 5.5 (plus précis, plus cher)' },
  ],
  pageCles: 'https://platform.claude.com/settings/keys',
  pageFacturation: 'https://platform.claude.com/settings/billing',
  // Format d'une clé, pour aider à repérer une erreur de copie (le fournisseur reste seul juge)
  formatCle: /^sk-ant-[A-Za-z0-9_-]{20,}$/,

  requete({ cle, modele, consigne, message, maxJetons }) {
    return {
      url: ADRESSE,
      init: {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': cle,
          'anthropic-version': VERSION_API,
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: modele,
          max_tokens: maxJetons,
          ...(consigne ? { system: consigne } : {}),
          messages: [{ role: 'user', content: message }],
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
    if (!reponse.ok) throw erreurDuStatut(reponse.status, corps)
    const texte = (corps?.content ?? []).filter((bloc) => bloc?.type === 'text').map((bloc) => bloc.text).join('\n').trim()
    if (!texte) throw erreur('REPONSE_ILLISIBLE')
    return { texte, modele: typeof corps.model === 'string' ? corps.model : null }
  },
}

function erreurDuStatut(statut, corps) {
  const type = corps?.error?.type ?? ''
  const detail = String(corps?.error?.message ?? '').toLowerCase()
  if (statut === 401) return erreur('CLE_REFUSEE')
  if (statut === 403) return erreur('ACCES_REFUSE')
  if (statut === 402 || detail.includes('credit') || detail.includes('billing')) return erreur('CREDIT_EPUISE')
  if (statut === 429) return erreur('TROP_DE_REQUETES')
  if (statut === 404 || type === 'not_found_error') return erreur('MODELE_INCONNU')
  if (statut >= 500) return erreur('INDISPONIBLE')
  return erreur('DEMANDE_REFUSEE')
}
