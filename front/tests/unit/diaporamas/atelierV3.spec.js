// @vitest-environment node
import { writeFileSync } from 'node:fs'
import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { construirePptx } from '@/diaporamas/construirePptx'
import { maitres, planDiaporama } from '@/diaporamas/miseEnPage'
import { ICONES, TRACES, estIconeConnue, svgIcone } from '@/diaporamas/icones'
import { compositionV3, normaliserPoints, segmentsTitre } from '@/diaporamas/miseEnPageV3'
import { ICONES_PNG } from '@/diaporamas/iconesPng'
import { ID, FORMAT, ZONES } from '@/diaporamas/themes/atelierVisuelV3'
import { idTheme } from '@/diaporamas/themes'
import { texteTient } from '@/diaporamas/mesure'
import pilote from '@/diaporamas/pilote/devis-tpe-v3.json'
import piloteV1 from '@/diaporamas/pilote/devis-tpe.json'

// Diaporama d'essai : mot-clé du titre et deux diapositives chiffres_cles (repère, puis statistique sourcée)
const essaiChiffres = {
  titre: 'Chiffres clés',
  theme: ID,
  scenario: { parties: [{ id: 'reperer', titre: 'Repérer' }, { id: 'verifier', titre: 'Vérifier' }] },
  diapositives: [
    {
      modele: 'chiffres_cles', scenarioPartie: 'reperer', titre: 'Une règle simple pour relire', motCle: 'relire',
      valeur: '3', unite: 'relectures', libelle: 'avant tout envoi d’un texte produit par l’IA', nature: 'repere',
      conclusion: 'Un repère de travail, pas une mesure.',
    },
    {
      modele: 'chiffres_cles', scenarioPartie: 'verifier', titre: 'Ce que dit le cours', motCle: 'le cours',
      valeur: '40', unite: '%', libelle: 'des réponses vérifiées contenaient une erreur', nature: 'statistique', proportion: 0.4,
      texte: 'Une réponse fluide n’est pas une réponse exacte : vérifiez chaque fait.',
      source: { coursId: 12, passage: 'Dans l’exercice, 40 % des réponses vérifiées contenaient une erreur.' },
    },
  ],
}

const diapositivesSource = (plan) => plan.diapositives.filter((page) => !page.separateur)

const tousLesElements = (diapositive) => [
  ...diapositive.elements,
  ...(diapositive.scene ? diapositive.scene.fixe.elements : []),
]

