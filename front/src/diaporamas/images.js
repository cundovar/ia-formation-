// Captures d'un diaporama : chargées depuis l'API des captures, puis lues en data URL
// pour être intégrées au fichier .pptx. Une capture introuvable (supprimée, hors ligne)
// laisse un cadre « Capture à ajouter » au lieu de casser le diaporama.

export const capturesDuDiaporama = (diaporama) => [...new Set(
  (Array.isArray(diaporama?.diapositives) ? diaporama.diapositives : [])
    .filter((diapo) => diapo?.modele === 'capture' && Number.isInteger(Number(diapo.capture)))
    .map((diapo) => Number(diapo.capture)),
)]

const dateCourte = (iso) => {
  const [annee, mois, jour] = String(iso ?? '').slice(0, 10).split('-')
  return annee && mois && jour ? `${jour}/${mois}/${annee}` : ''
}

export const lireEnDataUrl = async (url) => {
  const reponse = await fetch(url, { credentials: 'same-origin' })
  if (!reponse.ok) throw new Error(`Image indisponible (${reponse.status})`)
  const blob = await reponse.blob()
  return new Promise((resolve, reject) => {
    const lecteur = new FileReader()
    lecteur.onload = () => resolve(lecteur.result)
    lecteur.onerror = () => reject(lecteur.error)
    lecteur.readAsDataURL(blob)
  })
}

/**
 * @param {object} diaporama contenu structuré
 * @param {{ chargerCaptures: (ids: number[]) => Promise<Array>, lireImage?: (url: string) => Promise<string> }} options
 * @returns {Promise<Record<number, object>>} images utilisables par planDiaporama
 */
export const chargerImages = async (diaporama, { chargerCaptures, lireImage = lireEnDataUrl }) => {
  const ids = capturesDuDiaporama(diaporama)
  if (ids.length === 0) return {}

  let captures
  try {
    captures = await chargerCaptures(ids)
  } catch (erreur) {
    console.warn('Captures indisponibles, le diaporama est construit sans elles.', erreur)
    return {}
  }

  const images = {}
  await Promise.all(captures.filter((capture) => capture?.url).map(async (capture) => {
    try {
      images[Number(capture.id)] = {
        data: await lireImage(capture.url),
        largeur: capture.width,
        hauteur: capture.height,
        alt: capture.altText ?? '',
        legende: capture.caption ?? '',
        source: capture.kind === 'illustration' ? 'Illustration pédagogique' : (capture.service ?? ''),
        date: dateCourte(capture.capturedAt),
      }
    } catch (erreur) {
      console.warn(`Capture ${capture.id} indisponible.`, erreur)
    }
  }))
  return images
}
