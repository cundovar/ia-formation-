import { describe, expect, it } from 'vitest'
import { buildParcours, buildParcoursOfRubrique, buildRubriques, chapterNumber, groupByRubrique, sortChapters, toPlainText } from '@/utils/parcours'

const debutant = { name: 'Débutant', ordre: 1 }
const confirme = { name: 'Confirmé', ordre: 2 }

const categories = [
  { id: 1, name: 'messagerie', audience: 'apprendre', description: '<p>Envoyer un <strong>courriel</strong></p>', niveauCours: debutant },
  { id: 2, name: 'démarches', audience: 'apprendre', niveauCours: confirme },
  { id: 3, name: 'animer un atelier', audience: 'former' },
  { id: 4, name: 'brouillon', audience: 'apprendre', visible: false },
  { id: 5, name: 'sans public' },
  { id: 6, name: 'vide', audience: 'apprendre' },
]

const courses = [
  { category: { id: 1 } },
  { category: { id: 1 } },
  { category: { id: 1 }, visible: false },
  { category: { id: 2 } },
  { category: { id: 3 } },
  { category: { id: 4 } },
  { category: { id: 5 } },
]

const names = (list) => list.map((parcours) => parcours.name)

describe('buildParcours', () => {
  it('ne garde que les parcours visibles du public demandé qui ont au moins un cours', () => {
    expect(names(buildParcours(categories, courses, 'apprendre'))).toEqual(['démarches', 'messagerie'])
    expect(names(buildParcours(categories, courses, 'former'))).toEqual(['animer un atelier'])
  })

  it('compte uniquement les cours visibles et prépare le texte de la carte', () => {
    const [messagerie] = buildParcours(categories, courses, 'apprendre').filter((p) => p.name === 'messagerie')

    expect(messagerie).toMatchObject({
      title: 'Messagerie',
      summary: 'Envoyer un courriel',
      niveau: 'Débutant',
      courseCount: 2,
    })
  })

  it("range les parcours par rang, puis par ordre alphabétique ceux qui n'en ont pas", () => {
    const rangees = [
      { id: 1, name: 'démarches', audience: 'apprendre', ordre: 3 },
      { id: 2, name: 'premiers gestes', audience: 'apprendre', ordre: 1 },
      { id: 3, name: 'se protéger', audience: 'apprendre', ordre: 2 },
      { id: 4, name: 'bonus', audience: 'apprendre' },
      { id: 5, name: 'archives', audience: 'apprendre' },
    ]
    const cours = rangees.map((category) => ({ category: { id: category.id } }))

    expect(names(buildParcours(rangees, cours, 'apprendre'))).toEqual([
      'premiers gestes',
      'se protéger',
      'démarches',
      'archives',
      'bonus',
    ])
  })

  it("prépare la miniature d'un parcours, ou rien quand il n'en a pas", () => {
    const avecMiniature = [
      { id: 1, name: 'illustré', audience: 'apprendre', illustrationUrl: '/uploads/course-media/a.png', illustrationAlt: 'Un clavier' },
      { id: 2, name: 'nu', audience: 'apprendre', illustrationUrl: null, illustrationAlt: null },
    ]
    const cours = avecMiniature.map((category) => ({ category: { id: category.id } }))
    const [illustre, nu] = buildParcours(avecMiniature, cours, 'apprendre')

    expect(illustre.illustration).toEqual({ url: '/uploads/course-media/a.png', alt: 'Un clavier' })
    expect(nu.illustration).toBeNull()
  })

  it('applique le niveau choisi : niveaux inférieurs ou égaux, et parcours sans niveau', () => {
    expect(names(buildParcours(categories, courses, 'apprendre', debutant))).toEqual(['messagerie'])
    expect(names(buildParcours(categories, courses, 'former', debutant))).toEqual(['animer un atelier'])
  })
})

describe('toPlainText', () => {
  it('extrait le texte sans exécuter le HTML', () => {
    window.__piege = false
    expect(toPlainText('<img src="x" onerror="window.__piege = true">Bonjour <em>à tous</em>')).toBe('Bonjour à tous')
    expect(window.__piege).toBe(false)
    expect(toPlainText(null)).toBe('')
  })
})

describe('rubriques', () => {
  const automatiser = { id: 3, name: '3. Automatiser et gérer les données' }
  const decouvrir = { id: 1, name: '1. Découvrir et utiliser l’IA' }
  const former = { id: 6, name: '6. Former et accompagner' }
  const vide = { id: 9, name: '9. Sans cours' }

  const cats = [
    { id: 10, name: 'automatisation avec n8n', audience: 'apprendre', superMenu: automatiser },
    { id: 11, name: 'découvrir l’IA', audience: 'apprendre', superMenu: decouvrir },
    { id: 12, name: 'animer un atelier', audience: 'former', superMenu: former },
    { id: 13, name: 'stockage des données', audience: 'apprendre', superMenu: automatiser },
    { id: 14, name: 'en préparation', audience: 'apprendre', superMenu: vide },
    { id: 15, name: 'masqué', audience: 'apprendre', superMenu: automatiser, visible: false },
    { id: 16, name: 'sans rubrique', audience: 'apprendre' },
  ]
  const cours = [10, 11, 12, 13, 15, 16].map((id) => ({ category: { id } }))

  it('range les rubriques par numéro et ne garde que celles qui ont un parcours affiché', () => {
    const rubriques = buildRubriques(cats, cours)
    expect(rubriques.map((r) => r.id)).toEqual([1, 3, 6])
    expect(names(rubriques[1].parcours)).toEqual(['automatisation avec n8n', 'stockage des données'])
  })

  it('suit le rang des rubriques avant leur nom', () => {
    const ranked = cats.map((cat) => ({ ...cat, superMenu: cat.superMenu && { ...cat.superMenu, ordre: { 1: 3, 3: 1, 6: 2, 9: 4 }[cat.superMenu.id] } }))
    expect(buildRubriques(ranked, cours).map((r) => r.id)).toEqual([3, 6, 1])
  })

  it('regroupe les parcours du menu par rubrique, les parcours sans rubrique à la fin', () => {
    const menu = groupByRubrique(cats.filter((cat) => cat.visible !== false))
    expect(menu.map((group) => group.id)).toEqual([1, 3, 6, 9, null])
    expect(names(menu[1].categories)).toEqual(['automatisation avec n8n', 'stockage des données'])
    expect(menu.at(-1).name).toBeNull()
  })

  it('liste les parcours d\'une rubrique, tous publics confondus', () => {
    expect(names(buildParcoursOfRubrique(cats, cours, 6))).toEqual(['animer un atelier'])
    expect(buildParcoursOfRubrique(cats, cours, 9)).toEqual([])
  })
})

describe('chapitres', () => {
  it('lit le numéro d\'un module', () => {
    expect(chapterNumber('Chapitre 2 — Construire un workflow')).toBe(2)
    expect(chapterNumber('3. Intégrer une étape IA')).toBe(3)
    expect(chapterNumber('Comprendre l’automatisation')).toBeNull()
  })

  it('range les modules numérotés dans l\'ordre, puis les autres dans leur ordre d\'arrivée', () => {
    const labels = ['Annexe', 'Chapitre 10 — Projet', 'Chapitre 2 — Workflow', 'Bonus', 'Chapitre 1 — Comprendre']
    expect(sortChapters(labels.map((label) => ({ label }))).map((g) => g.label)).toEqual([
      'Chapitre 1 — Comprendre', 'Chapitre 2 — Workflow', 'Chapitre 10 — Projet', 'Annexe', 'Bonus',
    ])
  })
})
