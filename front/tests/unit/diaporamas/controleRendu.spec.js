// @vitest-environment jsdom
// Contrôle de rendu de l'aperçu : retour structuré (élément, problème, mesure, zone en % de la diapositive)
import { describe, expect, it } from 'vitest'
import { controlerRendu } from '@/diaporamas/controleRendu'
import { capturesDuDiaporama } from '@/diaporamas/images'

const rect = (left, top, width, height) => ({ left, top, width, height, right: left + width, bottom: top + height })

const bloc = (classe, texte, r, { scroll = [0, 0], client = [0, 0], role = 'corps' } = {}) => {
  const el = document.createElement('div')
  el.className = classe
  el.textContent = texte
  el.dataset.role = role
  el.getBoundingClientRect = () => r
  Object.defineProperty(el, 'scrollHeight', { value: scroll[1] })
  Object.defineProperty(el, 'clientHeight', { value: client[1] })
  Object.defineProperty(el, 'scrollWidth', { value: scroll[0] })
  Object.defineProperty(el, 'clientWidth', { value: client[0] })
  return el
}

describe('controlerRendu', () => {
  it('ne signale rien quand tout tient', () => {
    const diapo = document.createElement('section')
    diapo.getBoundingClientRect = () => rect(0, 0, 1000, 562)
    diapo.append(bloc('diapositive__titre', 'Titre', rect(50, 20, 800, 60)), bloc('diapositive-texte', 'Texte', rect(50, 120, 800, 100)))
    expect(controlerRendu(diapo)).toEqual([])
  })

  it('décrit le débordement, la sortie et le recouvrement avec leur mesure', () => {
    const diapo = document.createElement('section')
    diapo.getBoundingClientRect = () => rect(0, 0, 1000, 500)
    diapo.append(
      bloc('diapositive-texte', 'Un texte trop long', rect(100, 100, 400, 100), { scroll: [400, 160], client: [400, 100] }),
      bloc('diapositive-texte', 'Hors cadre', rect(900, 450, 200, 100), { role: 'repere' }),
      bloc('diapositive-texte', 'Superposé', rect(300, 150, 300, 100)),
    )
    const problemes = controlerRendu(diapo)
    const debordement = problemes.find((p) => p.probleme === 'debordement')
    expect(debordement.element).toEqual({ role: 'corps', extrait: 'Un texte trop long' })
    expect(debordement.mesure.depassementPx).toBe(60)
    expect(debordement.mesure.zone).toEqual({ x: 10, y: 20, w: 40, h: 20 })
    const sortie = problemes.find((p) => p.probleme === 'sortie')
    expect(sortie.element.role).toBe('repere')
    expect(sortie.mesure.depassementPx).toBe(100)
    const recouvrement = problemes.find((p) => p.probleme === 'recouvrement')
    expect(recouvrement.autre.extrait).toBe('Superposé')
    expect(recouvrement.message).toContain('textes superposés')
  })
})

describe('capturesDuDiaporama', () => {
  it('relève les captures des compositions et des étapes de démonstration, sans doublon', () => {
    expect(capturesDuDiaporama({ diapositives: [
      { modele: 'capture', capture: 3 },
      { modele: 'exemple_commente', capture: 5 },
      { modele: 'demonstration', etapes: [{ action: 'a', capture: 5 }, { action: 'b' }, { action: 'c', capture: 8 }] },
      { modele: 'notion' },
    ] })).toEqual([3, 5, 8])
  })
})
