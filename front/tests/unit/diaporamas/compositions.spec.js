// @vitest-environment node
// Compositions de formation (regles/diaporamas/modeles.json) : tenue des textes aux longueurs maximales,
// cadre, taille minimale, chevauchements, ordre de lecture, contraste, démonstration en étapes et exports.
import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { planDiaporama } from '@/diaporamas/miseEnPage'
import { COMPOSITIONS, MODELES, rendusModele } from '@/diaporamas/modeles'
import { DISPOSITIONS_ATELIER } from '@/diaporamas/miseEnPageAtelier'
import { hauteurTexte, texteTient } from '@/diaporamas/mesure'
import { construirePptx, vuesDiapositive } from '@/diaporamas/construirePptx'
import { COULEURS as COULEURS_STANDARD, COULEURS_PUBLIC, ESPACE_PARAGRAPHE as ESPACE_STANDARD, TAILLE_MINIMALE_PROJETEE } from '@/diaporamas/theme'
import { COULEURS as COULEURS_ATELIER, ESPACE_PARAGRAPHE as ESPACE_ATELIER } from '@/diaporamas/themes/atelierVisuel'
import pilote from '@/diaporamas/pilote/copilot-fil-rouge.json'

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
const image = (alt) => ({ data: PNG, largeur: 1600, hauteur: 1000, alt, legende: 'Simulation fictive', source: 'Back-office', date: '2026-11-21' })
const IMAGES = { 7: image('Capture fictive'), 109: image('Outlook simulé'), 110: image('Teams simulé'), 111: image('Excel simulé'), 113: image('Word simulé') }

// Texte réaliste de longueur donnée : des mots français de longueur variable, sans espace final
const MOTS = 'Vérifier chaque information importante avant de diffuser une réponse rédigée par une intelligence artificielle générative'.split(' ')
const long = (n) => {
  let t = ''
  for (let i = 0; t.length < n; i += 1) t += (t ? ' ' : '') + MOTS[i % MOTS.length]
  return t.slice(0, n).trim()
}

const M = MODELES
const contenuMax = {
  exemple_commente: { titre: long(60), exemple: long(M.exemple_commente.textes.exemple), commentaires: [1, 2, 3].map(() => long(M.exemple_commente.listes.commentaires.longueur)) },
  exemple_commente_capture: { modele: 'exemple_commente', titre: long(60), exemple: long(M.exemple_commente.textesAvecCapture.exemple), capture: 7, commentaires: [1, 2, 3].map(() => long(50)) },
  avant_apres: { titre: long(60), avant: { libelle: long(24), texte: long(140) }, apres: { libelle: long(24), texte: long(140) }, explication: long(90) },
  demonstration: { titre: long(60), etapes: [1, 2, 3, 4].map(() => ({ action: long(45), verification: long(45) })) },
  demonstration_captures: { modele: 'demonstration', titre: long(60), etapes: [1, 2, 3, 4].map((n) => ({ action: long(45), verification: long(45), capture: n % 2 ? 7 : null })) },
  etude_de_cas: { titre: long(60), contexte: long(200), questions: [1, 2, 3].map(() => long(60)), duree: 10 },
  separateur: { titre: long(60), numero: 9, sousTitre: long(90) },
}

const diaporama = (theme, cle) => ({
  titre: 'Démonstration',
  audience: 'apprendre',
  theme,
  diapositives: [{ modele: contenuMax[cle].modele ?? cle, notes: 'Notes', ...contenuMax[cle] }],
})

const CAS = [
  ['atelier_visuel', 'large', ESPACE_ATELIER],
  ['atelier_visuel', 'etroit', ESPACE_ATELIER],
  ['standard', 'large', ESPACE_STANDARD],
]

// Toutes les vues d'une diapositive : éléments fixes plus chaque étape et la vue d'ensemble d'une démonstration
const vues = (d) => (d.scene
  ? [...d.scene.etapes.map((e) => [...d.elements, ...e.elements]), [...d.elements, ...d.scene.fixe.elements]]
  : [d.elements])

