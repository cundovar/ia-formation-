import api from '@/services/api'

/**
 * Diaporamas publiés d'un cours, de chapitres ou d'un parcours. L'API ne renvoie que les diaporamas
 * publiés, dont la cible est publiée et accessible (PublishedContentExtension).
 * @param {{ cours?: number, chapitres?: number[], parcours?: number }} cible
 * @returns {Promise<Array>} liste vide si l'API ne répond pas (hors ligne, erreur)
 */
export async function chargerDiaporamas({ cours, chapitres = [], parcours }) {
  const params = new URLSearchParams()
  if (cours) params.append('cours', String(cours))
  chapitres.forEach((id) => params.append('chapitre[]', String(id)))
  if (parcours) params.append('parcours', String(parcours))
  if ([...params.keys()].length === 0) return []

  try {
    const { data } = await api.get(`/diaporamas?${params}`)
    return data.member ?? []
  } catch {
    return []
  }
}

/**
 * Un diaporama publié (projection) ; null s'il n'est pas accessible.
 * @param {number} id
 */
export async function chargerDiaporama(id) {
  try {
    const { data } = await api.get(`/diaporamas/${Number(id)}`)
    return data
  } catch {
    return null
  }
}

/**
 * Aperçu d'un diaporama, brouillon compris, avec ses contrôles : réservé aux administrateurs
 * (/api/apercu-diaporamas, jamais mis en cache hors ligne). Lève une erreur si l'accès est refusé.
 * @param {number} id
 */
export async function chargerApercuDiaporama(id) {
  const { data } = await api.get(`/apercu-diaporamas/${Number(id)}`)
  return data
}

// Identifiant d'une cible, qu'elle soit donnée par un nombre, une IRI (/api/menus/3) ou un objet
export const idCible = (cible) => {
  if (cible && typeof cible === 'object') return Number(cible.id)
  return Number(String(cible ?? '').split('/').pop()) || null
}
