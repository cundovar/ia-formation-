import { FORMAT } from '@/diaporamas/theme'

// Clé d'injection du format de la diapositive affichée (16:9, ou lecture étroite du thème Atelier visuel)
export const CLE_FORMAT = Symbol('format-diapositive')

const pourcentage = (valeur, total) => `${(valeur / total) * 100}%`

export const zone = (element, format = FORMAT) => ({
  left: pourcentage(element.x, format.largeur),
  top: pourcentage(element.y, format.hauteur),
  width: pourcentage(element.w, format.largeur),
  height: pourcentage(element.h, format.hauteur),
})

// Une diapositive de 13,333 pouces mesure 960 points : les tailles suivent la largeur affichée
export const taillePolice = (points, format = FORMAT) => `${(points * 100) / (format.largeur * 72)}cqw`

// Rayon d'angle en unité de conteneur, pour qu'il suive la taille de la diapositive
export const rayon = (pouces, format = FORMAT) => `${(pouces * 100) / format.largeur}cqw`

export const styleForme = (element, format = FORMAT) => {
  let borderRadius = '0'
  if (element.forme === 'ellipse') borderRadius = '50%'
  else if (element.forme === 'roundRect') borderRadius = element.rayon > 0 ? rayon(element.rayon, format) : '999px'
  const trait = element.pointille ? 'dashed' : 'solid'
  const epaisseur = element.epaisseur ? `${Math.max(1, element.epaisseur * 0.75)}px` : '1px'
  return {
    ...zone(element, format),
    background: `#${element.fond}`,
    border: element.bordure ? `${epaisseur} ${trait} #${element.bordure}` : 'none',
    borderRadius,
    ...(element.rotation ? { transform: `rotate(${element.rotation}deg)` } : {}),
    ...(element.forme === 'trapeze' ? { clipPath: 'polygon(0 0, 100% 0, 78% 100%, 22% 100%)' } : {}),
  }
}
