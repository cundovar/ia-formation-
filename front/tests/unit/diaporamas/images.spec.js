import { describe, expect, it, vi } from 'vitest'
import api from '@/services/api'
import { capturesDuDiaporama, chargerImages } from '@/diaporamas/images'
import { chargerDiaporamas, idCible } from '@/services/diaporamas'
import demo from './demo.json'

const CAPTURE = { id: 42, url: '/uploads/captures/42.webp', width: 1600, height: 1000, altText: 'Conversation fictive', caption: 'Une consigne en 4 temps', service: 'Assistant IA', capturedAt: '2026-10-26T10:00:00+00:00' }

describe('chargerImages', () => {
  it('liste les captures des diapositives', () => {
    expect(capturesDuDiaporama(demo)).toEqual([42])
    expect(capturesDuDiaporama({ diapositives: [{ modele: 'capture', capture: 'x' }] })).toEqual([])
  })

  it('charge chaque capture une fois, avec son texte alternatif et sa source', async () => {
    const chargerCaptures = vi.fn().mockResolvedValue([CAPTURE])
    const lireImage = vi.fn().mockResolvedValue('data:image/webp;base64,AAAA')

    const images = await chargerImages(demo, { chargerCaptures, lireImage })

    expect(chargerCaptures).toHaveBeenCalledWith([42])
    expect(lireImage).toHaveBeenCalledWith('/uploads/captures/42.webp')
    expect(images[42]).toEqual({
      data: 'data:image/webp;base64,AAAA',
      largeur: 1600,
      hauteur: 1000,
      alt: 'Conversation fictive',
      legende: 'Une consigne en 4 temps',
      source: 'Assistant IA',
      date: '26/10/2026',
    })
  })

  it('construit le diaporama sans les captures hors ligne', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(await chargerImages(demo, { chargerCaptures: vi.fn().mockRejectedValue(new Error('hors ligne')) })).toEqual({})
    const lireImage = vi.fn().mockRejectedValue(new Error('404'))
    expect(await chargerImages(demo, { chargerCaptures: vi.fn().mockResolvedValue([CAPTURE]), lireImage })).toEqual({})
  })

  it('ne demande rien sans capture', async () => {
    const chargerCaptures = vi.fn()
    expect(await chargerImages({ diapositives: [{ modele: 'notion' }] }, { chargerCaptures })).toEqual({})
    expect(chargerCaptures).not.toHaveBeenCalled()
  })
})

describe('service des diaporamas', () => {
  it('demande les diaporamas d\'un cours ou de plusieurs chapitres en une requête', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue({ data: { member: [{ id: 1 }] } })
    expect(await chargerDiaporamas({ cours: 3 })).toEqual([{ id: 1 }])
    await chargerDiaporamas({ chapitres: [4, 5] })
    expect(get.mock.calls.map(([url]) => url)).toEqual(['/diaporamas?cours=3', '/diaporamas?chapitre%5B%5D=4&chapitre%5B%5D=5'])
    get.mockRestore()
  })

  it('ne bloque pas la page si l\'API ne répond pas', async () => {
    const get = vi.spyOn(api, 'get').mockRejectedValue(new Error('hors ligne'))
    expect(await chargerDiaporamas({ cours: 3 })).toEqual([])
    expect(await chargerDiaporamas({})).toEqual([])
    expect(get).toHaveBeenCalledTimes(1)
    get.mockRestore()
  })

  it('lit l\'identifiant d\'une cible', () => {
    expect(idCible(3)).toBe(3)
    expect(idCible('/api/menus/7')).toBe(7)
    expect(idCible({ id: 9 })).toBe(9)
    expect(idCible(null)).toBeNull()
  })
})
