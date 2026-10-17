/**
 * Contrôle de la définition d'un laboratoire (fichier JSON du catalogue).
 * Renvoie la liste des problèmes, vide si la définition est correcte.
 */
import { BLOCS } from '../blocs/index.js'
import { EVALUATEURS } from '../moteur/criteres.js'
import { normaliser, valider } from '../moteur/workflow.js'
import { NIVEAUX, PUBLICS } from './niveaux.js'

export const VERSION_SCHEMA = 1

const CHAMPS_TEXTE = ['slug', 'titre', 'niveau', 'public', 'duree', 'objectif', 'scenario', 'simulation']
const CHAMPS_LISTE = ['instructions', 'blocsDisponibles', 'jeuxDeDonnees', 'criteres', 'indices', 'aRetenir']

export function validerLaboratoire(lab) {
  const problemes = []
  const ajouter = (message) => problemes.push(`${lab?.slug ?? 'laboratoire'} : ${message}`)

  if (lab?.schema !== VERSION_SCHEMA) ajouter(`le champ « schema » doit valoir ${VERSION_SCHEMA}.`)
  CHAMPS_TEXTE.forEach((champ) => {
    if (typeof lab?.[champ] !== 'string' || lab[champ].trim() === '') ajouter(`le champ « ${champ} » est obligatoire.`)
  })
  CHAMPS_LISTE.forEach((champ) => {
    if (!Array.isArray(lab?.[champ]) || lab[champ].length === 0) ajouter(`la liste « ${champ} » est obligatoire.`)
  })
  if (problemes.length > 0) return problemes

  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(lab.slug)) ajouter('le slug ne contient que des minuscules, des chiffres et des tirets.')
  if (!(lab.niveau in NIVEAUX)) ajouter(`niveau inconnu « ${lab.niveau} ».`)
  if (!PUBLICS.includes(lab.public)) ajouter(`public inconnu « ${lab.public} ».`)
  lab.blocsDisponibles.filter((type) => !(type in BLOCS)).forEach((type) => ajouter(`bloc inconnu « ${type} ».`))

  const jeux = new Set()
  lab.jeuxDeDonnees.forEach((jeu) => {
    if (!jeu.id || !jeu.libelle || typeof jeu.donnees !== 'object') ajouter('chaque jeu de données a un id, un libellé et des données.')
    if (jeux.has(jeu.id)) ajouter(`jeu de données en double « ${jeu.id} ».`)
    jeux.add(jeu.id)
  })

  const criteres = new Set()
  lab.criteres.forEach((critere) => {
    if (!(critere.type in EVALUATEURS)) ajouter(`type de critère inconnu « ${critere.type} ».`)
    if (!critere.id || !critere.message) ajouter('chaque critère a un id et un message.')
    if (criteres.has(critere.id)) ajouter(`critère en double « ${critere.id} ».`)
    criteres.add(critere.id)
    if (critere.jeu && !jeux.has(critere.jeu)) ajouter(`le critère « ${critere.id} » cite un jeu inconnu « ${critere.jeu} ».`)
  })

  const initial = normaliser(lab.workflowInitial)
  const ids = new Set(initial.noeuds.map((noeud) => noeud.id))
  ;(lab.verrous?.noeuds ?? []).filter((id) => !ids.has(id)).forEach((id) => ajouter(`le verrou cite un bloc inconnu « ${id} ».`))
  initial.noeuds.filter((noeud) => !(noeud.type in BLOCS)).forEach((noeud) => ajouter(`le workflow initial contient un bloc inconnu « ${noeud.type} ».`))

  if (!lab.correction?.workflow || !lab.correction?.explication) {
    ajouter('la correction contient un workflow et une explication.')
  } else {
    valider(normaliser(lab.correction.workflow), { blocsDisponibles: lab.blocsDisponibles })
      .forEach((erreur) => ajouter(`correction invalide : ${erreur.message}`))
  }

  return problemes
}
