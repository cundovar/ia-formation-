// Thème « Atelier visuel » (docs/PLAN_DIAPORAMAS.md § 13) : rendu chaleureux et sobre pour un public
// adulte en formation professionnelle. Fond crème, encadrés pastel, texte anthracite, schéma central.
// Toutes les couleurs, tailles et marges du thème sont ici : les mises en page ne contiennent aucune valeur.
// Mesures en pouces, tailles de police en points (DIA-05 : 24 points au moins, sauf les repères).

export const ID = 'atelier_visuel'

export const LIBELLE = 'Atelier visuel'

export const COULEURS = {
  fond: 'FFFDF8', // crème
  texte: '353B49', // anthracite
  texteDoux: '5A6170',
  schema: 'EEF2FB', // zone de schéma, bleu pastel
  picto: 'DEE7F5', // blocs et pictogrammes, bleu doux
  synthese: 'F3EEE2', // encadrés de synthèse, beige clair
  actif: 'E1EEDF', // étape active, vert sauge
  actifBordure: '4F7A4B',
  bordure: 'C9D1E0',
  trait: '5B6B8C', // liaisons des schémas (trait, pas un fond)
  fiche: 'FFFFFF',
  ficheBordure: '7A8499',
  attenue: 'F4F5F8',
}

export const POLICE = 'Arial'

export const TAILLES = {
  surtitre: 14,
  titreOuverture: 48,
  sousTitreOuverture: 28,
  titre: 40,
  intertitre: 28,
  corps: 26,
  corpsDense: 24,
  scene: 24,
  repere: 14,
}

export const ESPACE_PARAGRAPHE = 12

export const RAYONS = { bloc: 0.18, encadre: 0.14, fiche: 0.12 }

// Deux formats : la projection 16:9 (et le .pptx), et une lecture étroite (mobile) où tout est empilé.
export const FORMATS = {
  large: { largeur: 13.333, hauteur: 7.5, marge: 0.75 },
  // Lecture étroite : jamais projetée, elle défile ; la hauteur laisse la place au schéma empilé
  etroit: { largeur: 7.5, hauteur: 16, marge: 0.5 },
}

// Zones de chaque format : surtitre, titre, schéma, encadrés, contenu sans schéma, pied.
// `legende` : hauteur réservée à la légende de l'étape, en bas de la zone de schéma ;
// `retrait` : marge intérieure de la zone de schéma (horizontale, verticale).
export const ZONES = {
  large: {
    surtitre: { x: 0.75, y: 0.4, w: 10.6, h: 0.34 },
    titre: { x: 0.75, y: 0.76, w: 11.833, h: 1.0 },
    schema: { x: 0.75, y: 1.9, w: 11.833, h: 3.28 },
    encadres: { x: 0.75, y: 5.32, w: 11.833, h: 1.36 },
    contenu: { x: 0.75, y: 1.9, w: 11.833, h: 4.75 },
    pied: { x: 0.75, y: 6.88, w: 10.0, h: 0.34 },
    numero: { x: 11.583, y: 6.88, w: 1.0, h: 0.34 },
    legende: 0.5,
    retrait: { x: 0.25, y: 0.15 },
  },
  etroit: {
    surtitre: { x: 0.5, y: 0.35, w: 6.5, h: 0.5 },
    titre: { x: 0.5, y: 0.9, w: 6.5, h: 2.0 },
    schema: { x: 0.5, y: 3.05, w: 6.5, h: 8.6 },
    encadres: { x: 0.5, y: 11.8, w: 6.5, h: 3.6 },
    contenu: { x: 0.5, y: 3.05, w: 6.5, h: 12.35 },
    pied: { x: 0.5, y: 15.55, w: 5.0, h: 0.34 },
    numero: { x: 6.0, y: 15.55, w: 1.0, h: 0.34 },
    legende: 1.05,
    retrait: { x: 0.15, y: 0.15 },
  },
}

// Couleurs données aux scènes (scenes/outils.js)
export const COULEURS_SCENE = {
  fond: COULEURS.schema,
  bloc: COULEURS.picto,
  blocBordure: COULEURS.bordure,
  actif: COULEURS.actif,
  actifBordure: COULEURS.actifBordure,
  fiche: COULEURS.fiche,
  ficheBordure: COULEURS.ficheBordure,
  trait: COULEURS.trait,
  texte: COULEURS.texte,
  texteDoux: COULEURS.texteDoux,
  attenue: COULEURS.attenue,
}
