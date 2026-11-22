// Dessins des icônes des diaporamas (catalogue fermé : regles/diaporamas/icones.json). Tracés au trait, sur
// une grille de 24 unités, dessinés pour le site. L'agent ne fournit qu'un identifiant, jamais un dessin.
// Fonctions pures, sans Vue ni réseau : le même tracé sert au web, au PDF et au .pptx.
import catalogue from '@regles/diaporamas/icones.json'

export const TRACES = {
  cible: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  document: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  personnes: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7"/><path d="M18.5 14a6 6 0 0 1 3 6"/>',
  bouclier: '<path d="M12 3 4.5 6v6c0 4.5 3.2 7.8 7.5 9 4.3-1.2 7.5-4.5 7.5-9V6Z"/><path d="m9 12 2 2 4-4"/>',
  crayon: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16Z"/><path d="m13.5 6.5 4 4"/>',
  etincelle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z"/><path d="M19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7Z"/>',
  oeil: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  alerte: '<path d="M12 3 2 20h20Z"/><path d="M12 10v4M12 17h.01"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  envoi: '<path d="M22 2 11 13"/><path d="m22 2-7 20-4-9-9-4Z"/>',
  bulle: '<path d="M21 12a8 8 0 0 1-11.5 7.2L4 20.5l1.3-4.6A8 8 0 1 1 21 12Z"/>',
  cadenas: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  horloge: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  liste: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
  fleche: '<path d="M5 12h14M13 6l6 6-6 6"/>',
}

// Icônes que l'agent peut choisir (le site garde quelques tracés pour son propre décor, comme la flèche)
export const ICONES = catalogue.icones

export const estIconeConnue = (nom) => typeof nom === 'string' && Object.hasOwn(ICONES, nom)

// SVG autonome d'une icône (web, PDF, image du .pptx). Couleur hexadécimale sans #.
export const svgIcone = (nom, couleur = '2F6B4F', epaisseur = 2) => {
  const trace = TRACES[nom]
  if (!trace) return null
  return `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="#${couleur}" stroke-width="${epaisseur}" stroke-linecap="round" stroke-linejoin="round">${trace}</svg>`
}

// Les tracés sont en ASCII : btoa suffit (navigateur et Node 16 ou plus)
const base64 = (texte) => btoa(texte)

export const donneesIcone = (nom, couleur, epaisseur) => {
  const svg = svgIcone(nom, couleur, epaisseur)
  return svg ? `data:image/svg+xml;base64,${base64(svg)}` : null
}
