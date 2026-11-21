import { describe, expect, it } from 'vitest'
import { CATALOGUE, validerScene } from '@/diaporamas/scenes/valider'
import { SCENES, planifierScene, variantesDe } from '@/diaporamas/scenes'
import { planDiaporama } from '@/diaporamas/miseEnPage'
import { hauteurTexte, texteTient } from '@/diaporamas/mesure'
import { COULEURS, COULEURS_SCENE, ESPACE_PARAGRAPHE, FORMATS } from '@/diaporamas/themes/atelierVisuel'
import pilote from '@/diaporamas/pilote/automatiser.json'
import galerie from '@/diaporamas/pilote/scenes.json'
import demo from './demo.json'
import invalides from '@regles/scenes/exemples/invalides.json'
import valides from '@regles/scenes/exemples/valides.json'

const ZONE = { x: 1, y: 2.05, w: 11.333, h: 2.63 }
const options = { zone: ZONE, couleurs: COULEURS_SCENE }
const exemple = (type) => CATALOGUE.scenes.find((s) => s.id === type).exemple
const elementsDe = (etat, id) => etat.elements.find((e) => e.id === id)
const texteDe = (etat, id) => elementsDe(etat, id)?.paragraphes.map((p) => p.texte).join(' ')

// Texte réaliste d'une longueur donnée (mots de 3 à 9 lettres), pour éprouver la mise en page
const texteDeLongueur = (n) => {
  const mots = ['données', 'calcul', 'sortie', 'fiche', 'vérifier', 'résultat', 'atelier', 'contrôle', 'étape']
  let t = ''
  let i = 0
  while (t.length < n) {
    t = t ? `${t} ${mots[i % mots.length]}` : mots[0]
    i += 1
  }
  return t.slice(0, n).trim()
}

// Scènes aux limites maximales du catalogue (nombre d'éléments et longueur des textes)
const MAXIMALES = {
  escalier: {
    type: 'escalier', version: 1, repere: 2,
    marches: Array.from({ length: 5 }, () => ({ libelle: texteDeLongueur(22) })),
    description: texteDeLongueur(300),
  },
  chaine_traitement: {
    type: 'chaine_traitement', version: 1,
    fiche: { libelle: texteDeLongueur(16), valeur: texteDeLongueur(24) },
    blocs: Array.from({ length: 3 }, () => ({ libelle: texteDeLongueur(20) })),
    transformation: { bloc: 2, valeur: texteDeLongueur(24) },
    description: texteDeLongueur(300),
  },
  aiguillage: {
    type: 'aiguillage', version: 1, condition: texteDeLongueur(48), fiche: texteDeLongueur(16),
    branches: [{ id: 'a', libelle: texteDeLongueur(22) }, { id: 'b', libelle: texteDeLongueur(22) }],
    brancheSuivie: 'b', description: texteDeLongueur(300),
  },
  entonnoir: {
    type: 'entonnoir', version: 1, critere: texteDeLongueur(48),
    elements: [true, false, true, false].map((retenu) => ({ libelle: texteDeLongueur(18), retenu })),
    description: texteDeLongueur(300),
  },
  loupe: {
    type: 'loupe', version: 1,
    support: { libelle: texteDeLongueur(32), lignes: Array.from({ length: 4 }, () => texteDeLongueur(34)) },
    zone: 3, detail: { libelle: texteDeLongueur(24), legende: texteDeLongueur(90) },
    description: texteDeLongueur(300),
  },
  sas_validation: {
    type: 'sas_validation', version: 1, fiche: texteDeLongueur(12), action: texteDeLongueur(30), question: texteDeLongueur(40),
    decision: 'refus', suiteAccord: texteDeLongueur(40), suiteRefus: texteDeLongueur(40), description: texteDeLongueur(300),
  },
}

const chevauchent = (a, b) => Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 0.02
  && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 0.02

