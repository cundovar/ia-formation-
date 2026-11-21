// Contrôle de rendu dans le navigateur (aperçu d'un brouillon) : mesure le texte réellement affiché.
// - débordement : le contenu d'un bloc de texte dépasse sa zone ;
// - recouvrement : deux blocs de texte se chevauchent ;
// - sortie : un bloc dépasse de la diapositive.
// Ces contrôles demandent un rendu réel (polices, césure) : ils ne s'exécutent pas à l'enregistrement.
// Le résultat est structuré (diapositive, élément, problème, mesure, zone en % de la diapositive) pour être
// renvoyé au serveur et relu par le connecteur (verifier_diaporama, controlesNavigateur).
// Les contrôles sans navigateur (estimation de la place, contraste des jetons du thème) sont dans les tests.

const TOLERANCE = 2 // pixels

const intersection = (a, b) => {
  const largeur = Math.min(a.right, b.right) - Math.max(a.left, b.left)
  const hauteur = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
  return largeur > TOLERANCE && hauteur > TOLERANCE ? { largeur, hauteur } : null
}

const extrait = (element) => (element.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 40)

const role = (element) => (element.classList.contains('diapositive__titre') ? 'titre' : (element.dataset.role || 'texte'))

const arrondi = (valeur) => Math.round(valeur * 10) / 10

// Zone d'un rectangle en pourcentage de la diapositive (indépendante de la taille d'écran)
const zoneRelative = (r, cadre) => ({
  x: arrondi(((r.left - cadre.left) / (cadre.width || 1)) * 100),
  y: arrondi(((r.top - cadre.top) / (cadre.height || 1)) * 100),
  w: arrondi((r.width / (cadre.width || 1)) * 100),
  h: arrondi((r.height / (cadre.height || 1)) * 100),
})

const message = (p) => ({
  texte_petit: `texte sous 24 pt : « ${p.element.extrait} »`,
  debordement: `texte trop long pour sa zone : « ${p.element.extrait} » (${p.mesure.depassementPx} px de trop)`,
  sortie: `bloc hors de la diapositive : « ${p.element.extrait} »`,
  recouvrement: `textes superposés : « ${p.element.extrait} » et « ${p.autre?.extrait ?? ''} »`,
}[p.probleme])

/**
 * @param {HTMLElement|null} diapositive élément `.diapositive`
 * @returns {{ element: {role: string, extrait: string}, autre?: object, probleme: string, mesure: {depassementPx: number, zone: object}, message: string }[]}
 *   vide si tout tient
 */
export const controlerRendu = (diapositive) => {
  if (!diapositive) return []
  const problemes = []
  const ajouter = (p) => problemes.push({ ...p, message: message(p) })
  const cadre = diapositive.getBoundingClientRect()
  const blocs = [...diapositive.querySelectorAll('.diapositive-texte, .diapositive__titre')]
    .filter((bloc) => (bloc.textContent ?? '').trim() !== '')
  blocs.forEach((bloc) => {
    const r = bloc.getBoundingClientRect()
    const element = { role: role(bloc), extrait: extrait(bloc) }
    const taille = Number(bloc.dataset.taillePt)
    if (element.role !== 'repere' && Number.isFinite(taille) && taille < 24) {
      ajouter({ element, probleme: 'texte_petit', mesure: { depassementPx: 0, zone: zoneRelative(r, cadre) } })
    }
    const depasse = Math.max(bloc.scrollHeight - bloc.clientHeight, bloc.scrollWidth - bloc.clientWidth)
    if (depasse > TOLERANCE) {
      ajouter({ element, probleme: 'debordement', mesure: { depassementPx: arrondi(depasse), zone: zoneRelative(r, cadre) } })
    }
    const sortie = Math.max(cadre.left - r.left, r.right - cadre.right, cadre.top - r.top, r.bottom - cadre.bottom)
    if (sortie > TOLERANCE) {
      ajouter({ element, probleme: 'sortie', mesure: { depassementPx: arrondi(sortie), zone: zoneRelative(r, cadre) } })
    }
  })
  for (let i = 0; i < blocs.length; i += 1) {
    for (let j = i + 1; j < blocs.length; j += 1) {
      const a = blocs[i].getBoundingClientRect()
      const b = blocs[j].getBoundingClientRect()
      const commun = intersection(a, b)
      if (commun) {
        const zone = { left: Math.max(a.left, b.left), top: Math.max(a.top, b.top), width: commun.largeur, height: commun.hauteur }
        ajouter({
          element: { role: role(blocs[i]), extrait: extrait(blocs[i]) },
          autre: { role: role(blocs[j]), extrait: extrait(blocs[j]) },
          probleme: 'recouvrement',
          mesure: { depassementPx: arrondi(Math.min(commun.largeur, commun.hauteur)), zone: zoneRelative(zone, cadre) },
        })
      }
    }
  }
  return problemes
}
