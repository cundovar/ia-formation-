// Registre des thèmes de diaporama. L'agent choisit seulement un identifiant (DIA-05) ;
// couleurs, positions et mouvements restent fixés par le site. Un identifiant inconnu donne le thème standard.
import * as standard from '../theme'
import * as atelierVisuel from './atelierVisuel'
import * as atelierVisuelV3 from './atelierVisuelV3'

export const THEMES = {
  standard: { id: 'standard', libelle: 'Standard', module: standard },
  [atelierVisuel.ID]: { id: atelierVisuel.ID, libelle: atelierVisuel.LIBELLE, module: atelierVisuel },
  [atelierVisuelV3.ID]: { id: atelierVisuelV3.ID, libelle: atelierVisuelV3.LIBELLE, module: atelierVisuelV3 },
}

export const THEME_PAR_DEFAUT = 'standard'

export const idTheme = (valeur) => (Object.hasOwn(THEMES, valeur) ? valeur : THEME_PAR_DEFAUT)

// Couleurs des scènes pour le thème standard : celles du public, sur fond blanc
export const couleursScene = (theme, audience) => {
  if (idTheme(theme) === atelierVisuel.ID || idTheme(theme) === atelierVisuelV3.ID) return atelierVisuel.COULEURS_SCENE
  const publicCouleurs = standard.couleursPublic(audience)
  return {
    fond: standard.COULEURS.carte,
    bloc: publicCouleurs.pastel,
    blocBordure: standard.COULEURS.bordure,
    actif: standard.COULEURS.aFaire.fond,
    actifBordure: standard.COULEURS.aFaire.titre,
    fiche: 'FFFFFF',
    ficheBordure: '64748B',
    trait: '475569',
    texte: standard.COULEURS.texte,
    texteDoux: standard.COULEURS.texteDoux,
    attenue: 'F1F5F9',
  }
}