describe('catalogue des scènes', () => {
  it('décrit les six scènes avec usage, cas favorables, risques, étapes et rendus', () => {
    expect(CATALOGUE.version).toBe(1)
    expect(CATALOGUE.scenes.map((s) => s.id)).toEqual(['escalier', 'chaine_traitement', 'aiguillage', 'entonnoir', 'loupe', 'sas_validation'])
    CATALOGUE.scenes.forEach((s) => {
      expect(s.usage).toBeTruthy()
      expect(s.convient.length).toBeGreaterThan(0)
      expect(s.peutInduireEnErreur.length).toBeGreaterThan(0)
      expect(s.etapes.length).toBeGreaterThan(0)
      expect(['fixe', 'etapes']).toContain(s.rendus.pptx)
      expect(Object.keys(SCENES)).toContain(s.id)
    })
  })

  it('accepte l\'exemple de chaque scène, la galerie et le pilote', () => {
    CATALOGUE.scenes.forEach((s) => expect(validerScene(s.exemple), s.id).toEqual([]))
    ;[...galerie.diapositives, ...pilote.diapositives].filter((d) => d.scene)
      .forEach((d) => expect(validerScene(d.scene), d.titre).toEqual([]))
    Object.entries(MAXIMALES).forEach(([type, scene]) => expect(validerScene(scene), type).toEqual([]))
  })

  it.each([
    ['type inconnu', { ...exemple('loupe'), type: 'carrousel' }, 'SCENE_INCONNUE'],
    ['version inconnue', { ...exemple('loupe'), version: 2 }, 'SCENE_INCONNUE'],
    ['champ inconnu (cible non prévue)', { ...exemple('loupe'), couleur: 'rouge' }, 'SCENE_CHAMP_INCONNU'],
    ['champ manquant', { ...exemple('aiguillage'), condition: undefined }, 'SCENE_CHAMP_MANQUANT'],
    ['balise HTML', { ...exemple('aiguillage'), condition: '<script>alert(1)</script>' }, 'SCENE_HTML'],
    ['lien javascript:', { ...exemple('sas_validation'), action: 'javascript:alert(1)' }, 'SCENE_HTML'],
    ['texte trop long', { ...exemple('aiguillage'), condition: texteDeLongueur(49) }, 'SCENE_LIMITE'],
    ['trop d\'éléments', { ...exemple('escalier'), marches: Array.from({ length: 6 }, () => ({ libelle: 'Étape' })) }, 'SCENE_LIMITE'],
    ['branche suivie inconnue', { ...exemple('aiguillage'), brancheSuivie: 'ailleurs' }, 'SCENE_REFERENCE'],
    ['bloc de transformation absent', { ...exemple('chaine_traitement'), transformation: { bloc: 3, valeur: '5' } }, 'SCENE_REFERENCE'],
    ['ligne observée absente', { ...exemple('loupe'), zone: 2 }, 'SCENE_REFERENCE'],
    ['entonnoir sans élément écarté', { ...exemple('entonnoir'), elements: exemple('entonnoir').elements.map((e) => ({ ...e, retenu: true })) }, 'SCENE_REFERENCE'],
    ['décision inconnue', { ...exemple('sas_validation'), decision: 'peut-être' }, 'SCENE_TYPE'],
    ['description trop courte', { ...exemple('loupe'), description: 'Une loupe.' }, 'SCENE_LIMITE'],
  ])('refuse une scène invalide : %s', (_, scene, code) => {
    expect(validerScene(scene).map((e) => e.code)).toContain(code)
  })

  // Jeu d'exemples partagé avec PHPUnit (tests/Service/Redaction/SceneValidatorTest.php)
  it.each(invalides.cas.map((c) => [c.cas, c.scene, c.attendu]))('exemple partagé refusé : %s', (_, scene, code) => {
    expect(validerScene(scene).map((e) => e.code)).toContain(code)
  })
  it.each(valides.cas.map((c) => [c.cas, c.scene]))('exemple partagé accepté : %s', (_, scene) => {
    expect(validerScene(scene)).toEqual([])
  })
})

