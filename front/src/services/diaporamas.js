import api from '@/services/api'

/**
 * Diaporamas publiés d'un cours ou de chapitres. L'API ne renvoie que les diaporamas publiés,
 * dont la cible est publiée et accessible (PublishedContentExtension).
 * @param {{ cours?: number, chapitres?: number[] }} cible
 * @returns {Promise<Array>} liste vide si l'API ne répond pas (hors ligne, erreur)
 */
export async function chargerDiaporamas({ cours, chapitres = [] }) {
  const params = new URLSearchParams()
  if (cours) params.append('cours', String(cours))
  chapitres.forEach((id) => params.append('chapitre[]', String(id)))
  if ([...params.keys()].length === 0) return []

  try {
    const { data } = await api.get(`/diaporamas?${params}`)
    return data.member ?? []
  } catch {
    return []
  }
}

// Identifiant d'une cible, qu'elle soit donnée par un nombre, une IRI (/api/menus/3) ou un objet
export const idCible = (cible) => {
  if (cible && typeof cible === 'object') return Number(cible.id)
  return Number(String(cible ?? '').split('/').pop()) || null
}
