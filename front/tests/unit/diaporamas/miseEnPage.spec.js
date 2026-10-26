import { describe, expect, it } from 'vitest'
import { hauteurTexte, nomFichier, planDiaporama } from '@/diaporamas/miseEnPage'
import { MODELES } from '@/diaporamas/modeles'
import { FORMAT, LICENCE, TAILLE_MINIMALE_PROJETEE } from '@/diaporamas/theme'
import demo from './demo.json'

const IMAGE = { data: 'data:image/png;base64,AAAA', largeur: 1600, hauteur: 1000, alt: 'Conversation fictive', source: 'Assistant IA', date: '26/10/2026' }

const textes = (diapositive) => diapositive.elements.filter((element) => element.type === 'texte')

describe('planDiaporama', () => {
  const plan = planDiaporama(demo, { images: { 42: IMAGE } })

  it('couvre chaque modèle de diapositive', () => {
    expect(new Set(plan.diapositives.map((d) => d.modele))).toEqual(new Set(Object.keys(MODELES)))
  })

  it('ne produit aucune diapositive vide ni sans titre', () => {
    for (const diapositive of plan.diapositives) {
      expect(diapositive.titre, diapositive.modele).not.toBe('')
      expect(textes(diapositive).length, diapositive.modele).toBeGreaterThan(0)
      for (const element of textes(diapositive)) {
        expect(element.paragraphes.every((p) => p.texte !== ''), diapositive.modele).toBe(true)
      }
    }
  })

  it('garde le texte projeté à 24 points au moins (DIA-05)', () => {
    for (const diapositive of plan.diapositives) {
      for (const element of textes(diapositive).filter((e) => e.role !== 'repere')) {
        expect(element.taille, `${diapositive.modele} : ${element.paragraphes[0].texte}`).toBeGreaterThanOrEqual(TAILLE_MINIMALE_PROJETEE)
      }
    }
  })

  it('place tous les éléments dans la diapositive', () => {
    for (const diapositive of plan.diapositives) {
      for (const element of diapositive.elements.filter((e) => e.forme !== 'ellipse')) {
        expect(element.x, diapositive.modele).toBeGreaterThanOrEqual(0)
        expect(element.y, diapositive.modele).toBeGreaterThanOrEqual(0)
        expect(element.x + element.w, diapositive.modele).toBeLessThanOrEqual(FORMAT.largeur + 0.001)
        expect(element.y + element.h, diapositive.modele).toBeLessThanOrEqual(FORMAT.hauteur + 0.001)
      }
    }
  })

  it('reprend les notes de présentation', () => {
    const question = plan.diapositives.find((d) => d.modele === 'question')
    expect(question.notes).toContain('La bonne réponse est la deuxième')
    // La réponse n'est jamais à l'écran
    expect(textes(question).some((e) => e.paragraphes.some((p) => p.texte.includes('bonne réponse')))).toBe(false)
  })

  it('numérote les étapes', () => {
    const etapes = plan.diapositives.find((d) => d.modele === 'etapes')
    const numeros = textes(etapes).filter((e) => e.align === 'center').map((e) => e.paragraphes[0].texte)
    expect(numeros).toEqual(['1', '2', '3', '4'])
  })

  it('insère la capture avec son texte alternatif, sans la déformer', () => {
    const image = plan.diapositives.find((d) => d.modele === 'capture').elements.find((e) => e.type === 'image')
    expect(image.alt).toBe('Conversation fictive')
    expect(image.w / image.h).toBeCloseTo(1600 / 1000, 5)
  })

  it('remplace une capture absente par un cadre explicite', () => {
    const sansImage = planDiaporama(demo).diapositives.find((d) => d.modele === 'capture')
    expect(sansImage.elements.some((e) => e.type === 'image')).toBe(false)
    expect(textes(sansImage).some((e) => e.paragraphes[0].texte === 'Capture à ajouter (n° 42)')).toBe(true)
  })

  it('termine par la licence et des liens web seulement', () => {
    const fin = planDiaporama({
      titre: 'Essai',
      diapositives: [{ modele: 'fin', lien: 'javascript:alert(1)', sources: [{ libelle: 'Page', url: 'ftp://exemple.test' }] }],
    }).diapositives[0]
    const paragraphes = textes(fin).flatMap((e) => e.paragraphes)
    expect(paragraphes.some((p) => p.texte === LICENCE)).toBe(true)
    expect(paragraphes.every((p) => p.lien === null)).toBe(true)
    expect(paragraphes.some((p) => p.texte.includes('javascript'))).toBe(false)
  })

  it('affiche un modèle inconnu comme une notion, avec un titre', () => {
    const [diapositive] = planDiaporama({ titre: 'Essai', diapositives: [{ modele: 'graphique', points: ['Un point'] }] }).diapositives
    expect(diapositive.modele).toBe('notion')
    expect(diapositive.titre).toBe('Essai')
  })

  it('prend la couleur du public', () => {
    expect(planDiaporama({ ...demo, audience: 'former' }).audience).toBe('former')
    expect(planDiaporama({ ...demo, audience: 'autre' }).audience).toBe('apprendre')
  })
})

describe('hauteurTexte', () => {
  it('grandit avec le texte et le nombre de paragraphes', () => {
    const court = hauteurTexte([{ texte: 'Court' }], 10, 24)
    const long = hauteurTexte([{ texte: 'Un texte bien plus long '.repeat(6) }], 10, 24)
    const deux = hauteurTexte([{ texte: 'Court' }, { texte: 'Court' }], 10, 24)
    expect(long).toBeGreaterThan(court)
    expect(deux).toBeGreaterThan(court)
  })
})

describe('nomFichier', () => {
  it('donne un nom de fichier sans accent ni espace', () => {
    expect(nomFichier('Bien écrire une consigne !')).toBe('bien-ecrire-une-consigne.pptx')
    expect(nomFichier('', 'pdf')).toBe('diaporama.pdf')
  })
})
