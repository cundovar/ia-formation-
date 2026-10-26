// Thème fixe des diaporamas (docs/PLAN_DIAPORAMAS.md § 8) : l'agent ne choisit jamais le design.
// Mesures en pouces (format 16/9 de PowerPoint), tailles de police en points.

export const FORMAT = { largeur: 13.333, hauteur: 7.5 }

export const MARGE = 0.7

// Arial : présente sous Windows et macOS, remplacée à largeur égale ailleurs (décision du 26 octobre 2026)
export const POLICE = 'Arial'

// DIA-05 : le texte projeté fait 24 points au moins. Seuls les repères (pied de page, numéro,
// source d'une capture) sont plus petits.
export const TAILLES = {
  titreCouverture: 44,
  sousTitreCouverture: 28,
  titre: 36,
  intertitre: 28,
  corps: 28,
  corpsDense: 24,
  repere: 14,
}

// Espace après un paragraphe d'une liste, en points
export const ESPACE_PARAGRAPHE = 14

export const TAILLE_MINIMALE_PROJETEE = 24

// Fonds blancs ou pastel, texte foncé (règle des fonds d'interface d'AGENTS.md)
export const COULEURS_PUBLIC = {
  apprendre: { pastel: 'DBEAFE', accent: 'BFDBFE', trait: '93C5FD', fonce: '1E3A8A' },
  former: { pastel: 'D1FAE5', accent: 'A7F3D0', trait: '6EE7B7', fonce: '064E3B' },
}

export const COULEURS = {
  fond: 'FFFFFF',
  texte: '1F2937',
  texteDoux: '4B5563',
  carte: 'F8FAFC',
  bordure: 'CBD5E1',
  aFaire: { fond: 'ECFDF5', bordure: '6EE7B7', titre: '065F46' },
  aEviter: { fond: 'FFF1F2', bordure: 'FDA4AF', titre: '9F1239' },
}

export const LICENCE = 'Licence CC BY-SA 4.0 : vous pouvez réutiliser et modifier ce diaporama, '
  + 'en citant la source et en partageant vos modifications sous la même licence.'

export const couleursPublic = (audience) => COULEURS_PUBLIC[audience] ?? COULEURS_PUBLIC.apprendre

// Zones communes à toutes les diapositives de contenu
export const ZONES = {
  bandeau: { x: 0, y: 0, w: FORMAT.largeur, h: 0.14 },
  titre: { x: MARGE, y: 0.45, w: FORMAT.largeur - 2 * MARGE, h: 1.0 },
  trait: { x: MARGE, y: 1.5, w: 1.3, h: 0.07 },
  corps: { x: MARGE, y: 1.85, w: FORMAT.largeur - 2 * MARGE, h: 4.75 },
  filet: { x: MARGE, y: 6.82, w: FORMAT.largeur - 2 * MARGE, h: 0.01 },
  pied: { x: MARGE, y: 6.88, w: 10.5, h: 0.4 },
  numero: { x: FORMAT.largeur - MARGE - 1.0, y: 6.88, w: 1.0, h: 0.4 },
}
