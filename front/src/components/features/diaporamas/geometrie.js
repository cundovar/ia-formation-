import { FORMAT } from '@/diaporamas/theme'

// Une diapositive mesure 13,333 pouces, soit 960 points : les tailles suivent la largeur affichée
const POINTS_EN_LARGEUR = FORMAT.largeur * 72

const pourcentage = (valeur, total) => `${(valeur / total) * 100}%`

export const zone = (element) => ({
  left: pourcentage(element.x, FORMAT.largeur),
  top: pourcentage(element.y, FORMAT.hauteur),
  width: pourcentage(element.w, FORMAT.largeur),
  height: pourcentage(element.h, FORMAT.hauteur),
})

export const taillePolice = (points) => `${(points * 100) / POINTS_EN_LARGEUR}cqw`
