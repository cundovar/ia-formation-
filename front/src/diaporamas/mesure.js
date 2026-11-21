// Mesures approchées du texte, en fonctions pures, pour ajuster les blocs et contrôler le débordement
// sans navigateur (tests, mise en page). Le contrôle réel, mesuré dans le navigateur, est controleRendu.js.

// Un caractère d'Arial mesure en moyenne une demi-taille de police ; une ligne, 1,2 fois la taille.
export const LARGEUR_CARACTERE = 0.5
export const HAUTEUR_LIGNE = 1.2

export const caracteresParLigne = (largeur, taille) => Math.max(1, Math.floor(largeur / ((taille * LARGEUR_CARACTERE) / 72)))

// Nombre de lignes d'un texte coupé aux espaces dans une largeur donnée
export const lignesTexte = (texte, largeur, taille) => {
  const max = caracteresParLigne(largeur, taille)
  const mots = String(texte ?? '').split(/\s+/).filter(Boolean)
  if (mots.length === 0) return 1
  let lignes = 1
  let courant = 0
  for (const mot of mots) {
    if (courant > 0 && courant + 1 + mot.length <= max) {
      courant += 1 + mot.length
      continue
    }
    if (courant > 0) lignes += 1
    // Un mot plus long que la ligne est coupé
    lignes += Math.floor((mot.length - 1) / max)
    courant = ((mot.length - 1) % max) + 1
  }
  return lignes
}

// Hauteur d'une liste de paragraphes, en pouces (les puces prennent la place de 3 caractères)
export const hauteurTexte = (paragraphes, largeur, taille, espace = 14) => {
  const ligne = (taille * HAUTEUR_LIGNE) / 72
  const lignes = paragraphes.reduce((total, p) => total + lignesTexte(`${p.puce ? '•  ' : ''}${p.texte}`, largeur, taille), 0)
  return lignes * ligne + Math.max(0, paragraphes.length - 1) * (espace / 72)
}

// Le bloc de texte tient-il dans sa zone ?
export const texteTient = (element, espace = 14) => hauteurTexte(element.paragraphes, element.w, element.taille, espace) <= element.h + 0.01