const chevauche = (a, b) => Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 0.02 && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 0.02

describe('compositions : catalogue partagé', () => {
  it('a une disposition pour chaque modèle du catalogue, dans les deux thèmes', () => {
    expect(COMPOSITIONS).toEqual(['exemple_commente', 'avant_apres', 'demonstration', 'etude_de_cas', 'separateur'])
    Object.keys(MODELES).forEach((modele) => expect(DISPOSITIONS_ATELIER[modele], modele).toBeTypeOf('function'))
    for (const theme of ['standard', 'atelier_visuel']) {
      const plan = planDiaporama({ theme, diapositives: COMPOSITIONS.map((modele) => ({ modele, ...contenuMax[modele] })) })
      expect(plan.diapositives.map((d) => d.modele)).toEqual(COMPOSITIONS)
    }
  })

  it('distingue l\'animation web des étapes fixes du .pptx', () => {
    expect(rendusModele('demonstration').pptx).toMatch(/aucune animation PowerPoint native/)
    expect(rendusModele('demonstration').web).toMatch(/une à une/)
    expect(rendusModele('notion').pptx).toBe('une diapositive modifiable')
  })
})

describe.each(CAS)('compositions aux longueurs maximales : %s %s', (theme, format, espace) => {
  for (const cle of Object.keys(contenuMax)) {
    it(`${cle} : textes qui tiennent, dans le cadre, 24 points, sans chevauchement`, () => {
      const plan = planDiaporama(diaporama(theme, cle), { images: IMAGES, format })
      const d = plan.diapositives[0]
      expect(d.elements.length + (d.scene ? d.scene.etapes.length : 0)).toBeGreaterThan(0)
      for (const elements of vues(d)) {
        const textes = elements.filter((e) => e.type === 'texte')
        for (const t of textes) {
          const besoin = hauteurTexte(t.paragraphes, t.w, t.taille, espace)
          expect(texteTient(t, espace), `${cle} « ${t.paragraphes[0]?.texte.slice(0, 30)} » w=${t.w.toFixed(2)} h=${t.h.toFixed(2)} besoin=${besoin.toFixed(2)}`).toBe(true)
          if (t.role !== 'repere') expect(t.taille, t.paragraphes[0]?.texte).toBeGreaterThanOrEqual(TAILLE_MINIMALE_PROJETEE)
        }
        for (const e of elements) {
          expect(e.x, `${cle} x`).toBeGreaterThanOrEqual(0)
          expect(e.y, `${cle} y`).toBeGreaterThanOrEqual(0)
          expect(e.x + e.w, `${cle} droite`).toBeLessThanOrEqual(plan.format.largeur + 0.001)
          expect(e.y + e.h, `${cle} bas`).toBeLessThanOrEqual(plan.format.hauteur + 0.001)
        }
        // Les blocs de texte ne se recouvrent pas (un numéro posé sur sa pastille n'est pas un texte superposé)
        for (let i = 0; i < textes.length; i += 1) {
          for (let k = i + 1; k < textes.length; k += 1) {
            expect(chevauche(textes[i], textes[k]), `${cle} : « ${textes[i].paragraphes[0].texte.slice(0, 20)} » et « ${textes[k].paragraphes[0].texte.slice(0, 20)} »`).toBe(false)
          }
        }
        if (d.scene?.legende) {
          for (const t of textes) expect(chevauche(t, d.scene.legende), `${cle} légende`).toBe(false)
        }
      }
    })
  }
})

