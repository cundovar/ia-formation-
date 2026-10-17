import { describe, expect, it } from 'vitest'
import { BLOCS } from '@/laboratoires/blocs'
import { creerExecution, estTerminee, etapeSuivante, executerTout } from '@/laboratoires/moteur/execution'

const tri = {
  noeuds: [
    { id: 'd', type: 'declencheur', config: { evenement: 'Un e-mail arrive' } },
    { id: 'c', type: 'condition', config: { chemin: 'email.objet', operateur: 'contient', valeur: 'facture' } },
    { id: 'compta', type: 'transformation', libelle: 'Comptabilité', config: { operation: 'definir', champ: 'dossier', valeur: 'Comptabilité' } },
    { id: 'lire', type: 'transformation', config: { operation: 'definir', champ: 'dossier', valeur: 'À lire' } },
    { id: 'r', type: 'resultat', config: {} },
  ],
  liens: [
    { id: 'l1', source: 'd', cible: 'c' },
    { id: 'l2', source: 'c', sortie: 'vrai', cible: 'compta' },
    { id: 'l3', source: 'c', sortie: 'faux', cible: 'lire' },
    { id: 'l4', source: 'compta', cible: 'r' },
    { id: 'l5', source: 'lire', cible: 'r' },
  ],
}

const facture = { id: 'facture', libelle: 'Facture', donnees: { email: { objet: 'Facture n° 12' } } }
const invitation = { id: 'invitation', libelle: 'Invitation', donnees: { email: { objet: 'Atelier samedi' } } }

