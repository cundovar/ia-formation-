/**
 * Contrôle de la définition d'un laboratoire (fichier JSON du catalogue).
 * Renvoie la liste des problèmes, vide si la définition est correcte.
 */
import { BLOCS } from '../blocs/index.js'
import { EVALUATEURS } from '../moteur/criteres.js'
import { normaliser, valider } from '../moteur/workflow.js'
import { NIVEAUX, PUBLICS } from './niveaux.js'
import { analyserUrl, METHODES } from '../simulateurs/apiFictive.js'
import { PERMISSIONS, TYPES_PARAMETRE } from '../simulateurs/outilsFictifs.js'
import { DECISIONS_HUMAINES } from '../moteur/execution.js'

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
    if (jeu.decisionHumaine !== undefined && !DECISIONS_HUMAINES.includes(jeu.decisionHumaine)) ajouter(`jeu « ${jeu.id} » : decisionHumaine vaut « approuver » ou « refuser ».`)
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

  ;(lab.simulateurs?.api ?? []).forEach((service) => {
    if (!METHODES.includes(service.methode)) ajouter(`API fictive : méthode inconnue « ${service.methode} ».`)
    const analyse = analyserUrl(service.url)
    if (analyse.erreur) ajouter(`API fictive : ${analyse.erreur}`)
    else if (analyse.adresse !== service.url) ajouter(`API fictive : l'adresse « ${service.url} » ne doit contenir ni paramètres ni fragment.`)
    if (!Array.isArray(service.reponses) || service.reponses.length === 0) ajouter(`API fictive ${service.url} : prévoyez au moins une réponse.`)
    ;(service.reponses ?? []).forEach((reponse) => {
      if (!Number.isInteger(reponse.statut) || reponse.statut < 100 || reponse.statut > 599) ajouter(`API fictive ${service.url} : code de statut invalide.`)
    })
    if ((service.reponses ?? []).length && service.reponses.at(-1).si) ajouter(`API fictive ${service.url} : la dernière réponse doit être sans condition (réponse par défaut).`)
  })

  const outils = new Set()
  ;(lab.simulateurs?.outils ?? []).forEach((outil) => {
    if (!/^[a-z][a-z0-9_]*$/.test(outil.nom ?? '')) ajouter(`outil fictif : nom invalide « ${outil.nom} » (minuscules, chiffres et _).`)
    if (outils.has(outil.nom)) ajouter(`outil fictif en double « ${outil.nom} ».`)
    outils.add(outil.nom)
    if (!outil.description) ajouter(`outil fictif ${outil.nom} : la description est obligatoire.`)
    if (!(outil.permission in PERMISSIONS)) ajouter(`outil fictif ${outil.nom} : permission « lecture » ou « ecriture ».`)
    Object.entries(outil.parametres ?? {}).forEach(([nom, parametre]) => {
      if (!(parametre.type in TYPES_PARAMETRE)) ajouter(`outil fictif ${outil.nom} : type inconnu pour « ${nom} ».`)
    })
    if (!Array.isArray(outil.reponses) || outil.reponses.length === 0) ajouter(`outil fictif ${outil.nom} : prévoyez au moins une réponse.`)
    else if (outil.reponses.at(-1).si) ajouter(`outil fictif ${outil.nom} : la dernière réponse doit être sans condition (réponse par défaut).`)
  })

  const agent = lab.simulateurs?.agent
  if (agent) {
    if (!Array.isArray(agent.regles)) ajouter('agent simulé : la liste « regles » est obligatoire.')
    ;(agent.regles ?? []).forEach((regle, index) => {
      const alors = regle.alors ?? {}
      if (!alors.outil && typeof alors.reponse !== 'string') ajouter(`agent simulé, règle ${index + 1} : « alors » contient une réponse ou un outil.`)
      if (alors.outil && !outils.has(alors.outil)) ajouter(`agent simulé, règle ${index + 1} : outil inconnu « ${alors.outil} ».`)
    })
    if (typeof agent.parDefaut?.reponse !== 'string') ajouter('agent simulé : prévoyez une réponse par défaut.')
  }
  if (lab.blocsDisponibles.includes('agent') && !agent) ajouter('le bloc agent est disponible, mais simulateurs.agent manque.')

  const passages = new Set()
  ;(lab.simulateurs?.documents ?? []).forEach((document) => {
    if (!document.id || !document.titre || !document.source) ajouter('document fictif : id, titre et source sont obligatoires.')
    if (!Array.isArray(document.passages) || document.passages.length === 0) ajouter(`document fictif ${document.id} : prévoyez au moins un passage.`)
    ;(document.passages ?? []).forEach((passage) => {
      if (!passage.id || typeof passage.texte !== 'string' || !passage.texte.trim()) ajouter(`document fictif ${document.id} : chaque passage a un id et un texte.`)
      if (passages.has(passage.id)) ajouter(`passage en double « ${passage.id} ».`)
      passages.add(passage.id)
    })
  })
  if (lab.blocsDisponibles.includes('rag') && passages.size === 0) ajouter('le bloc rag est disponible, mais simulateurs.documents est vide.')

  const mcp = lab.simulateurs?.mcp
  if (mcp) {
    if (!mcp.nom) ajouter('serveur MCP fictif : le nom est obligatoire.')
    ;(mcp.outils ?? []).filter((nom) => !outils.has(nom)).forEach((nom) => ajouter(`serveur MCP fictif : outil inconnu « ${nom} ».`))
  }
  if (lab.blocsDisponibles.includes('mcp') && !mcp) ajouter('le bloc mcp est disponible, mais simulateurs.mcp manque.')

  lab.criteres.filter((critere) => /^outil/.test(critere.type) && !outils.has(critere.outil))
    .forEach((critere) => ajouter(`le critère « ${critere.id} » cite un outil inconnu « ${critere.outil} ».`))

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