describe('moteur des scènes', () => {
  it('reconstruit les mêmes étapes à partir des mêmes données', () => {
    CATALOGUE.scenes.forEach((s) => {
      const a = planifierScene(s.exemple, options)
      const b = planifierScene(structuredClone(s.exemple), options)
      expect(JSON.stringify(a)).toBe(JSON.stringify(b))
    })
  })

  it('donne à chaque primitive un identifiant unique dans son étape', () => {
    CATALOGUE.scenes.forEach((s) => {
      planifierScene(s.exemple, options).etapes.forEach((etape) => {
        const ids = etape.elements.map((e) => e.id)
        expect(new Set(ids).size, s.id).toBe(ids.length)
      })
    })
  })

  it('fournit un équivalent fixe : la composition complète et les légendes numérotées', () => {
    CATALOGUE.scenes.forEach((s) => {
      const plan = planifierScene(s.exemple, options)
      expect(plan.fixe.elements).toEqual(plan.etapes.at(-1).elements)
      expect(plan.fixe.legendes).toHaveLength(plan.etapes.length)
      plan.fixe.legendes.forEach((legende, i) => expect(legende.startsWith(`${i + 1}. `)).toBe(true))
      expect(plan.description.length).toBeGreaterThanOrEqual(40)
    })
  })

  it('escalier : les marches apparaissent une à une et le repère avance', () => {
    const { etapes } = planifierScene(exemple('escalier'), options)
    // 3 marches, puis le retour du repère sur la marche 2
    expect(etapes).toHaveLength(4)
    expect(etapes.map((e) => e.elements.filter((x) => x.id.match(/^marche-\d$/)).length)).toEqual([1, 2, 3, 3])
    expect(elementsDe(etapes[2], 'marche-2').epaisseur).toBe(3)
    expect(elementsDe(etapes[3], 'marche-1').epaisseur).toBe(3)
    expect(etapes[3].legende).toContain('Vous êtes ici')
  })

  it('chaîne de traitement : la fiche suit les blocs et sa valeur change au bloc de transformation', () => {
    const { etapes } = planifierScene(exemple('chaine_traitement'), options)
    expect(etapes).toHaveLength(3)
    const positions = etapes.map((e) => elementsDe(e, 'fiche').x)
    expect(positions[0]).toBeLessThan(positions[1])
    expect(positions[1]).toBeLessThan(positions[2])
    expect(texteDe(etapes[0], 'fiche-texte')).toBe('places 8 · inscrits 3')
    expect(texteDe(etapes[0], 'fiche-libelle')).toBe('Fiche d\'atelier')
    expect(texteDe(etapes[1], 'fiche-texte')).toContain('places_restantes : 5')
    expect(etapes[1].legende).toContain('transforme la valeur')
  })

  it('aiguillage : la condition s\'affiche, puis la fiche suit la branche choisie (les deux branches)', () => {
    const scene = exemple('aiguillage')
    const complet = planifierScene(scene, options).etapes
    const disponible = planifierScene(scene, { ...options, variante: { brancheSuivie: 'disponible' } }).etapes
    expect(texteDe(complet[0], 'condition-texte')).toBe('Condition ?')
    expect(texteDe(complet[1], 'condition-texte')).toBe('Reste-t-il une place ?')
    expect(texteDe(complet[2], 'branche-1-texte')).toBe('✓ Liste d\'attente')
    expect(texteDe(complet[2], 'branche-0-texte')).toBe('✗ Proposer l\'inscription')
    expect(elementsDe(complet[2], 'branche-0').pointille).toBe(true)
    expect(elementsDe(complet[2], 'lien-1').pointille).toBe(false)
    expect(texteDe(disponible[2], 'branche-0-texte')).toBe('✓ Proposer l\'inscription')
    // La fiche finit dans la branche suivie
    const fiche = elementsDe(disponible[2], 'fiche')
    const branche = elementsDe(disponible[2], 'branche-0')
    expect(fiche.y).toBeGreaterThanOrEqual(branche.y)
    expect(fiche.y + fiche.h).toBeLessThanOrEqual(branche.y + branche.h + 0.001)
    expect(variantesDe(scene).map((v) => v.valeur)).toEqual(['disponible', 'complet'])
  })

  it('entonnoir : le critère apparaît, puis les retenus passent à droite et les écartés sont marqués', () => {
    const { etapes } = planifierScene(exemple('entonnoir'), options)
    expect(etapes).toHaveLength(3)
    expect(elementsDe(etapes[0], 'critere')).toBeUndefined()
    expect(elementsDe(etapes[1], 'critere').forme).toBe('trapeze')
    expect(texteDe(etapes[2], 'element-0-texte')).toBe('✓ full_name')
    expect(texteDe(etapes[2], 'element-2-texte')).toBe('✗ forks_count')
    expect(elementsDe(etapes[2], 'element-0').x).toBeGreaterThan(elementsDe(etapes[0], 'element-0').x)
    expect(elementsDe(etapes[2], 'element-2').x).toBe(elementsDe(etapes[0], 'element-2').x)
  })

  it('loupe : une zone est mise en évidence, puis le détail légendé apparaît', () => {
    const { etapes } = planifierScene(exemple('loupe'), options)
    expect(elementsDe(etapes[0], 'loupe')).toBeUndefined()
    expect(elementsDe(etapes[1], 'loupe').y).toBeCloseTo(elementsDe(etapes[1], 'ligne-1').y - 0.02)
    expect(texteDe(etapes[2], 'detail-legende')).toContain('Number')
  })

  it('sas : la fiche s\'arrête ; l\'accord permet la suite, le refus laisse l\'action bloquée', () => {
    const scene = exemple('sas_validation')
    const refus = planifierScene(scene, options).etapes
    const accord = planifierScene(scene, { ...options, variante: { decision: 'accord' } }).etapes
    const x = (etapes, i) => elementsDe(etapes[i], 'fiche').x
    expect(x(refus, 1)).toBeGreaterThan(x(refus, 0))
    expect(x(refus, 2)).toBe(x(refus, 1))
    expect(texteDe(refus[2], 'action-texte')).toBe('✗ Envoyer le message')
    expect(elementsDe(refus[2], 'action').pointille).toBe(true)
    expect(refus[2].legende).toContain('bloquée')
    expect(x(accord, 2)).toBeGreaterThan(x(accord, 1))
    expect(texteDe(accord[2], 'action-texte')).toBe('✓ Envoyer le message')
    expect(texteDe(accord[2], 'issue-texte')).toBe('Envoi simulé, aucun message réel')
  })
})

