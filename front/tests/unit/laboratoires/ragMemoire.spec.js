import { describe, expect, it } from 'vitest'
import { BLOCS } from '@/laboratoires/blocs'
import { trouverLaboratoire } from '@/laboratoires/catalogue'
import { validerLaboratoire } from '@/laboratoires/catalogue/validerLaboratoire'
import { EVALUATEURS, evaluerCriteres } from '@/laboratoires/moteur/criteres'
import { executerTout } from '@/laboratoires/moteur/execution'
import { motsCles, rechercher, scorer } from '@/laboratoires/simulateurs/rechercheFictive'

const rag = trouverLaboratoire('assistant-documentaire-rag')
const memoire = trouverLaboratoire('memoire-et-contexte')
const debogage = trouverLaboratoire('deboguer-un-agent')
const { documents } = rag.simulateurs
const jeuDe = (lab, id) => lab.jeuxDeDonnees.find((jeu) => jeu.id === id)
const optionsDe = (lab) => ({ blocsDisponibles: lab.blocsDisponibles, simulateurs: lab.simulateurs })

describe('recherche documentaire fictive', () => {
  it('compare des mots sans accents, sans mots vides ni pluriel', () => {
    expect(motsCles('Quels sont vos horaires d\'ouverture en août ?')).toEqual(['horaire', 'ouverture', 'aout'])
    expect(scorer('livres empruntés', 'Un livre emprunté')).toBe(1)
    // Pas de vraie analyse du sens : « emprunter » et « emprunt » sont deux mots différents
    expect(scorer('emprunter', 'Un emprunt')).toBe(0)
    expect(scorer('Combien de livres ?', 'Cinq livres.')).toBe(1)
    expect(scorer('', 'texte')).toBe(0)
  })

  it('classe les passages par score, puis applique topK et le score minimal', () => {
    const question = 'Quels sont vos horaires d\'ouverture en août ?'
    expect(rechercher(documents, question, { topK: 3 }).map((p) => [p.passage, p.score])).toEqual([['horaires-ete', 1], ['horaires-annee', 0.67]])
    expect(rechercher(documents, question, { topK: 1 }).map((p) => p.passage)).toEqual(['horaires-ete'])
    expect(rechercher(documents, 'Puis-je emprunter un jeu vidéo ?', { topK: 3, scoreMin: 0.5 })).toEqual([])
    // À score égal, l'ordre des documents décide : le résultat est toujours le même
    expect(rechercher(documents, 'Puis-je emprunter un jeu vidéo ?', { topK: 1 })[0].passage).toBe('pret-livres')
  })

  it('le bloc range passages, sources et citations', async () => {
    const execution = await executerTout(rag.correction.workflow, jeuDe(rag, 'ete'), optionsDe(rag))
    expect(execution.resultat.recherche).toMatchObject({ sources: ['horaires-ete'], citations: 'Horaires et accès, été' })
    expect(execution.journal[1].explication).toMatch(/1 passage\(s\) retenu\(s\) sur 1 au plus : « Horaires et accès, été » \(score 1\)/)
  })

  it('refuse un topK ou un score hors limites', () => {
    const config = (modif) => BLOCS.rag.verifierConfig({ ...BLOCS.rag.configParDefaut(), question: 'q', ...modif })
    expect(config({})).toEqual([])
    expect(config({ topK: '0' })[0]).toMatch(/de 1 à 5/)
    expect(config({ topK: '2.5' })[0]).toMatch(/de 1 à 5/)
    expect(config({ scoreMin: '1,5' })[0]).toMatch(/entre 0 et 1/)
    expect(config({ scoreMin: '0,5' })).toEqual([])
  })
})

