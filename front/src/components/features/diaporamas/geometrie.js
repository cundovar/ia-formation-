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
    ...(element.forme === 'bulle' ? { background: fondBulle(element), border: 'none', borderRadius: '0' } : {}),
    ...(element.ombre ? { boxShadow: ombre(element.ombre, format) } : {}),
  }
}

// Ombre portée (thème Atelier visuel v3) : décalage et flou en pouces, suivant la taille de la diapositive
const ombre = (o, format) => `0 ${rayon(o.decalage, format)} ${rayon(o.flou, format)} rgba(${[0, 2, 4].map((i) => parseInt(o.couleur.slice(i, i + 2), 16)).join(', ')}, ${o.opacite})`

// Bulle de conversation (motif du thème v3) : rectangle arrondi et pointe en bas à gauche, dessinés en SVG
// aux proportions réelles de l'élément (comme la forme « wedgeRoundRectCallout » du .pptx)
export const traceBulle = (w, h, r) => {
  const corps = h * (140 / 170)
  const p = (v) => Math.round(v * 1000) / 1000
  return `M${p(r)} 0H${p(w - r)}A${p(r)} ${p(r)} 0 0 1 ${p(w)} ${p(r)}V${p(corps - r)}A${p(r)} ${p(r)} 0 0 1 ${p(w - r)} ${p(corps)}`
    + `H${p(w * 0.35)}L${p(w * 0.14)} ${p(h)}L${p(w * 0.19)} ${p(corps)}H${p(r)}A${p(r)} ${p(r)} 0 0 1 0 ${p(corps - r)}V${p(r)}A${p(r)} ${p(r)} 0 0 1 ${p(r)} 0Z`
}

const fondBulle = (element) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${element.w} ${element.h}" preserveAspectRatio="none"><path d="${traceBulle(element.w, element.h, element.rayon || 0.3)}" fill="#${element.fond}"/></svg>`
  return `center / 100% 100% no-repeat url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}
