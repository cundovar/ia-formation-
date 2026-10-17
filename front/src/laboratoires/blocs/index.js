/**
 * Registre des blocs : un type de bloc = un fichier de ce dossier, déclaré ici.
 * Le moteur ne connaît les blocs que par ce registre.
 */
import agent from './agent.js'
import api from './api.js'
import condition from './condition.js'
import declencheur from './declencheur.js'
import donnees from './donnees.js'
import mcp from './mcp.js'
import memoire from './memoire.js'
import outil from './outil.js'
import rag from './rag.js'
import resultat from './resultat.js'
import transformation from './transformation.js'
import validation from './validation.js'

export const BLOCS = Object.fromEntries(
  [declencheur, donnees, condition, transformation, api, agent, outil, mcp, rag, memoire, validation, resultat].map((bloc) => [bloc.type, bloc]),
)

export const trouverBloc = (type, registre = BLOCS) =>
  Object.prototype.hasOwnProperty.call(registre, type) ? registre[type] : null
