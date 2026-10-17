/**
 * Traduction workflow ⇄ éléments de la vue graphique (Vue Flow).
 * Le workflow du store reste la seule source de vérité : la vue graphique en est une projection.
 */
import { BLOCS, trouverBloc } from '../blocs/index.js'
import { accessiblesDepuis, nomDuNoeud } from '../moteur/workflow.js'

export const ESPACEMENT = { x: 340, y: 180 }

const TEXTES_ETAT = { attente: 'en attente', prochain: 'prochaine étape', ok: 'exécuté', ignore: 'ignoré, chemin non pris', erreur: 'erreur' }

// Position par défaut d'un bloc sans position : en ligne, dans l'ordre du workflow
const positionDe = (noeud, index) => noeud.position ?? { x: index * ESPACEMENT.x, y: 0 }

/**
 * Nœuds Vue Flow. `data` porte tout ce qu'affiche le composant de bloc.
 */
export function versNoeuds(workflow, { etats = {}, prochain = null, verrous = [], selection = null, registre = BLOCS } = {}) {
  return workflow.noeuds.map((noeud, index) => {
    const bloc = trouverBloc(noeud.type, registre)
    const verrouille = verrous.includes(noeud.id)
    const etat = prochain === noeud.id ? 'prochain' : (etats[noeud.id] ?? 'attente')
    const nom = nomDuNoeud(noeud, registre)
    return {
      id: noeud.id,
      type: 'bloc',
      position: { ...positionDe(noeud, index) },
      selected: noeud.id === selection,
      deletable: !verrouille,
      connectable: true,
      // Nom annoncé par les lecteurs d'écran quand le bloc a le focus
      ariaLabel: `${nom}, bloc ${bloc?.libelle ?? noeud.type}, ${TEXTES_ETAT[etat] ?? etat}${verrouille ? ', bloc fourni' : ''}`,
      data: {
        nom,
        type: noeud.type,
        bloc: bloc ? { libelle: bloc.libelle, icone: bloc.icone, couleur: bloc.couleur, entrees: bloc.entrees, sorties: bloc.sorties } : null,
        resume: bloc?.resumer?.(noeud.config ?? {}) ?? '',
        etat,
        verrouille,
      },
    }
  })
}

/**
 * Liens Vue Flow. Un lien emprunté pendant l'exécution est mis en valeur, un lien non pris est en pointillés.
 */
export function versLiens(workflow, { liensActifs = {}, registre = BLOCS } = {}) {
  const parId = new Map(workflow.noeuds.map((noeud) => [noeud.id, noeud]))
  return workflow.liens.map((lien) => {
    const source = parId.get(lien.source)
    const cible = parId.get(lien.cible)
    const sorties = source ? trouverBloc(source.type, registre)?.sorties ?? [] : []
    const libelleSortie = sorties.length > 1 ? sorties.find((sortie) => sortie.id === lien.sortie)?.libelle : null
    const etat = lien.id in liensActifs ? (liensActifs[lien.id] ? 'pris' : 'non-pris') : 'attente'
    const nomSource = source ? nomDuNoeud(source, registre) : lien.source
    const nomCible = cible ? nomDuNoeud(cible, registre) : lien.cible
    return {
      id: lien.id,
      source: lien.source,
      target: lien.cible,
      sourceHandle: lien.sortie,
      targetHandle: 'entree',
      ariaLabel: `Lien de ${nomSource}${libelleSortie ? ` (${libelleSortie.toLowerCase()})` : ''} vers ${nomCible}`,
      class: `lien-${etat}`,
      data: { etat },
    }
  })
}

/**
 * Une connexion proposée dans la vue graphique est-elle acceptable ?
 * Mêmes règles que la vue en étapes : pas vers soi, pas de doublon, pas de boucle, une cible qui reçoit des données.
 */
export function connexionValide(workflow, { source, sourceHandle, target }, registre = BLOCS) {
  if (!source || !target || source === target) return false
  const cible = workflow.noeuds.find((noeud) => noeud.id === target)
  const origine = workflow.noeuds.find((noeud) => noeud.id === source)
  if (!cible || !origine) return false
  if (!trouverBloc(cible.type, registre)?.entrees.length) return false
  const sortie = sourceHandle ?? 'sortie'
  if (!trouverBloc(origine.type, registre)?.sorties.some((candidat) => candidat.id === sortie)) return false
  if (workflow.liens.some((lien) => lien.source === source && lien.sortie === sortie && lien.cible === target)) return false
  return !accessiblesDepuis(workflow, target).has(source)
}