describe('mémoire', () => {
  const correction = memoire.correction.workflow

  it('retient puis relit une donnée pendant l\'exécution', async () => {
    const execution = await executerTout(correction, jeuDe(memoire, 'nadia'), optionsDe(memoire))
    expect(execution.resultat.conversation).not.toHaveProperty('tour1')
    expect(execution.resultat.conversation.memoire).toEqual({ prenom: 'Nadia' })
    expect(execution.evenements).toEqual([expect.objectContaining({ type: 'memoire', action: 'enregistrer', cle: 'prenom', valeur: 'Nadia' })])
  })

  it('repart vide à chaque exécution', async () => {
    await executerTout(correction, jeuDe(memoire, 'nadia'), optionsDe(memoire))
    const lecture = { noeuds: [{ id: 'd', type: 'declencheur' }, { id: 'm', type: 'memoire', config: { action: 'lire', champ: 'souvenir' } }, { id: 'r', type: 'resultat' }], liens: [{ source: 'd', cible: 'm' }, { source: 'm', cible: 'r' }] }
    const execution = await executerTout(lecture, { donnees: {} })
    expect(execution.resultat.souvenir).toEqual({})
    expect(execution.journal[1].explication).toMatch(/mémoire est vide/)
  })

  it('oublie une donnée et refuse un nom de souvenir piégé', async () => {
    const oubli = {
      noeuds: [
        { id: 'd', type: 'declencheur' },
        { id: 'm1', type: 'memoire', config: { action: 'enregistrer', cle: 'x', source: 'a' } },
        { id: 'm2', type: 'memoire', config: { action: 'oublier', cle: 'x' } },
        { id: 'm3', type: 'memoire', config: { action: 'lire', champ: 'souvenir' } },
        { id: 'r', type: 'resultat' },
      ],
      liens: [{ source: 'd', cible: 'm1' }, { source: 'm1', cible: 'm2' }, { source: 'm2', cible: 'm3' }, { source: 'm3', cible: 'r' }],
    }
    expect((await executerTout(oubli, { donnees: { a: 1 } })).resultat.souvenir).toEqual({})
    expect(BLOCS.memoire.verifierConfig({ action: 'enregistrer', cle: '__proto__', source: 'a' })).toContain('Le nom « __proto__ » n\'est pas autorisé.')
    expect(BLOCS.memoire.verifierConfig({ action: 'enregistrer', cle: 'a.b', source: 'a' })[0]).toMatch(/sans espace ni point/)
  })

  it('signale une donnée sensible mise en mémoire, même dans un objet', async () => {
    const { executions } = await evaluerCriteres(memoire, memoire.workflowInitial)
    expect(EVALUATEURS.donneeNonMemorisee({ chemin: 'conversation.tour1.telephone' }, null, executions)).toBe(false)
    expect(EVALUATEURS.donneeNonMemorisee({ chemin: 'conversation.absente' }, null, executions)).toBe(true)
  })
})

describe('déboguer un agent', () => {
  it('le workflow de départ s\'arrête sur la faute de frappe', async () => {
    const execution = await executerTout(debogage.workflowInitial, jeuDe(debogage, 'livres'), optionsDe(debogage))
    expect(execution.erreur).toMatchObject({ code: 'CHEMIN_INTROUVABLE', noeudId: 'recherche' })
  })

  it('chaque défaut corrigé seul ne suffit pas', async () => {
    const corrige = (modifier) => {
      const workflow = structuredClone(debogage.workflowInitial)
      modifier(workflow)
      return evaluerCriteres(debogage, workflow)
    }
    const typo = await corrige((w) => { w.noeuds[1].config.question = 'demande.question' })
    expect(typo.reussi).toBe(false)
    expect(typo.executions.ateliers.resultat.statut).toBe('Réponse envoyée au lecteur')
  })
})

describe('validerLaboratoire (phase 4)', () => {
  it('contrôle les documents fictifs', () => {
    const lab = structuredClone(rag)
    lab.simulateurs.documents.push({ id: 'vide', titre: '', source: 's', passages: [] }, { id: 'double', titre: 't', source: 's', passages: [{ id: 'pret-livres', texte: 'x' }] })
    expect(validerLaboratoire(lab)).toEqual(expect.arrayContaining([
      expect.stringMatching(/id, titre et source/),
      expect.stringMatching(/au moins un passage/),
      expect.stringMatching(/passage en double « pret-livres »/),
    ]))
    lab.simulateurs.documents = []
    expect(validerLaboratoire(lab)).toEqual(expect.arrayContaining([expect.stringMatching(/simulateurs.documents est vide/)]))
  })
})

describe('journal de la recherche', () => {
  it('explique pourquoi rien n\'est trouvé', async () => {
    const depart = await executerTout(rag.workflowInitial, jeuDe(rag, 'livres'), optionsDe(rag))
    expect(depart.journal[1].explication).toMatch(/aucun passage ne partage de mot avec la question/)
    const seuil = await executerTout(rag.correction.workflow, jeuDe(rag, 'jeux-video'), optionsDe(rag))
    expect(seuil.journal[1].explication).toMatch(/aucun passage n'atteint le score minimal \(0.5\)/)
  })
})
