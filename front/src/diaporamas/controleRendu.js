// Contrôle de rendu dans le navigateur (aperçu d'un brouillon) : mesure le texte réellement affiché.
// - débordement : le contenu d'un bloc de texte dépasse sa zone ;
// - recouvrement : deux blocs de texte se chevauchent ;
// - sortie : un bloc dépasse de la diapositive.
// Ces contrôles demandent un rendu réel (polices, césure) : ils ne s'exécutent pas à l'enregistrement.
// Les contrôles sans navigateur (estimation de la place, contraste des jetons du thème) sont dans les tests.

const TOLERANCE = 2 // pixels

const intersection = (a, b) => {
  const largeur = Math.min(a.right, b.right) - Math.max(a.left, b.left)
  const hauteur = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
  return largeur > TOLERANCE && hauteur > TOLERANCE
}

const extrait = (element) => (element.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 40)

/**
 * @param {HTMLElement|null} diapositive élément `.diapositive`
 * @returns {string[]} messages, vide si tout tient
 */
export const controlerRendu = (diapositive) => {
  if (!diapositive) return []
  const messages = []
  const cadre = diapositive.getBoundingClientRect()
  const blocs = [...diapositive.querySelectorAll('.diapositive-texte, .diapositive__titre')]
    .filter((bloc) => (bloc.textContent ?? '').trim() !== '')
  blocs.forEach((bloc) => {
    if (bloc.scrollHeight > bloc.clientHeight + TOLERANCE || bloc.scrollWidth > bloc.clientWidth + TOLERANCE) {
      messages.push(`texte trop long pour sa zone : « ${extrait(bloc)} »`)
    }
    const r = bloc.getBoundingClientRect()
    if (r.left < cadre.left - TOLERANCE || r.right > cadre.right + TOLERANCE || r.top < cadre.top - TOLERANCE || r.bottom > cadre.bottom + TOLERANCE) {
      messages.push(`bloc hors de la diapositive : « ${extrait(bloc)} »`)
    }
  })
  for (let i = 0; i < blocs.length; i += 1) {
    for (let j = i + 1; j < blocs.length; j += 1) {
      if (intersection(blocs[i].getBoundingClientRect(), blocs[j].getBoundingClientRect())) {
        messages.push(`textes superposés : « ${extrait(blocs[i])} » et « ${extrait(blocs[j])} »`)
      }
    }
  }
  return messages
}