describe('exécution', () => {
  it('suit la branche choisie par la condition et ignore l\'autre', async () => {
    const execution = await executerTout(tri, facture)
    expect(execution.statut).toBe('termine')
    expect(execution.resultat).toEqual({ email: { objet: 'Facture n° 12' }, dossier: 'Comptabilité' })
    expect(execution.etats).toEqual({ d: 'ok', c: 'ok', compta: 'ok', lire: 'ignore', r: 'ok' })
    expect(execution.journal.map((entree) => entree.statut)).toEqual(['ok', 'ok', 'ok', 'ignore', 'ok'])
    expect(execution.journal[1].explication).toMatch(/Réponse : vrai/)
    expect(execution.journal[3].explication).toMatch(/chemin qui y mène n'a pas été pris/)

    const autre = await executerTout(tri, invitation)
    expect(autre.resultat.dossier).toBe('À lire')
    expect(autre.etats.compta).toBe('ignore')
  })

  it('avance d\'un bloc à chaque étape sans modifier l\'état précédent', async () => {
    const depart = creerExecution(tri, facture)
    expect(depart.statut).toBe('pret')
    const copie = structuredClone(depart)

    const premiere = await etapeSuivante(depart)
    expect(depart).toEqual(copie)
    expect(premiere.statut).toBe('en_cours')
    expect(premiere.journal).toHaveLength(1)
    expect(premiere.sorties.d).toEqual(facture.donnees)
    expect(premiere.journal[0].entree).toBeNull()

    let execution = premiere
    while (!estTerminee(execution)) execution = await etapeSuivante(execution)
    expect(execution).toEqual(await executerTout(tri, facture))
    // Une étape de plus ne change rien
    expect(await etapeSuivante(execution)).toBe(execution)
  })

  it('est déterministe et ne modifie pas le jeu de données', async () => {
    const jeu = structuredClone(facture)
    const a = await executerTout(tri, jeu)
    const b = await executerTout(tri, jeu)
    expect(a).toEqual(b)
    expect(jeu).toEqual(facture)
  })

  it('s\'arrête sur une erreur de bloc et l\'explique', async () => {
    const erreur = structuredClone(tri)
    erreur.noeuds[1].config.chemin = 'email.sujet'
    const execution = await executerTout(erreur, facture)
    expect(execution.statut).toBe('erreur')
    expect(execution.erreur).toMatchObject({ code: 'CHEMIN_INTROUVABLE', noeudId: 'c' })
    expect(execution.etats).toMatchObject({ d: 'ok', c: 'erreur', r: 'attente' })
    expect(execution.journal.at(-1).explication).toMatch(/email.sujet/)
  })

  it('n\'exécute pas un workflow invalide', async () => {
    const execution = await executerTout({ noeuds: tri.noeuds, liens: [] }, facture)
    expect(execution.statut).toBe('invalide')
    expect(execution.journal).toEqual([])
    expect(execution.erreursValidation.length).toBeGreaterThan(0)
  })

  it('fusionne les données de plusieurs branches actives', async () => {
    const execution = await executerTout({
      noeuds: [
        { id: 'd', type: 'declencheur', config: {} },
        { id: 'a', type: 'transformation', config: { operation: 'definir', champ: 'a', valeur: '1' } },
        { id: 'b', type: 'transformation', config: { operation: 'definir', champ: 'b', valeur: '2' } },
        { id: 'r', type: 'resultat', config: {} },
      ],
      liens: [{ source: 'd', cible: 'a' }, { source: 'd', cible: 'b' }, { source: 'a', cible: 'r' }, { source: 'b', cible: 'r' }],
    }, { id: 'j', libelle: 'j', donnees: { x: 0 } })
    expect(execution.resultat).toEqual({ x: 0, a: '1', b: '2' })
  })

  it('arrête des données trop volumineuses et attend un bloc asynchrone', async () => {
    const registre = {
      ...BLOCS,
      gros: { ...BLOCS.transformation, type: 'gros', verifierConfig: () => [], executer: async () => ({ donnees: { texte: 'x'.repeat(60000) } }) },
      lent: { ...BLOCS.transformation, type: 'lent', verifierConfig: () => [], executer: async ({ entree }) => ({ donnees: { ...entree, lent: true } }) },
    }
    const workflow = (type) => ({
      noeuds: [{ id: 'd', type: 'declencheur' }, { id: 'x', type }, { id: 'r', type: 'resultat' }],
      liens: [{ source: 'd', cible: 'x' }, { source: 'x', cible: 'r' }],
    })
    expect((await executerTout(workflow('gros'), facture, { registre })).erreur.code).toBe('DONNEES_TROP_GROSSES')
    expect((await executerTout(workflow('lent'), facture, { registre })).resultat.lent).toBe(true)
  })

  it('transforme les données avec chaque opération', async () => {
    const operation = async (config, donnees) => (await executerTout({
      noeuds: [{ id: 'd', type: 'declencheur' }, { id: 't', type: 'transformation', config }, { id: 'r', type: 'resultat' }],
      liens: [{ source: 'd', cible: 't' }, { source: 't', cible: 'r' }],
    }, { id: 'j', libelle: 'j', donnees }))
    const donnees = { contact: { prenom: 'Léa' }, liste: [1, 2, 3], titre: 'BONJOUR' }

    expect((await operation({ operation: 'copier', source: 'contact.prenom', champ: 'prenom' }, donnees)).resultat.prenom).toBe('Léa')
    expect((await operation({ operation: 'renommer', source: 'titre', champ: 'objet' }, donnees)).resultat).toMatchObject({ objet: 'BONJOUR' })
    expect((await operation({ operation: 'renommer', source: 'titre', champ: 'objet' }, donnees)).resultat.titre).toBeUndefined()
    expect((await operation({ operation: 'supprimer', champ: 'liste' }, donnees)).resultat.liste).toBeUndefined()
    expect((await operation({ operation: 'minuscules', champ: 'titre' }, donnees)).resultat.titre).toBe('bonjour')
    expect((await operation({ operation: 'compter', source: 'liste', champ: 'nombre' }, donnees)).resultat.nombre).toBe(3)
    expect((await operation({ operation: 'compter', source: 'titre', champ: 'nombre' }, donnees)).erreur.code).toBe('PAS_UNE_LISTE')
  })

  it('ajoute des données JSON fictives', async () => {
    const execution = await executerTout({
      noeuds: [{ id: 'd', type: 'declencheur' }, { id: 'j', type: 'donnees', config: { champ: 'client', json: '{"prenom":"Karim"}' } }, { id: 'r', type: 'resultat' }],
      liens: [{ source: 'd', cible: 'j' }, { source: 'j', cible: 'r' }],
    }, facture)
    expect(execution.resultat.client).toEqual({ prenom: 'Karim' })

    const invalide = creerExecution({
      noeuds: [{ id: 'd', type: 'declencheur' }, { id: 'j', type: 'donnees', config: { champ: 'client', json: '{prenom:}' } }, { id: 'r', type: 'resultat' }],
      liens: [{ source: 'd', cible: 'j' }, { source: 'j', cible: 'r' }],
    }, facture)
    expect(invalide.erreursValidation[0].message).toMatch(/JSON valide/)
  })
})