describe('Atelier visuel v3', () => {
  it('intercale les séparateurs au début des parties utilisées, avec les mêmes numéros source en 16:9 et sur mobile', () => {
    const [demande, verification] = pilote.diapositives
    const complet = {
      ...pilote,
      scenario: { parties: [...pilote.scenario.parties, { id: 'inutile', titre: 'Sans contenu' }] },
      diapositives: [
        { modele: 'titre', titre: 'Ouverture', scenarioPartie: 'formuler' },
        demande,
        { modele: 'exercice', titre: 'Rédiger', scenarioPartie: 'formuler', consigne: 'Répondre au devis fictif.' },
        verification,
        { modele: 'question', titre: 'Quoi vérifier ?', scenarioPartie: 'verifier', question: 'Que faut-il confirmer ?', reponses: ['Le délai', 'Rien'] },
        { modele: 'fin', titre: 'Conclusion', scenarioPartie: 'verifier' },
      ],
    }
    const plan = planDiaporama(complet)
    const ordre = (pages) => pages.map(({ titre, numeroSource, separateur }) => [titre, numeroSource, separateur])
    expect(ordre(plan.diapositives)).toEqual([
      ['Ouverture', 1, false],
      ['Formuler', 2, true],
      [demande.titre, 2, false],
      ['Rédiger', 3, false],
      ['Vérifier', 4, true],
      [verification.titre, 4, false],
      ['Quoi vérifier ?', 5, false],
      ['Conclusion', 6, false],
    ])
    expect(ordre(planDiaporama(complet, { format: 'etroit' }).diapositives)).toEqual(ordre(plan.diapositives))
    expect(plan.diapositives.filter((page) => page.scene).map((page) => page.scene.type)).toEqual(['convergence', 'circuit'])
    expect(planDiaporama({ ...complet, theme: 'atelier_visuel' }).diapositives).toHaveLength(complet.diapositives.length)
  })

  it('conserve un séparateur rédigé, y compris si sa partie est héritée de la diapositive suivante', () => {
    const diaporama = {
      ...pilote,
      diapositives: [
        { modele: 'separateur', titre: 'Le devis', sousTitre: 'Cas fictif' },
        pilote.diapositives[0],
        { modele: 'separateur', titre: 'Avant envoi', scenarioPartie: 'verifier', numero: 8 },
        pilote.diapositives[1],
      ],
    }
    const plan = planDiaporama(diaporama)
    expect(plan.diapositives.map(({ titre }) => titre)).toEqual(diaporama.diapositives.map(({ titre }) => titre))
    expect(plan.diapositives.some(({ separateur }) => separateur)).toBe(false)
    expect(plan.diapositives[0].elements.find(({ id }) => id === 'partie-sous-titre').paragraphes[0].texte).toBe('Cas fictif')
    expect(plan.diapositives[2].elements.find(({ id }) => id === 'partie-numero').paragraphes[0].texte).toBe('02')
    expect(diaporama.diapositives[2].numero).toBe(8)
  })

  it('garde le fil de progression dans sa zone avec quatre longs titres de partie', () => {
    const parties = Array.from({ length: 4 }, (_, i) => ({ id: `partie-${i}`, titre: `Partie ${i} — ${'Décrire le contexte et vérifier la demande '.repeat(2).slice(0, 49)}` }))
    const diaporama = { ...pilote, scenario: { parties }, diapositives: [{ ...pilote.diapositives[0], scenarioPartie: parties[0].id }] }
    const [separateur] = planDiaporama(diaporama).diapositives
    expect(separateur.titre).toBe(parties[0].titre)
    for (const element of separateur.elements.filter(({ id }) => id.startsWith('progression-'))) {
      expect(element.x + element.w).toBeLessThan(ZONES.site.x)
    }
  })

  it('est un thème connu du registre', () => {
    expect(idTheme(ID)).toBe(ID)
  })

  it('compose le pilote TPE : convergence en quatre blocs, puis circuit en trois étapes', () => {
    const plan = planDiaporama(pilote)
    expect(plan.theme).toBe(ID)
    expect(plan.diapositives).toHaveLength(4)
    const [demande, verification] = diapositivesSource(plan)
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
    const [demande, verification] = diapositivesSource(planDiaporama(pilote))
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
    const [demande, verification] = diapositivesSource(planDiaporama(pilote))
    const texteDe = (d, id) => d.elements.find((e) => e.id === id)?.paragraphes[0].texte
    expect(texteDe(demande, 'progression-0')).toBe('Formuler')
    expect(demande.elements.find((e) => e.id === 'progression-0').gras).toBe(true)
    expect(verification.elements.find((e) => e.id === 'progression-1').gras).toBe(true)
    expect(texteDe(verification, 'numero')).toBe('04 / 04')
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
    const separateur1 = await zip.file('ppt/slides/slide1.xml').async('string')
    expect(separateur1).toContain('<a:t>Formuler</a:t>')
    const xml = await zip.file('ppt/slides/slide2.xml').async('string')
    expect(xml).toContain('Réponds à une demande de devis')
    expect(xml).toContain('wedgeRoundRectCallout')
    expect(xml).toContain('outerShdw')
    const separateur2 = await zip.file('ppt/slides/slide3.xml').async('string')
    expect(separateur2).toContain('<a:t>Vérifier</a:t>')
    const xml2 = await zip.file('ppt/slides/slide4.xml').async('string')
    expect(xml2).toContain('Tarif et délai à confirmer')
    expect(xml2).toContain('prstDash')
    expect(Object.keys(zip.files).some((f) => /media\/.*\.png$/.test(f))).toBe(true)
    if (process.env.EXPORT_PILOTE_V3) writeFileSync(process.env.EXPORT_PILOTE_V3, await pptx.write({ outputType: 'nodebuffer' }))
  })

  it('surligne le mot-clé du titre, à l\'identique et entre deux limites de mot, comme le serveur', () => {
    expect(segmentsTitre('Une règle simple pour relire', 'relire')).toEqual([
      { texte: 'Une règle simple pour ', motCle: false },
      { texte: 'relire', motCle: true },
    ])
    expect(segmentsTitre('Relire avant de lire', 'lire')).toEqual([
      { texte: 'Relire avant de ', motCle: false },
      { texte: 'lire', motCle: true },
    ])
    expect(segmentsTitre('Une règle (simple)', '(simple)')[1]).toEqual({ texte: '(simple)', motCle: true })
    expect(segmentsTitre('Relire', 'relire')).toBeNull()
    expect(segmentsTitre('Relire', '')).toBeNull()
    const [premiere] = diapositivesSource(planDiaporama(essaiChiffres))
    expect(premiere.titre).toBe('Une règle simple pour relire')
    expect(premiere.titreSegments.find((s) => s.motCle).texte).toBe('relire')
    // Mobile : le titre garde son surlignage
    expect(diapositivesSource(planDiaporama(essaiChiffres, { format: 'etroit' }))[0].titreSegments).toHaveLength(2)
    // Autre thème : pas de surlignage
    expect(planDiaporama({ ...essaiChiffres, theme: 'atelier_visuel' }).diapositives[0].titreSegments).toBeNull()
  })

  it('compose les chiffres clés : valeur, unité, libellé, nature, jauge et source dans la diapositive', () => {
    const [repere, statistique] = diapositivesSource(planDiaporama(essaiChiffres))
    const texteDe = (d, id) => d.elements.find((e) => e.id === id)?.paragraphes[0].texte
    expect(repere.modele).toBe('chiffres_cles')
    expect(repere.scene).toBeNull()
    expect(texteDe(repere, 'chiffre-valeur')).toBe('3')
    expect(texteDe(repere, 'chiffre-unite')).toBe('relectures')
    expect(texteDe(repere, 'chiffre-nature')).toBe('Repère pédagogique')
    expect(texteDe(repere, 'synthese')).toBe('Un repère de travail, pas une mesure.')
    expect(repere.elements.some((e) => e.id === 'chiffre-jauge')).toBe(false)
    // Sans texte ni source, la carte est centrée
    const carte = repere.elements.find((e) => e.id === 'chiffre-carte')
    expect(carte.x + carte.w / 2).toBeCloseTo(FORMAT.largeur / 2, 2)

    expect(texteDe(statistique, 'chiffre-nature')).toBe('Statistique sourcée')
    expect(texteDe(statistique, 'chiffre-source')).toContain('« Dans l’exercice, 40 % des réponses vérifiées contenaient une erreur. »')
    const jauge = statistique.elements.find((e) => e.id === 'chiffre-jauge')
    const rempli = statistique.elements.find((e) => e.id === 'chiffre-jauge-valeur')
    expect(rempli.w / jauge.w).toBeCloseTo(0.4, 2)
    // L'unité courte suit la valeur sur la même ligne
    const valeur = statistique.elements.find((e) => e.id === 'chiffre-valeur')
    const unite = statistique.elements.find((e) => e.id === 'chiffre-unite')
    expect(unite.y).toBe(valeur.y)
    expect(unite.x).toBeCloseTo(valeur.x + valeur.w, 5)
  })

  it('garde les chiffres clés lisibles, dans la diapositive et sur fonds clairs', () => {
    const clair = (hex) => {
      const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.6
    }
    const long = { ...essaiChiffres.diapositives[1], valeur: '1234567,89', unite: 'kilomètres' }
    for (const diapositive of diapositivesSource(planDiaporama({ ...essaiChiffres, diapositives: [...essaiChiffres.diapositives, long] }))) {
      for (const e of diapositive.elements) {
        if (e.type === 'texte' && e.role !== 'repere') expect(e.taille, e.id).toBeGreaterThanOrEqual(24)
        if (e.type === 'texte') expect(texteTient(e), `${e.id} tient dans sa zone`).toBe(true)
        if (e.type === 'forme' && e.w * e.h >= 0.05) expect(clair(e.fond), e.id).toBe(true)
        expect(e.x + e.w, e.id).toBeLessThanOrEqual(FORMAT.largeur + 0.001)
        expect(e.y + e.h, e.id).toBeLessThanOrEqual(FORMAT.hauteur + 0.001)
      }
      const valeur = diapositive.elements.find((e) => e.id === 'chiffre-valeur')
      const carte = diapositive.elements.find((e) => e.id === 'chiffre-carte')
      expect(valeur.x + valeur.w, 'valeur dans la carte').toBeLessThanOrEqual(carte.x + carte.w)
    }
  })

  it('replie les chiffres clés en phrases en lecture étroite et quand le contenu est incomplet', () => {
    const textes = (plan) => plan.diapositives.flatMap((d) => d.elements).filter((e) => e.type === 'texte').flatMap((e) => e.paragraphes.map((p) => p.texte))
    const etroit = planDiaporama(essaiChiffres, { format: 'etroit' })
    expect(diapositivesSource(etroit)[1].modele).toBe('notion')
    expect(textes(etroit)).toContain('40 % : des réponses vérifiées contenaient une erreur')
    expect(textes(etroit).some((t) => t.startsWith('Source : extrait d’un cours du site'))).toBe(true)
    const incomplet = planDiaporama({ ...essaiChiffres, diapositives: [{ modele: 'chiffres_cles', titre: 'Sans valeur', libelle: 'Libellé' }] })
    expect(incomplet.diapositives[0].modele).toBe('notion')
    // chiffres_cles est réservé à la v3 : ailleurs, le modèle inconnu reste une notion
    expect(planDiaporama({ ...essaiChiffres, theme: 'atelier_visuel' }).diapositives[0].modele).toBe('notion')
  })

  it('exporte le mot-clé surligné et les chiffres clés dans le .pptx', async () => {
    const pptx = await construirePptx(essaiChiffres)
    const zip = await JSZip.loadAsync(await pptx.write({ outputType: 'nodebuffer' }))
    const xml1 = await zip.file('ppt/slides/slide2.xml').async('string')
    expect(xml1).toMatch(/<a:highlight><a:srgbClr val="F6D9C4"\/><\/a:highlight>.*?<a:t>relire<\/a:t>/s)
    expect(xml1).toContain('<a:t>Une règle simple pour </a:t>')
    const xml2 = await zip.file('ppt/slides/slide4.xml').async('string')
    expect(xml2).toContain('<a:t>40</a:t>')
    expect(xml2).toContain('Statistique sourcée')
    if (process.env.EXPORT_CHIFFRES_V3) writeFileSync(process.env.EXPORT_CHIFFRES_V3, await pptx.write({ outputType: 'nodebuffer' }))
  })

  it('décrit les masques v3 avec le nom du site', () => {
    const decors = maitres(planDiaporama(pilote), 'Formation IA')
    expect(decors.CONTENU.fond).toBe('FBF7EE')
    expect(decors.CONTENU.elements[0].paragraphes[0].texte).toBe('Formation IA')
  })
})
