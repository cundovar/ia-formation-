/**
 * Critères de réussite d'un laboratoire. Le workflow de l'apprenant est exécuté sur chaque
 * jeu de données, comme une série de tests. Rien n'est enregistré.
 */
import { BLOCS } from '../blocs/index.js'
import { executerTout } from './execution.js'
import { lireChemin } from './expressions.js'
import { accessiblesDepuis, normaliser } from './workflow.js'

const typesDe = (workflow, type) => workflow.noeuds.filter((noeud) => noeud.type === type)

// Chaque bloc `avant` est précédé (directement ou non) d'un bloc `bloc`
const blocAvant = (workflow, { bloc, avant }) => {
  const cibles = typesDe(workflow, avant)
  if (cibles.length === 0) return false
  const accessibles = typesDe(workflow, bloc).map((noeud) => accessiblesDepuis(workflow, noeud.id))
  return cibles.every((cible) => accessibles.some((ensemble) => ensemble.has(cible.id)))
}

const executionsVisees = (critere, executions) =>
  critere.jeu ? [executions[critere.jeu]].filter(Boolean) : Object.values(executions)

// Outils réellement exécutés (bloc Outil ou appel MCP réussi)
const outilsAppeles = (execution) => execution.evenements.filter((evenement) => evenement.type === 'outil').map((evenement) => evenement.outil)

// Position du premier message MCP d'une méthode dans une exécution (-1 s'il n'y en a pas)
const rangMcp = (execution, methode) => execution.evenements.findIndex((evenement) => evenement.type === 'mcp' && evenement.requete.method === methode)

const blocExecuteDans = (execution, type) =>
  execution.workflow.noeuds.some((noeud) => noeud.type === type && execution.etats[noeud.id] === 'ok')

export const EVALUATEURS = {
  contientBloc: (critere, workflow) => typesDe(workflow, critere.bloc).length >= (critere.min ?? 1),
  nombreMaxBlocs: (critere, workflow) => workflow.noeuds.length <= critere.max,
  lienEntre: (critere, workflow) => {
    const typeDe = Object.fromEntries(workflow.noeuds.map((noeud) => [noeud.id, noeud.type]))
    return workflow.liens.some((lien) => typeDe[lien.source] === critere.depuis
      && typeDe[lien.cible] === critere.vers
      && (!critere.sortie || lien.sortie === critere.sortie))
  },
  blocAvant: (critere, workflow) => blocAvant(workflow, critere),
  sansErreur: (critere, workflow, executions) => {
    const visees = executionsVisees(critere, executions)
    return visees.length > 0 && visees.every((execution) => execution.statut === 'termine')
  },
  sortieAttendue: (critere, workflow, executions) => {
    const execution = executions[critere.jeu]
    if (!execution || execution.statut !== 'termine' || execution.resultat === null) return false
    const { trouve, valeur } = lireChemin(execution.resultat, critere.chemin)
    return trouve && String(valeur) === String(critere.egal)
  },
  blocExecute: (critere, workflow, executions) => {
    const visees = executionsVisees(critere, executions)
    return visees.length > 0 && visees.every((execution) => blocExecuteDans(execution, critere.bloc))
  },
  blocNonExecute: (critere, workflow, executions) =>
    executionsVisees(critere, executions).every((execution) => !blocExecuteDans(execution, critere.bloc)),
  outilAppele: (critere, workflow, executions) => {
    const visees = executionsVisees(critere, executions)
    return visees.length > 0 && visees.every((execution) => outilsAppeles(execution).includes(critere.outil))
  },
  outilNonAppele: (critere, workflow, executions) =>
    executionsVisees(critere, executions).every((execution) => !outilsAppeles(execution).includes(critere.outil)),
  // Aucun agent du workflow ne se voit proposer cet outil (moindre privilège)
  outilNonPropose: (critere, workflow) =>
    typesDe(workflow, 'agent').every((noeud) => !(noeud.config?.outils ?? []).includes(critere.outil)),
  // Une donnée du jeu (téléphone…) n'est jamais retenue par un bloc Mémoire, même en partie
  donneeNonMemorisee: (critere, workflow, executions) => Object.values(executions).every((execution) => {
    const { trouve, valeur } = lireChemin(execution.jeu.donnees, critere.chemin)
    if (!trouve) return true
    const cherche = typeof valeur === 'string' ? valeur : JSON.stringify(valeur)
    return execution.evenements
      .filter((evenement) => evenement.type === 'memoire')
      .every((evenement) => !JSON.stringify(evenement.valeur).includes(cherche))
  }),
  // Dans chaque exécution, un message `methode` part avant le premier message `avant`
  mcpAvant: (critere, workflow, executions) => {
    const visees = executionsVisees(critere, executions)
    return visees.length > 0 && visees.every((execution) => {
      const rangAvant = rangMcp(execution, critere.avant)
      const rang = rangMcp(execution, critere.methode)
      return rangAvant >= 0 && rang >= 0 && rang < rangAvant
    })
  },
}

// Décision de la personne fictive pendant la vérification : celle du jeu de données, sinon un refus
export const deciderPourVerification = (attente, jeu) => jeu?.decisionHumaine ?? 'refuser'

/**
 * Évalue les critères d'un laboratoire pour un workflow.
 * Renvoie { reussi, details: [{ id, reussi, message }], executions, erreursValidation }.
 */
export async function evaluerCriteres(laboratoire, definition, { registre = BLOCS } = {}) {
  const workflow = normaliser(definition)
  const options = {
    registre,
    blocsDisponibles: laboratoire.blocsDisponibles ?? null,
    simulateurs: laboratoire.simulateurs ?? {},
    decider: deciderPourVerification,
  }
  const executions = {}
  for (const jeu of laboratoire.jeuxDeDonnees) {
    executions[jeu.id] = await executerTout(workflow, jeu, options)
  }
  const erreursValidation = Object.values(executions)[0]?.erreursValidation ?? []
  const details = laboratoire.criteres.map((critere) => ({
    id: critere.id,
    message: critere.message,
    reussi: erreursValidation.length === 0 && EVALUATEURS[critere.type](critere, workflow, executions),
  }))
  return { reussi: details.every((detail) => detail.reussi), details, executions, erreursValidation }
}
