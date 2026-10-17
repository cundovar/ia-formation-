import { describe, expect, it } from 'vitest'
import { normaliser, ordreTopologique, valider } from '@/laboratoires/moteur/workflow'

const noeud = (id, type, config = {}) => ({ id, type, config })
const lien = (source, cible, sortie = 'sortie') => ({ source, cible, sortie })

const transformation = (id, valeur = 'ok') => noeud(id, 'transformation', { operation: 'definir', champ: 'etat', valeur })

const simple = () => normaliser({
  noeuds: [noeud('d', 'declencheur', { evenement: 'Un message arrive' }), transformation('t'), noeud('r', 'resultat')],
  liens: [lien('d', 't'), lien('t', 'r')],
})

const codes = (workflow, options) => valider(workflow, options).map((erreur) => erreur.code)

describe('valider', () => {
  it('accepte un workflow cohérent', () => {
    expect(valider(simple())).toEqual([])
  })

  it('exige un seul déclencheur et un résultat', () => {
    const sansDeclencheur = normaliser({ noeuds: [noeud('r', 'resultat')], liens: [] })
    expect(codes(sansDeclencheur)).toContain('DECLENCHEUR_MANQUANT')

    const deux = simple()
    deux.noeuds.push(noeud('d2', 'declencheur', {}))
    expect(codes(deux)).toContain('DECLENCHEURS_MULTIPLES')

    const sansResultat = normaliser({ noeuds: [noeud('d', 'declencheur')], liens: [] })
    expect(codes(sansResultat)).toContain('RESULTAT_MANQUANT')
  })

  it('signale un bloc non relié, un type inconnu ou non disponible', () => {
    const workflow = simple()
    workflow.liens.pop()
    workflow.noeuds.push(noeud('x', 'inconnu'))
    const erreurs = valider(workflow, { blocsDisponibles: ['declencheur', 'resultat'] })
    expect(erreurs).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'ENTREE_MANQUANTE', noeudId: 'r' }),
      expect.objectContaining({ code: 'TYPE_INCONNU', noeudId: 'x' }),
      expect.objectContaining({ code: 'BLOC_NON_DISPONIBLE', noeudId: 't' }),
    ]))
  })

  it('refuse les liens invalides, en double, vers soi-même ou vers un déclencheur', () => {
    const workflow = simple()
    workflow.liens.push(
      { id: 'a', source: 't', sortie: 'sortie', cible: 'disparu' },
      { id: 'b', source: 't', sortie: 'vrai', cible: 'r' },
      { id: 'c', source: 't', sortie: 'sortie', cible: 'r' },
      { id: 'e', source: 't', sortie: 'sortie', cible: 't' },
      { id: 'f', source: 'r', sortie: 'sortie', cible: 'd' },
    )
    expect(codes(workflow)).toEqual(expect.arrayContaining(['LIEN_INVALIDE', 'PORT_INVALIDE', 'LIEN_DOUBLON']))
  })

  it('détecte une boucle', () => {
    const workflow = normaliser({
      noeuds: [noeud('d', 'declencheur'), transformation('a'), transformation('b'), noeud('r', 'resultat')],
      liens: [lien('d', 'a'), lien('a', 'b'), lien('b', 'a'), lien('b', 'r')],
    })
    const cycle = valider(workflow).find((erreur) => erreur.code === 'CYCLE')
    expect(cycle.noeuds.sort()).toEqual(['a', 'b', 'r'])
  })

  it('signale une chaîne de blocs coupée du déclencheur', () => {
    const workflow = normaliser({
      noeuds: [noeud('d', 'declencheur'), noeud('r', 'resultat'), transformation('a'), transformation('b')],
      liens: [lien('d', 'r'), lien('a', 'b')],
    })
    expect(valider(workflow)).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'ENTREE_MANQUANTE', noeudId: 'a' }),
      expect.objectContaining({ code: 'NOEUD_INACCESSIBLE', noeudId: 'b' }),
    ]))
  })

  it('vérifie la configuration de chaque bloc', () => {
    const workflow = simple()
    workflow.noeuds[1].config = { operation: 'definir', champ: '__proto__', valeur: '{{a[0]}}' }
    workflow.noeuds.push(noeud('c', 'condition', { chemin: 'x', operateur: 'eval' }))
    workflow.liens.push(lien('d', 'c'))
    const messages = valider(workflow).filter((erreur) => erreur.code === 'CONFIG_INVALIDE').map((erreur) => erreur.message)
    expect(messages).toHaveLength(3)
  })

  it('limite la taille d\'un workflow', () => {
    const workflow = normaliser({ noeuds: Array.from({ length: 51 }, (_, i) => transformation(`t${i}`)), liens: [] })
    expect(codes(workflow)).toContain('TROP_DE_NOEUDS')
  })
})

describe('ordreTopologique', () => {
  it('suit les dépendances en gardant l\'ordre des blocs', () => {
    const workflow = normaliser({
      noeuds: [noeud('r', 'resultat'), transformation('b'), transformation('a'), noeud('d', 'declencheur')],
      liens: [lien('d', 'a'), lien('d', 'b'), lien('a', 'r'), lien('b', 'r')],
    })
    expect(ordreTopologique(workflow)).toEqual({ ordre: ['d', 'b', 'a', 'r'], cycle: [] })
  })
})