describe('compositions : ordre de lecture et repères écrits', () => {
  const ordre = (d) => vues(d).at(-1).filter((e) => e.type === 'texte').map((e) => e.paragraphes.map((p) => p.texte).join(' '))

  it('lit l\'exemple avant les commentaires, et la situation avant les questions', () => {
    const [exemple] = planDiaporama({ theme: 'atelier_visuel', diapositives: [{ modele: 'exemple_commente', titre: 'T', exemple: 'Exemple montré', commentaires: ['Premier commentaire'] }] }).diapositives
    const textes = ordre(exemple)
    expect(textes.findIndex((t) => t.includes('Exemple montré'))).toBeLessThan(textes.indexOf('Premier commentaire'))
    const [cas] = planDiaporama({ theme: 'standard', diapositives: [{ modele: 'etude_de_cas', titre: 'T', contexte: 'Situation fictive', questions: ['Question ?'] }] }).diapositives
    const textesCas = ordre(cas)
    expect(textesCas.indexOf('Situation fictive')).toBeLessThan(textesCas.indexOf('Question ?'))
  })

  it('écrit « Avant » et « Après » : l\'information ne dépend pas de la couleur', () => {
    for (const theme of ['standard', 'atelier_visuel']) {
      const [d] = planDiaporama({ theme, diapositives: [{ modele: 'avant_apres', titre: 'T', avant: { texte: 'Version A' }, apres: { libelle: 'corrigé', texte: 'Version B' } }] }).diapositives
      const textes = ordre(d)
      expect(textes.indexOf('Avant')).toBeGreaterThanOrEqual(0)
      expect(textes.indexOf('Après · corrigé')).toBeGreaterThan(textes.indexOf('Version A'))
    }
  })

  it('place le séparateur sur le masque d\'ouverture, avec le numéro de partie écrit', () => {
    const [d] = planDiaporama({ theme: 'atelier_visuel', diapositives: [{ modele: 'separateur', titre: 'Mardi dans Teams', numero: 2 }] }).diapositives
    expect(d.maitre).toBe('COUVERTURE')
    expect(ordre(d)).toContain('PARTIE 2')
  })

  it('signale un visuel absent au lieu d\'en inventer un', () => {
    const [d] = planDiaporama({ theme: 'atelier_visuel', diapositives: [{ modele: 'exemple_commente', titre: 'T', exemple: 'E', capture: 999, commentaires: ['C'] }] }, { images: {} }).diapositives
    expect(d.elements.some((e) => e.type === 'image')).toBe(false)
    expect(ordre(d).some((t) => t.includes('Capture à ajouter (n° 999)'))).toBe(true)
  })
})

describe('compositions : contraste des jetons du thème standard', () => {
  const luminance = (hex) => {
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  const contraste = (a, b) => {
    const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x)
    return (l1 + 0.05) / (l2 + 0.05)
  }

  it('garde 4,5:1 entre le texte et chaque fond des compositions', () => {
    const fonds = [COULEURS_STANDARD.carte, COULEURS_STANDARD.aFaire.fond, ...Object.values(COULEURS_PUBLIC).flatMap((c) => [c.pastel, c.accent])]
    fonds.forEach((fond) => expect(contraste(COULEURS_STANDARD.texte, fond), `#${fond}`).toBeGreaterThanOrEqual(4.5))
    ;[COULEURS_ATELIER.schema, COULEURS_ATELIER.synthese, COULEURS_ATELIER.actif, COULEURS_ATELIER.picto].forEach((fond) => {
      expect(contraste(COULEURS_ATELIER.texte, fond), `#${fond}`).toBeGreaterThanOrEqual(4.5)
    })
  })
})

