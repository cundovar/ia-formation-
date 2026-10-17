/**
 * Catalogue des laboratoires : chaque fichier JSON de ce dossier décrit un laboratoire.
 * Les définitions sont incluses dans le code : aucun appel réseau, disponibles hors ligne.
 */
import { NIVEAUX } from './niveaux.js'

const fichiers = import.meta.glob('./*.json', { eager: true, import: 'default' })

const ORDRE_NIVEAUX = Object.keys(NIVEAUX)

const LABORATOIRES = Object.values(fichiers).sort((a, b) =>
  ORDRE_NIVEAUX.indexOf(a.niveau) - ORDRE_NIVEAUX.indexOf(b.niveau)
  || (a.ordre ?? 0) - (b.ordre ?? 0)
  || a.titre.localeCompare(b.titre, 'fr'))

export const listerLaboratoires = () => LABORATOIRES

export const trouverLaboratoire = (slug) => LABORATOIRES.find((lab) => lab.slug === slug) ?? null

// Laboratoires à proposer en fin de cours (slug de page sans la barre initiale)
export const laboratoiresDuCours = (slugCours) => {
  const slug = String(slugCours ?? '').replace(/^\//, '')
  return slug ? LABORATOIRES.filter((lab) => (lab.coursSlugs ?? []).includes(slug)) : []
}

export { NIVEAUX }