describe('contrôles de rendu sans navigateur (limites maximales)', () => {
  const diaporamaAvec = (scene) => ({
    theme: 'atelier_visuel',
    titre: 'Essai',
    diapositives: [{ modele: 'notion', titre: texteDeLongueur(60), points: [texteDeLongueur(44), texteDeLongueur(44), texteDeLongueur(44)], scene }],
  })

  it.each(Object.keys(MAXIMALES).flatMap((type) => [[type, 'large'], [type, 'etroit']]))(
    '%s (%s) : chaque texte tient dans sa zone, sans chevauchement ni sortie de la diapositive',
    (type, format) => {
      const plan = planDiaporama(diaporamaAvec(MAXIMALES[type]), { format })
      const diapo = plan.diapositives[0]
      const variantes = [{}, ...variantesDe(MAXIMALES[type]).map((v) => ({ [v.cle]: v.valeur }))]
      variantes.forEach((variante) => {
        const scene = planDiaporama(diaporamaAvec(MAXIMALES[type]), { format, variantes: { 0: variante } }).diapositives[0].scene
        scene.etapes.forEach((etape, n) => {
          // Légende projetée : une ligne en projection, deux au plus en lecture étroite
          const legende = { ...scene.legende, taille: 24, paragraphes: [{ texte: `${n + 1}/${scene.etapes.length} · ${etape.court}` }] }
          expect(texteTient(legende, ESPACE_PARAGRAPHE), `${type} ${format} légende « ${etape.court} »`).toBe(true)
          const textes = [...diapo.elements, ...etape.elements].filter((e) => e.type === 'texte')
          textes.forEach((t) => {
            expect(texteTient(t, ESPACE_PARAGRAPHE), `${type} ${format} étape ${n} ${t.id} w=${t.w.toFixed(2)} h=${t.h.toFixed(2)} besoin=${hauteurTexte(t.paragraphes, t.w, t.taille, ESPACE_PARAGRAPHE).toFixed(2)} : « ${t.paragraphes[0]?.texte} »`).toBe(true)
            expect(t.taille >= 24 || t.role === 'repere', `${type} : taille ${t.taille}`).toBe(true)
          })
          for (let i = 0; i < textes.length; i += 1) {
            for (let j = i + 1; j < textes.length; j += 1) {
              expect(chevauchent(textes[i], textes[j]), `${type} étape ${n} : ${textes[i].id ?? i} / ${textes[j].id ?? j}`).toBe(false)
            }
          }
          etape.elements.filter((e) => e.type !== 'ligne').forEach((e) => {
            expect(e.x >= diapo.scene.zone.x - 0.01 && e.x + e.w <= diapo.scene.zone.x + diapo.scene.zone.w + 0.01, `${type} : ${e.id} déborde en largeur`).toBe(true)
            expect(e.y >= diapo.scene.zone.y - 0.01 && e.y + e.h <= diapo.scene.zone.y + diapo.scene.zone.h + 0.01, `${type} : ${e.id} déborde en hauteur`).toBe(true)
          })
        })
      })
      expect(plan.format).toEqual({ largeur: FORMATS[format].largeur, hauteur: FORMATS[format].hauteur })
    },
  )

  // WCAG 2.2 : 4,5:1 pour le texte normal
  const luminance = (hex) => {
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  const contraste = (a, b) => {
    const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x)
    return (l1 + 0.05) / (l2 + 0.05)
  }

  it('garde un contraste suffisant entre le texte et chaque fond du thème Atelier visuel', () => {
    const fonds = [COULEURS.fond, COULEURS.schema, COULEURS.picto, COULEURS.synthese, COULEURS.actif, COULEURS.attenue, COULEURS.fiche]
    fonds.forEach((fond) => {
      expect(contraste(COULEURS.texte, fond), `texte sur #${fond}`).toBeGreaterThanOrEqual(4.5)
      expect(contraste(COULEURS.texteDoux, fond), `texte doux sur #${fond}`).toBeGreaterThanOrEqual(4.5)
    })
    // Traits et bordures actives : 3:1 au moins (éléments graphiques)
    ;[COULEURS.trait, COULEURS.actifBordure].forEach((trait) => {
      expect(contraste(trait, COULEURS.schema)).toBeGreaterThanOrEqual(3)
    })
  })
})

