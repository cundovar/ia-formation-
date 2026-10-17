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
