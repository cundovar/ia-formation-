import api from '@/services/api'

// Captures publiées demandées (marqueurs [capture:ID] d'un cours, diapositives « capture » d'un diaporama)
export async function chargerCaptures(ids) {
  const query = ids.map((id) => `id[]=${encodeURIComponent(id)}`).join('&')
  const { data } = await api.get(`/captures?${query}`)
  return data.member ?? []
}
