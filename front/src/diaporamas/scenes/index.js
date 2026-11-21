// Registre des scènes animées (catalogue de référence : regles/scenes/catalogue.json).
// Une scène est une donnée déclarative choisie par l'agent ; le site en déduit formes, positions et
// mouvement. Les étapes sont reconstruites de façon déterministe : mêmes données, mêmes étapes.
import * as aiguillage from './aiguillage'
import * as chaineTraitement from './chaineTraitement'
import * as entonnoir from './entonnoir'
import * as escalier from './escalier'
import * as loupe from './loupe'
import * as sasValidation from './sasValidation'
import { texte } from './outils'

export const SCENES = Object.fromEntries([escalier, chaineTraitement, aiguillage, entonnoir, loupe, sasValidation]
  .map((scene) => [scene.type, scene]))

export const estSceneConnue = (type) => Object.hasOwn(SCENES, type)

// Variantes que la personne qui présente peut simuler pendant la projection
export const variantesDe = (scene) => {
  if (scene?.type === 'aiguillage') {
    return (scene.branches ?? []).slice(0, 2).map((b) => ({ cle: 'brancheSuivie', valeur: texte(b?.id), libelle: texte(b?.libelle) }))
  }
  if (scene?.type === 'sas_validation') {
    return [
      { cle: 'decision', valeur: 'accord', libelle: 'Simuler l\'accord' },
      { cle: 'decision', valeur: 'refus', libelle: 'Simuler le refus' },
    ]
  }
  return []
}

/**
 * @param {object} scene données de la scène (type, version, description, champs du modèle)
 * @param {{ zone: {x,y,w,h}, couleurs: object, variante?: object }} options
 * @returns {{ type, description, justification, etapes: {legende, elements}[], fixe: {elements, legendes: string[]} } | null}
 */
export const planifierScene = (scene, { zone, couleurs, variante = {} }) => {
  if (!scene || !estSceneConnue(scene.type)) return null
  const etapes = SCENES[scene.type].etats(scene, { zone, couleurs, variante })
  if (etapes.length === 0) return null
  return {
    type: scene.type,
    description: texte(scene.description),
    justification: texte(scene.justification),
    etapes,
    // Équivalent fixe : la dernière étape montre tout ; les légendes numérotées racontent le trajet
    fixe: {
      elements: etapes[etapes.length - 1].elements,
      legendes: etapes.map((e, i) => `${i + 1}. ${e.legende}`),
      court: `Vue d'ensemble : ${etapes.length} étapes`,
    },
  }
}

// Étape affichée : -1 (ou hors bornes) désigne l'équivalent fixe
export const estFixe = (scene, etape) => etape < 0 || etape >= scene.etapes.length

export const elementsEtape = (scene, etape) => (estFixe(scene, etape) ? scene.fixe.elements : scene.etapes[etape].elements)

// Légende projetée courte, sur une ligne (web, .pptx, PDF) ; la phrase complète va dans la liste des étapes,
// les notes et le texte pour les lecteurs d'écran
export const legendeCourte = (scene, etape) => (estFixe(scene, etape)
  ? scene.fixe.court
  : `${etape + 1}/${scene.etapes.length} · ${scene.etapes[etape].court}`)