describe('pilote « Automatiser des tâches avec l\'IA »', () => {
  it('applique les trois compositions : ouverture, cours avec schéma, activité', () => {
    const plan = planDiaporama(pilote)
    expect(plan.theme).toBe('atelier_visuel')
    expect(plan.diapositives.map((d) => d.maitre)).toEqual(['COUVERTURE', 'CONTENU', 'CONTENU'])
    expect(plan.diapositives[1].scene.type).toBe('chaine_traitement')
    expect(plan.diapositives[1].scene.etapes).toHaveLength(3)
    // Points clés en encadrés beiges en bas, sous le schéma
    const encadres = plan.diapositives[1].elements.filter((e) => e.type === 'forme' && e.fond === COULEURS.synthese)
    expect(encadres).toHaveLength(3)
    encadres.forEach((e) => expect(e.y).toBeGreaterThan(plan.diapositives[1].scene.zone.y + plan.diapositives[1].scene.zone.h))
    // Activité : bandeau vert sauge avec la durée
    const textes = plan.diapositives[2].elements.filter((e) => e.type === 'texte').map((e) => e.paragraphes[0].texte)
    expect(textes).toContain('Activité · 15 min')
    // Ouverture : l'objectif du parcours
    expect(plan.diapositives[0].elements.some((e) => e.type === 'texte' && e.paragraphes[0].texte.startsWith('Objectif'))).toBe(true)
  })

  it('empile les éléments en lecture étroite', () => {
    const plan = planDiaporama(pilote, { format: 'etroit' })
    expect(plan.format.largeur).toBeLessThan(plan.format.hauteur)
    const encadres = plan.diapositives[1].elements.filter((e) => e.type === 'forme' && e.fond === COULEURS.synthese)
    expect(new Set(encadres.map((e) => e.x)).size).toBe(1)
  })

  it('laisse un ancien diaporama sans thème ni scène inchangé (thème standard)', () => {
    const plan = planDiaporama(demo)
    expect(plan.theme).toBe('standard')
    expect(plan.format).toEqual({ largeur: 13.333, hauteur: 7.5 })
    expect(plan.diapositives.every((d) => d.scene === null)).toBe(true)
  })

  it('ignore une scène posée sur un modèle qui ne l\'accepte pas', () => {
    const plan = planDiaporama({ theme: 'atelier_visuel', diapositives: [{ modele: 'a_retenir', titre: 'À retenir', points: ['a', 'b'], scene: exemple('loupe') }] })
    expect(plan.diapositives[0].scene).toBeNull()
  })
})
