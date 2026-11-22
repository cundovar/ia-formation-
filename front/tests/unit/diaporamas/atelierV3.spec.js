// @vitest-environment node
import { writeFileSync } from 'node:fs'
import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { construirePptx } from '@/diaporamas/construirePptx'
import { maitres, planDiaporama } from '@/diaporamas/miseEnPage'
import { ICONES, TRACES, estIconeConnue, svgIcone } from '@/diaporamas/icones'
import { compositionV3, normaliserPoints } from '@/diaporamas/miseEnPageV3'
import { ICONES_PNG } from '@/diaporamas/iconesPng'
import { ID, FORMAT } from '@/diaporamas/themes/atelierVisuelV3'
import { idTheme } from '@/diaporamas/themes'
import pilote from '@/diaporamas/pilote/devis-tpe-v3.json'
import piloteV1 from '@/diaporamas/pilote/devis-tpe.json'

const tousLesElements = (diapositive) => [
  ...diapositive.elements,
  ...(diapositive.scene ? diapositive.scene.fixe.elements : []),
]

describe('Atelier visuel v3', () => {
  it('est un thème connu du registre', () => {
    expect(idTheme(ID)).toBe(ID)
  })

  it('compose le pilote TPE : convergence en quatre blocs, puis circuit en trois étapes', () => {
    const plan = planDiaporama(pilote)
    expect(plan.theme).toBe(ID)
    expect(plan.diapositives).toHaveLength(2)
    const [demande, verification] = plan.diapositives
    expect(demande.scene.type).toBe('convergence')
    expect(demande.scene.etapes).toHaveLength(4)
    expect(verification.scene.type).toBe('circuit')
    expect(verification.scene.etapes).toHaveLength(3)
    // Chaque étape ajoute un bloc : les éléments visibles s'accumulent, la vue fixe montre tout
    const tailles = demande.scene.etapes.map((e) => e.elements.length)
    expect(tailles).toEqual([...tailles].sort((a, b) => a - b))
    expect(demande.scene.fixe.elements).toEqual(demande.scene.etapes[3].elements)
    // PowerPoint : une diapositive fixe, éditable
    expect(demande.scene.rendusPptx).toBe('fixe')
  })

  it('met en avant une seule carte, celle désignée par miseEnAvant', () => {
    const [demande, verification] = planDiaporama(pilote).diapositives
    const cartes = (d, prefixe) => d.scene.fixe.elements.filter((e) => new RegExp(`^${prefixe}-\\d$`).test(e.id))
    const enAvant = (d, prefixe) => cartes(d, prefixe).filter((c) => c.fond === 'E3EBE0').map((c) => c.id)
    expect(enAvant(demande, 'bloc')).toEqual(['bloc-3'])
    expect(enAvant(verification, 'etape')).toEqual(['etape-2'])
    // Sans indication ou avec un index hors limites : le premier point
    const sansIndex = { ...pilote.diapositives[0], miseEnAvant: 9 }
    const fixe = compositionV3(sansIndex).fixe.elements
    expect(fixe.find((e) => e.id === 'bloc-0').fond).toBe('E3EBE0')
  })

  it('affiche le fil de progression des parties et le numéro calculé par le site', () => {
    const [demande, verification] = planDiaporama(pilote).diapositives
    const texteDe = (d, id) => d.elements.find((e) => e.id === id)?.paragraphes[0].texte
    expect(texteDe(demande, 'progression-0')).toBe('Formuler')
    expect(demande.elements.find((e) => e.id === 'progression-0').gras).toBe(true)
    expect(verification.elements.find((e) => e.id === 'progression-1').gras).toBe(true)
    expect(texteDe(verification, 'numero')).toBe('02 / 02')
    expect(texteDe(demande, 'synthese')).toMatch(/^Quatre éléments/)
  })

  it('garde le texte projeté à 24 points au moins et tous les éléments dans la diapositive', () => {
    for (const diapositive of planDiaporama(pilote).diapositives) {
      for (const e of tousLesElements(diapositive)) {
        if (e.type === 'texte' && !['repere'].includes(e.role)) expect(e.taille, e.id).toBeGreaterThanOrEqual(24)
        if (e.type === 'ligne') continue
        expect(e.x, e.id).toBeGreaterThanOrEqual(0)
        expect(e.y, e.id).toBeGreaterThanOrEqual(0)
        expect(e.x + e.w, e.id).toBeLessThanOrEqual(FORMAT.largeur + 0.001)
        expect(e.y + e.h, e.id).toBeLessThanOrEqual(FORMAT.hauteur + 0.001)
      }
    }
  })

  it('n\'utilise que des fonds clairs (AGENTS.md)', () => {
    const clair = (hex) => {
      const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.6
    }
    for (const diapositive of planDiaporama(pilote).diapositives) {
      for (const e of tousLesElements(diapositive)) {
        // Petits repères (points de liaison, curseur, filets) : traits, pas des fonds
        if (e.type !== 'forme' || e.w * e.h < 0.05) continue
        expect(clair(e.fond), `${e.id} #${e.fond}`).toBe(true)
      }
    }
  })

  it('accepte encore les listes de phrases : le modèle suit alors Atelier visuel, avec la progression v3', () => {
    const ancien = { ...piloteV1, theme: ID, scenario: pilote.scenario }
    const plan = planDiaporama(ancien)
    expect(plan.theme).toBe(ID)
    expect(plan.diapositives[0].scene?.type).toBe('chaine_traitement')
    expect(normaliserPoints(['Une phrase'])[0]).toMatchObject({ titre: '', texte: 'Une phrase' })
  })

  it('suit Atelier visuel en lecture étroite (mobile), faute de format étroit v3, sans perdre les points', () => {
    const plan = planDiaporama(pilote, { format: 'etroit' })
    expect(plan.theme).toBe('atelier_visuel')
    const textes = plan.diapositives.flatMap((d) => d.elements).filter((e) => e.type === 'texte').flatMap((e) => e.paragraphes.map((p) => p.texte))
    expect(textes).toContain('Limites : « N’indique ni prix ni délai. »')
    expect(textes.some((t) => t.includes('à vérifier : Tarif et délai à confirmer'))).toBe(true)
  })

  it('ignore une icône hors catalogue et garde le catalogue aligné sur les dessins', () => {
    expect(estIconeConnue('licorne')).toBe(false)
    expect(normaliserPoints([{ titre: 'A', texte: 'B', icone: 'licorne' }])[0].icone).toBeNull()
    for (const nom of Object.keys(ICONES)) expect(TRACES[nom], nom).toBeTruthy()
    for (const nom of Object.keys(TRACES)) expect(ICONES_PNG[nom], `${nom} (PNG)`).toMatch(/^data:image\/png;base64,/)
    expect(svgIcone('cible')).toContain('<svg')
  })

  it('construit le .pptx avec des formes et des textes modifiables', async () => {
    const pptx = await construirePptx(pilote)
    const zip = await JSZip.loadAsync(await pptx.write({ outputType: 'nodebuffer' }))
    const xml = await zip.file('ppt/slides/slide1.xml').async('string')
    expect(xml).toContain('Réponds à une demande de devis')
    expect(xml).toContain('wedgeRoundRectCallout')
    expect(xml).toContain('outerShdw')
    const xml2 = await zip.file('ppt/slides/slide2.xml').async('string')
    expect(xml2).toContain('Tarif et délai à confirmer')
    expect(xml2).toContain('prstDash')
    expect(Object.keys(zip.files).some((f) => /media\/.*\.png$/.test(f))).toBe(true)
    if (process.env.EXPORT_PILOTE_V3) writeFileSync(process.env.EXPORT_PILOTE_V3, await pptx.write({ outputType: 'nodebuffer' }))
  })

  it('décrit les masques v3 avec le nom du site', () => {
    const decors = maitres(planDiaporama(pilote), 'Formation IA')
    expect(decors.CONTENU.fond).toBe('FBF7EE')
    expect(decors.CONTENU.elements[0].paragraphes[0].texte).toBe('Formation IA')
  })
})
