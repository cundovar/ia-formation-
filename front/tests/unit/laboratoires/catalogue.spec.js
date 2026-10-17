import { describe, expect, it } from 'vitest'
import { laboratoiresDuCours, listerLaboratoires, trouverLaboratoire } from '@/laboratoires/catalogue'
import { validerLaboratoire } from '@/laboratoires/catalogue/validerLaboratoire'
import { evaluerCriteres } from '@/laboratoires/moteur/criteres'

const laboratoires = listerLaboratoires()

describe('catalogue', () => {
  it('contient au moins les deux laboratoires débutants, rangés par niveau', () => {
    expect(laboratoires.map((lab) => lab.slug).slice(0, 2)).toEqual(['comprendre-un-workflow', 'trier-des-emails'])
    expect(trouverLaboratoire('trier-des-emails').titre).toMatch(/Trier/)
    expect(trouverLaboratoire('inconnu')).toBeNull()
  })

  it('a des slugs uniques et des prérequis qui existent', () => {
    const slugs = laboratoires.map((lab) => lab.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    laboratoires.flatMap((lab) => lab.prerequis ?? []).forEach((slug) => expect(slugs).toContain(slug))
  })

  it('trouve les laboratoires d\'un cours', () => {
    expect(laboratoiresDuCours('')).toEqual([])
    expect(laboratoiresDuCours('/cours-sans-laboratoire')).toEqual([])
  })

  it.each(laboratoires.map((lab) => [lab.slug, lab]))('%s : définition valide', (_, lab) => {
    expect(validerLaboratoire(lab)).toEqual([])
  })

  it.each(laboratoires.map((lab) => [lab.slug, lab]))('%s : la correction réussit tous les critères', async (_, lab) => {
    const evaluation = await evaluerCriteres(lab, lab.correction.workflow)
    expect(evaluation.details.filter((detail) => !detail.reussi)).toEqual([])
    expect(evaluation.reussi).toBe(true)
  })

  it.each(laboratoires.map((lab) => [lab.slug, lab]))('%s : le workflow de départ ne réussit pas encore', async (_, lab) => {
    expect((await evaluerCriteres(lab, lab.workflowInitial)).reussi).toBe(false)
  })

  it('n\'utilise que des adresses fictives et aucune clé (LAB-02)', () => {
    laboratoires.forEach((lab) => {
      const texte = JSON.stringify(lab)
      const domaines = [...texte.matchAll(/@([a-z0-9.-]+)/gi), ...texte.matchAll(/https?:\/\/([a-z0-9.-]+)/gi)].map((m) => m[1])
      domaines.forEach((domaine) => expect(domaine, `${lab.slug} : ${domaine}`).toMatch(/(^|[.-])exemple\.fr$|(^|\.)example\.(com|org)$|\.test$/))
      expect(texte, lab.slug).not.toMatch(/sk-[A-Za-z0-9]{10,}|api[_-]?key/i)
    })
  })
})

describe('validerLaboratoire', () => {
  const lab = () => structuredClone(trouverLaboratoire('trier-des-emails'))

  it('signale les champs manquants et les références inconnues', () => {
    const sansTitre = lab()
    delete sansTitre.titre
    expect(validerLaboratoire(sansTitre)).toEqual(['trier-des-emails : le champ « titre » est obligatoire.'])

    const incoherent = lab()
    incoherent.niveau = 'expert'
    incoherent.blocsDisponibles.push('fusee')
    incoherent.criteres.push({ id: 'x', type: 'magie', message: 'x' }, { id: 'y', type: 'sansErreur', jeu: 'absent', message: 'y' })
    incoherent.verrous.noeuds.push('fantome')
    expect(validerLaboratoire(incoherent)).toEqual(expect.arrayContaining([
      expect.stringMatching(/niveau inconnu/),
      expect.stringMatching(/bloc inconnu « fusee »/),
      expect.stringMatching(/critère inconnu « magie »/),
      expect.stringMatching(/jeu inconnu « absent »/),
      expect.stringMatching(/bloc inconnu « fantome »/),
    ]))
  })

  it('refuse une correction qui ne peut pas s\'exécuter', () => {
    const casse = lab()
    casse.correction.workflow.liens = []
    expect(validerLaboratoire(casse).some((probleme) => probleme.includes('correction invalide'))).toBe(true)
  })
})

describe('critères', () => {
  const lab = trouverLaboratoire('trier-des-emails')

  it('détaille les critères réussis et ceux à revoir', async () => {
    const evaluation = await evaluerCriteres(lab, lab.workflowInitial)
    expect(Object.fromEntries(evaluation.details.map((detail) => [detail.id, detail.reussi]))).toEqual({
      condition: false, facture: false, rappel: false, invitation: true, 'sans-erreur': true,
    })
    expect(Object.keys(evaluation.executions)).toEqual(['facture', 'invitation', 'rappel'])
  })

  it('échoue sur tous les critères si le workflow est invalide', async () => {
    const evaluation = await evaluerCriteres(lab, { noeuds: lab.workflowInitial.noeuds, liens: [] })
    expect(evaluation.erreursValidation.length).toBeGreaterThan(0)
    expect(evaluation.details.every((detail) => !detail.reussi)).toBe(true)
  })

  it('vérifie l\'ordre des blocs et leur exécution', async () => {
    const { EVALUATEURS } = await import('@/laboratoires/moteur/criteres')
    const correction = lab.correction.workflow
    const evaluation = await evaluerCriteres(lab, correction)
    expect(EVALUATEURS.blocAvant({ bloc: 'condition', avant: 'resultat' }, correction)).toBe(true)
    expect(EVALUATEURS.blocAvant({ bloc: 'resultat', avant: 'condition' }, correction)).toBe(false)
    expect(EVALUATEURS.blocExecute({ bloc: 'condition' }, correction, evaluation.executions)).toBe(true)
    expect(EVALUATEURS.blocNonExecute({ bloc: 'donnees' }, correction, evaluation.executions)).toBe(true)
    expect(EVALUATEURS.nombreMaxBlocs({ max: 4 }, correction)).toBe(false)
  })
})