describe('démonstration en étapes', () => {
  const contenu = {
    theme: 'atelier_visuel',
    diapositives: [{ modele: 'demonstration', titre: 'Démo', notes: 'Notes de la démonstration', etapes: [
      { action: 'Ouvrir le fil', capture: 109, verification: 'Dossier reçu' },
      { action: 'Demander un résumé' },
      { action: 'Préparer la réponse', verification: 'Aucune promesse' },
    ] }],
  }

  it('révèle une étape à la fois, puis la vue d\'ensemble', () => {
    const [d] = planDiaporama(contenu, { images: IMAGES }).diapositives
    expect(d.scene.genre).toBe('demonstration')
    expect(d.scene.etapes).toHaveLength(3)
    const cartes = (elements) => elements.filter((e) => e.id?.endsWith('-texte') && e.id.startsWith('demo-')).map((e) => e.paragraphes[0].texte)
    expect(cartes(d.scene.etapes[0].elements)).toEqual(['Ouvrir le fil'])
    expect(cartes(d.scene.etapes[2].elements)).toEqual(['Ouvrir le fil', 'Demander un résumé', 'Préparer la réponse'])
    expect(cartes(d.scene.fixe.elements)).toHaveLength(3)
    expect(d.scene.etapes[0].court).toBe('À vérifier : Dossier reçu')
    expect(d.scene.etapes[0].alt).toBe('Outlook simulé')
    // La capture de l'étape 1 reste visible tant qu'aucune autre ne la remplace
    expect(d.scene.etapes[1].elements.some((e) => e.type === 'image')).toBe(true)
    // Chaque élément animé a un identifiant stable
    d.scene.etapes.forEach((e) => e.elements.forEach((el) => expect(el.id, JSON.stringify(el).slice(0, 60)).toBeTruthy()))
  })

  it('donne une diapositive fixe par étape dans le .pptx, sans parler d\'animation', () => {
    const [d] = planDiaporama(contenu, { images: IMAGES }).diapositives
    const v = vuesDiapositive(d)
    expect(v).toHaveLength(3)
    expect(v[0].notes).toMatch(/^Étape 1\/3 : Ouvrir le fil — à vérifier : Dossier reçu/)
    expect(v[0].notes).toContain('Démonstration : Démonstration en 3 étapes')
    expect(v[2].notes).toContain('Notes de la démonstration')
    v.forEach((vue) => expect(vue.notes).not.toMatch(/animation/i))
  })
})

describe('pilote « Copilot au fil d\'une semaine de travail »', () => {
  const plan = planDiaporama(pilote, { images: IMAGES })

  it('utilise les cinq compositions, relie chaque diapositive au scénario et varie les modèles', () => {
    const modeles = plan.diapositives.map((d) => d.modele)
    COMPOSITIONS.forEach((c) => expect(modeles, c).toContain(c))
    const parties = pilote.scenario.parties.map((p) => p.id)
    pilote.diapositives.forEach((d, i) => expect(parties, `diapositive ${i + 1}`).toContain(d.scenarioPartie))
    parties.forEach((id) => expect(pilote.diapositives.some((d) => d.scenarioPartie === id), id).toBe(true))
    // Jamais plus de trois diapositives de contenu du même modèle à la suite
    const contenu = modeles.filter((m) => !['titre', 'fin', 'separateur'].includes(m))
    contenu.forEach((m, i) => expect(contenu.length - i >= 4 && contenu.slice(i, i + 4).every((x) => x === m), `${m} répété`).toBe(false))
  })

  it('tient en 16:9 et en lecture étroite', () => {
    for (const format of ['large', 'etroit']) {
      for (const d of planDiaporama(pilote, { images: IMAGES, format }).diapositives) {
        for (const elements of vues(d)) {
          for (const t of elements.filter((e) => e.type === 'texte')) {
            expect(texteTient(t, ESPACE_ATELIER), `${format} ${d.titre} « ${t.paragraphes[0]?.texte.slice(0, 30)} »`).toBe(true)
          }
        }
      }
    }
  })

  it('produit un vrai fichier PowerPoint : une diapositive par entrée, une par étape de démonstration', async () => {
    const attendues = plan.diapositives.reduce((n, d) => n + vuesDiapositive(d).length, 0)
    // Deux démonstrations de 3 étapes (+4), et la scène sas_validation, en étapes selon le catalogue
    expect(attendues).toBeGreaterThanOrEqual(pilote.diapositives.length + 4)
    const pptx = await construirePptx(pilote, { images: IMAGES })
    const zip = await JSZip.loadAsync(await pptx.write({ outputType: 'nodebuffer' }))
    const diapos = Object.keys(zip.files).filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f))
    expect(diapos).toHaveLength(attendues)
    const notes = (await Promise.all(Object.keys(zip.files).filter((f) => /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(f)).map((f) => zip.file(f).async('string')))).join('')
    expect(notes).toContain('Étape 2/3')
    expect(notes).not.toMatch(/animation PowerPoint/)
  })
})
