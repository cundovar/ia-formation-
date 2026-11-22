// Thème « Atelier visuel v3 » (docs/PLAN_DIAPORAMAS.md, section Atelier visuel v3), validé le 22 novembre 2026
// sur deux diapositives test dessinées dans Penpot (fichier « design powerpoint », page « Atelier visuel v3 »,
// jeu de jetons `atelier_visuel_v3`). Les valeurs sont recopiées ici : le site affiche et exporte sans Penpot.
// Fonds clairs uniquement (AGENTS.md) : le vert profond sert au texte, aux traits et aux icônes, jamais en fond.
// Mesures en pouces (Penpot : pixels sur une diapositive de 1280 px, soit 96 px par pouce), tailles en points.

export const ID = 'atelier_visuel_v3'

export const LIBELLE = 'Atelier visuel v3'

export const POLICE = 'Arial'

const px = (valeur) => Math.round((valeur / 96) * 1000) / 1000

export const COULEURS = {
  fond: 'FBF7EE', // crème
  carte: 'FFFFFF',
  texte: '163C2E', // vert profond, texte et titres
  texteDoux: '55645C',
  accent: '2F6B4F', // traits, icônes, numéros (jamais en fond)
  chaud: 'F6D9C4', // pêche : bulle, information à vérifier
  sauge: 'E3EBE0', // carte mise en avant, partie active
  filet: 'E2E5DD',
  clair: 'EEF3EC', // pastilles, zones de message
}

// Ombre des cartes : décalage vertical 8 px, flou 24 px, vert profond à 8 %
export const OMBRE = { decalage: px(8), flou: px(24), couleur: COULEURS.texte, opacite: 0.08 }

export const TAILLES = {
  titre: 40,
  motCle: 26,
  corps: 24,
  numero: 18,
  repere: 14,
}

export const RAYONS = {
  carte: px(24),
  message: px(16),
  encadre: px(12),
  pilule: 0, // 0 : pastille entièrement arrondie (geometrie.js, construirePptx.js)
}

export const FORMAT = { largeur: 13.333, hauteur: 7.5, marge: px(72) }

// Zones communes des diapositives de contenu
export const ZONES = {
  progression: { x: px(72), y: px(40), h: px(36) },
  site: { x: px(760), y: px(40), w: px(370), h: px(36) },
  numero: { x: px(1136), y: px(40), w: px(72), h: px(36) },
  titre: { x: px(72), y: px(88), w: px(1136), h: px(64) },
  contenu: { x: px(72), y: px(172), w: px(1136), h: px(448) },
  synthese: { x: px(72), y: px(630), w: px(1136), h: px(48) },
}

export { px }
