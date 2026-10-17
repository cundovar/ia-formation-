/**
 * Parcours (catégories) d'un public, prêts à afficher dans son catalogue.
 *
 * Un parcours n'apparaît que s'il est visible, destiné à ce public et contient au moins un cours
 * visible. Les parcours sont rangés par rang (champ `ordre`), puis par ordre alphabétique. Le filtre de niveau suit la règle du reste du site : on garde les niveaux inférieurs
 * ou égaux au niveau choisi, et les parcours sans niveau.
 *
 * @param {Array} categories catégories de l'API (déjà filtrées par visibilité)
 * @param {Array} courses contenus de cours (page_contents) de l'API
 * @param {string} audience clé du public ('apprendre' ou 'former')
 * @param {{ordre: number}|null} selectedNiveau niveau choisi dans l'en-tête
 */
export function buildParcours(categories, courses, audience, selectedNiveau = null) {
  return listParcours(categories, courses, (category) => category?.audience === audience, selectedNiveau)
}

/**
 * Parcours d'une grande rubrique (champ `superMenu` d'une catégorie), tous publics confondus,
 * avec les mêmes règles d'affichage et le même ordre que buildParcours.
 *
 * @param {number} rubriqueId identifiant de la rubrique
 */
export function buildParcoursOfRubrique(categories, courses, rubriqueId, selectedNiveau = null) {
  return listParcours(
    categories,
    courses,
    (category) => category?.superMenu?.id === rubriqueId && Boolean(category.audience),
    selectedNiveau
  )
}

/**
 * Grandes rubriques de l'accueil : seules celles qui contiennent au moins un parcours affiché.
 * Rangées par rang (champ `ordre`), puis par nom, chiffres compris (« 2. … » avant « 10. … »).
 */
export function buildRubriques(categories, courses, selectedNiveau = null) {
  const rubriques = new Map()
  for (const category of categories) {
    const rubrique = category?.superMenu
    if (rubrique?.id != null && !rubriques.has(rubrique.id)) rubriques.set(rubrique.id, rubrique)
  }

  return [...rubriques.values()]
    .map((rubrique) => ({
      id: rubrique.id,
      name: rubrique.name ?? '',
      ordre: rubrique.ordre ?? null,
      parcours: buildParcoursOfRubrique(categories, courses, rubrique.id, selectedNiveau),
    }))
    .filter((rubrique) => rubrique.parcours.length > 0)
    .sort(byRankThenName)
}

/**
 * Parcours du menu de gauche regroupés par rubrique, dans l'ordre des rubriques puis des parcours.
 * Les parcours sans rubrique forment un dernier groupe sans titre (`name: null`).
 *
 * @param {Array} categories parcours déjà filtrés pour le menu
 * @returns {Array<{id: number|null, name: string|null, categories: Array}>}
 */
export function groupByRubrique(categories) {
  const groups = new Map()
  for (const category of categories) {
    const rubrique = category?.superMenu?.id != null ? category.superMenu : null
    const key = rubrique?.id ?? 'sans-rubrique'
    if (!groups.has(key)) {
      groups.set(key, { id: rubrique?.id ?? null, name: rubrique?.name ?? null, ordre: rubrique?.ordre ?? null, categories: [] })
    }
    groups.get(key).categories.push(category)
  }

  return [...groups.values()]
    .map((group) => ({ ...group, categories: [...group.categories].sort(byRankThenName) }))
    .sort((a, b) => (a.id === null) - (b.id === null) || byRankThenName(a, b))
}

// Rang croissant (sans rang : à la fin), puis nom avec les chiffres dans l'ordre naturel
const byRankThenName = (a, b) =>
  (a.ordre ?? Number.POSITIVE_INFINITY) - (b.ordre ?? Number.POSITIVE_INFINITY) ||
  (a.name ?? '').localeCompare(b.name ?? '', 'fr', { numeric: true })

function listParcours(categories, courses, belongs, selectedNiveau) {
  return categories
    .filter((category) => belongs(category) && category.visible !== false)
    .filter((category) => matchesNiveau(category.niveauCours, selectedNiveau))
    .map((category) => ({
      id: category.id,
      name: category.name,
      title: capitalize(category.name),
      summary: toPlainText(category.description),
      niveau: category.niveauCours?.name ?? null,
      ordre: category.ordre ?? null,
      // Miniature de la carte : sans illustration, la carte garde une place réservée
      illustration: category.illustrationUrl
        ? { url: category.illustrationUrl, alt: category.illustrationAlt ?? '' }
        : null,
      courseCount: courses.filter(
        (course) => course?.category?.id === category.id && course.visible !== false
      ).length,
    }))
    .filter((parcours) => parcours.courseCount > 0)
    .sort(
      (a, b) =>
        (a.ordre ?? Number.POSITIVE_INFINITY) - (b.ordre ?? Number.POSITIVE_INFINITY) ||
        a.title.localeCompare(b.title, 'fr')
    )
}

/**
 * Rang d'un module d'après son nom : « Chapitre 3 — … », « 3. … » ou « 3 - … » donnent 3, sinon null.
 */
export function chapterNumber(label = '') {
  const match = /^\s*(?:chapitre\s*)?(\d+)\b/i.exec(label)
  return match ? Number(match[1]) : null
}

/**
 * Ordre des modules d'un parcours : d'abord ceux dont le nom porte un numéro de chapitre, dans l'ordre
 * des numéros, puis les autres dans l'ordre où ils arrivent.
 */
export function sortChapters(groups) {
  return groups
    .map((group, index) => ({ group, index, number: chapterNumber(group.label) }))
    .sort((a, b) =>
      (a.number ?? Number.POSITIVE_INFINITY) - (b.number ?? Number.POSITIVE_INFINITY) || a.index - b.index
    )
    .map(({ group }) => group)
}

const matchesNiveau = (niveau, selectedNiveau) =>
  !selectedNiveau || !niveau?.name || niveau.ordre <= selectedNiveau.ordre

const capitalize = (text = '') => text.charAt(0).toUpperCase() + text.slice(1)

// La description vient de l'éditeur du back-office : on n'en garde que le texte pour la carte.
// DOMParser produit un document inerte (ni script ni chargement d'image), contrairement à innerHTML.
export function toPlainText(html) {
  if (!html) return ''
  const text = new DOMParser().parseFromString(html, 'text/html').body.textContent ?? ''
  return text.replace(/\s+/g, ' ').trim()
}
