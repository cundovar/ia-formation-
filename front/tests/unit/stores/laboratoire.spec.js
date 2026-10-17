import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { trouverLaboratoire } from '@/laboratoires/catalogue'
import { useLaboratoireStore } from '@/stores/laboratoire'

const lab = trouverLaboratoire('trier-des-emails')

let store
beforeEach(() => {
  setActivePinia(createPinia())
  store = useLaboratoireStore()
  store.charger(lab)
})

afterEach(() => vi.useRealTimers())

// Construit la correction du laboratoire « trier des e-mails » avec les actions du store
const construireTri = () => {
  const condition = store.ajouterBloc('condition')
  store.configurer(condition, 'chemin', 'email.objet')
  store.configurer(condition, 'valeur', 'facture')
  const compta = store.ajouterBloc('transformation')
  store.configurer(compta, 'champ', 'dossier')
  store.configurer(compta, 'valeur', 'Comptabilité')
  store.delier('l1')
  store.relier('declencheur', 'sortie', condition)
  store.relier(condition, 'vrai', compta)
  store.relier(condition, 'faux', 'a-lire')
  store.relier(compta, 'sortie', 'resultat')
}

describe('store des laboratoires', () => {
  it('charge le workflow de départ et le premier jeu de données', () => {
    expect(store.workflow.noeuds.map((noeud) => noeud.id)).toEqual(['declencheur', 'a-lire', 'resultat'])
    expect(store.jeu.id).toBe('facture')
    expect(store.erreursValidation).toEqual([])
    // Un seul déclencheur : il n'est plus proposé à l'ajout
    expect(store.blocsAjoutables.map((bloc) => bloc.type)).toEqual(['condition', 'transformation', 'resultat'])
  })

  it('n\'ajoute que les blocs disponibles et protège les blocs verrouillés', () => {
    expect(store.ajouterBloc('donnees')).toBeNull()
    store.supprimerBloc('declencheur')
    store.configurer('resultat', 'x', 1)
    store.renommer('declencheur', 'Autre')
    expect(store.workflow.noeuds.find((noeud) => noeud.id === 'declencheur').libelle).toBe('Un e-mail arrive')
    expect(store.workflow.noeuds).toHaveLength(3)

    store.supprimerBloc('a-lire')
    expect(store.workflow.noeuds).toHaveLength(2)
    expect(store.workflow.liens).toEqual([])
  })

  it('refuse un lien en double ou vers soi-même', () => {
    expect(store.relier('declencheur', 'sortie', 'a-lire')).toBeNull()
    expect(store.relier('a-lire', 'sortie', 'a-lire')).toBeNull()
    expect(store.relier('declencheur', 'sortie', 'resultat')).toBe('lien-3')
  })

  it('exécute pas à pas puis repart de zéro', async () => {
    await store.pas()
    expect(store.execution.journal).toHaveLength(1)
    expect(store.prochainNoeud).toBe('a-lire')
    await store.pas()
    await store.pas()
    expect(store.terminee).toBe(true)
    expect(store.execution.resultat.dossier).toBe('À lire')

    await store.pas()
    expect(store.execution.journal).toHaveLength(1)

    store.reinitialiser()
    expect(store.execution).toBeNull()
  })

  it('exécute en continu, se met en pause et reprend', async () => {
    vi.useFakeTimers()
    store.lire()
    await vi.advanceTimersByTimeAsync(0)
    expect(store.execution.journal).toHaveLength(1)
    store.pause()
    await vi.advanceTimersByTimeAsync(5000)
    expect(store.execution.journal).toHaveLength(1)

    store.lire()
    await vi.advanceTimersByTimeAsync(store.vitesse * 3)
    expect(store.terminee).toBe(true)
    expect(store.lecture).toBe(false)
  })

  it('annule l\'exécution et la vérification quand le workflow change', async () => {
    await store.toutExecuter()
    await store.verifier()
    store.ajouterBloc('condition')
    expect(store.execution).toBeNull()
    expect(store.verification).toBeNull()
  })

  it('change de jeu de données', async () => {
    await store.toutExecuter()
    store.choisirJeu('invitation')
    expect(store.execution).toBeNull()
    store.choisirJeu('inconnu')
    expect(store.jeuId).toBe('invitation')
  })

  it('valide le laboratoire une fois le tri construit', async () => {
    expect((await store.verifier()).reussi).toBe(false)
    construireTri()
    expect(store.erreursValidation).toEqual([])
    expect((await store.verifier()).reussi).toBe(true)
  })

  it('annule et rétablit les modifications, une frappe continue comptant pour une étape', () => {
    expect(store.peutAnnuler).toBe(false)
    const id = store.ajouterBloc('condition')
    store.configurer(id, 'chemin', 'e')
    store.configurer(id, 'chemin', 'em')
    store.configurer(id, 'chemin', 'email.objet')
    store.relier('declencheur', 'sortie', id)
    expect(store.historique.passe).toHaveLength(3)

    store.annuler()
    expect(store.workflow.liens.some((lien) => lien.cible === id)).toBe(false)
    store.annuler()
    expect(store.workflow.noeuds.find((noeud) => noeud.id === id).config.chemin).toBe('')
    store.annuler()
    expect(store.workflow.noeuds).toHaveLength(3)
    expect(store.peutAnnuler).toBe(false)

    store.retablir()
    store.retablir()
    expect(store.workflow.noeuds.find((noeud) => noeud.id === id).config.chemin).toBe('email.objet')
    // Une nouvelle modification efface ce qui pouvait être rétabli
    store.supprimerBloc(id)
    expect(store.peutRetablir).toBe(false)
  })

  it('limite l\'historique à 20 étapes', () => {
    for (let i = 0; i < 25; i++) store.configurer('a-lire', i % 2 ? 'champ' : 'valeur', `x${i}`)
    expect(store.historique.passe).toHaveLength(20)
  })

  it('duplique un bloc sans ses liens, mais jamais le déclencheur', () => {
    const copie = store.dupliquerBloc('a-lire')
    const noeud = store.workflow.noeuds.find((candidat) => candidat.id === copie)
    expect(noeud).toMatchObject({ type: 'transformation', libelle: 'Classer dans À lire (copie)', config: { valeur: 'À lire' }, position: { x: 720, y: 260 } })
    expect(store.workflow.liens.some((lien) => lien.source === copie || lien.cible === copie)).toBe(false)
    expect(store.dupliquerBloc('declencheur')).toBeNull()
  })

  it('sélectionne et déplace un bloc sans annuler l\'exécution', async () => {
    await store.toutExecuter()
    store.selectionner('a-lire')
    store.deplacer('a-lire', { x: 10.4, y: 20.6 })
    expect(store.workflow.noeuds.find((noeud) => noeud.id === 'a-lire').position).toEqual({ x: 10, y: 21 })
    expect(store.execution).not.toBeNull()
    store.supprimerBloc('a-lire')
    expect(store.noeudSelectionne).toBeNull()
    store.selectionner('inconnu')
    expect(store.noeudSelectionne).toBeNull()
  })

  it('affiche les indices un par un, puis la correction', async () => {
    store.afficherIndice()
    store.afficherIndice()
    store.afficherIndice()
    store.afficherIndice()
    expect(store.indicesAffiches).toBe(lab.indices.length)

    store.chargerCorrection()
    expect(store.correctionAffichee).toBe(true)
    expect((await store.verifier()).reussi).toBe(true)

    store.restaurerInitial()
    expect(store.workflow.noeuds).toHaveLength(3)
  })
})
