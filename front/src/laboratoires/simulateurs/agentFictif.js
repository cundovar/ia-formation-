/**
 * Agent simulé : il « décide » avec des règles écrites à l'avance dans le laboratoire (LAB-01).
 * Aucune IA n'est appelée. Les règles lisent ce que l'agent voit : { consigne, contexte }.
 *
 * simulateurs.agent : {
 *   regles: [{ si: condition, alors: { reponse: 'gabarit' } | { outil: 'nom', arguments: { cle: 'gabarit' } }, injection? }],
 *   parDefaut: { reponse: 'gabarit' }
 * }
 * Une règle `injection` imite un agent qui suit une consigne cachée dans les données (LAB-05).
 */
import { evaluerCondition, remplirGabarit } from '../moteur/expressions.js'

// Une règle qui lit une donnée absente ne s'applique simplement pas
const correspond = (condition, vu) => {
  if (!condition) return true
  try {
    return evaluerCondition(condition, vu)
  } catch {
    return false
  }
}

const remplir = (texte, vu) => {
  try {
    return { texte: remplirGabarit(texte, vu) }
  } catch {
    return { erreur: true }
  }
}

const remplirArguments = (modele = {}, vu) => {
  const resultat = {}
  for (const [cle, valeur] of Object.entries(modele)) {
    const rempli = remplir(valeur, vu)
    if (rempli.erreur) return null
    resultat[cle] = rempli.texte
  }
  return resultat
}

/**
 * Décision de l'agent. Renvoie :
 * { regle: numéro (1…) ou null, reponse? , appel?: { outil, arguments }, injection, ecartees: [{ regle, outil }] }
 * `ecartees` liste les règles qui voulaient un outil non proposé à l'agent.
 */
export function deciderAgent(agent = {}, vu, outilsProposes = []) {
  const ecartees = []
  const regles = agent.regles ?? []
  for (let index = 0; index < regles.length; index += 1) {
    const regle = regles[index]
    if (!correspond(regle.si, vu)) continue
    const alors = regle.alors ?? {}
    if (alors.outil) {
      if (!outilsProposes.includes(alors.outil)) {
        ecartees.push({ regle: index + 1, outil: alors.outil })
        continue
      }
      const argumentsAppel = remplirArguments(alors.arguments, vu)
      if (!argumentsAppel) continue
      return { regle: index + 1, appel: { outil: alors.outil, arguments: argumentsAppel }, injection: Boolean(regle.injection), ecartees }
    }
    const reponse = remplir(alors.reponse, vu)
    if (reponse.erreur) continue
    return { regle: index + 1, reponse: reponse.texte, injection: Boolean(regle.injection), ecartees }
  }
  const parDefaut = remplir(agent.parDefaut?.reponse ?? 'Je ne sais pas répondre à cette demande.', vu)
  return { regle: null, reponse: parDefaut.erreur ? 'Je ne sais pas répondre à cette demande.' : parDefaut.texte, injection: false, ecartees }
}
