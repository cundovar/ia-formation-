/**
 * Les deux entrées publiques du site.
 * `key` correspond au champ `audience` d'une catégorie (parcours) dans le back-office.
 */
export const AUDIENCES = [
  {
    key: 'apprendre',
    path: '/apprendre',
    title: "J'apprends à utiliser l'IA",
    lead: 'Pour toutes les personnes qui veulent se servir d\'une intelligence artificielle (ChatGPT, Claude, Le Chat…) avec confiance et esprit critique.',
    examples: ['Écrire une bonne consigne', 'Vérifier une réponse', 'Protéger ses données'],
    icon: 'fas fa-robot',
    iconBgClass: 'bg-blue-100',
    cardBgClass: 'surface-card--blue',
    // Menu de navigation : fond de l'entrée, survol, et panneau des parcours dépliés
    menuBgClass: 'bg-blue-200',
    menuHoverClass: 'hover:bg-blue-300',
    menuPanelClass: 'audience-panel--blue',
    otherAudienceText: 'Vous formez d\'autres personnes à l\'IA ?',
  },
  {
    key: 'former',
    path: '/former',
    title: "Je forme à l'IA",
    lead: 'Pour les formateurs, médiateurs, enseignants et référents qui font découvrir l\'IA à d\'autres personnes.',
    examples: ['Construire un atelier IA', 'Expliquer les limites de l\'IA', 'Faire pratiquer sans faire à la place'],
    icon: 'fas fa-chalkboard-user',
    iconBgClass: 'bg-emerald-100',
    cardBgClass: 'surface-card--green',
    menuBgClass: 'bg-emerald-200',
    menuHoverClass: 'hover:bg-emerald-300',
    menuPanelClass: 'audience-panel--green',
    otherAudienceText: 'Vous voulez apprendre pour vous-même ?',
  },
]

// Parcours d'une entrée, d'après le champ `audience` de chaque catégorie
export const catsParAudience = (cats = []) => Object.fromEntries(
  AUDIENCES.map((audience) => [audience.key, cats.filter((cat) => cat.audience === audience.key)]),
)

export const getAudience = (key) => AUDIENCES.find((audience) => audience.key === key) ?? null

export const getOtherAudience = (key) => AUDIENCES.find((audience) => audience.key !== key) ?? null
