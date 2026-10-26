import { describe, expect, it, vi } from 'vitest'
import { revenir } from '@/utils/retour'

const routeur = () => ({ back: vi.fn(), push: vi.fn() })

describe('bouton Retour d\'un cours', () => {
  it('revient à la page précédente du site quand elle existe', () => {
    const router = routeur()
    revenir(router, 'Automatiser des tâches avec l\'IA', { back: '/category/Automatiser' })
    expect(router.back).toHaveBeenCalledOnce()
    expect(router.push).not.toHaveBeenCalled()
  })

  it('va au parcours du cours, ou à l\'accueil, quand on arrive directement sur le cours', () => {
    const router = routeur()
    revenir(router, 'Automatiser des tâches avec l\'IA', { back: null })
    expect(router.push).toHaveBeenCalledWith('/category/Automatiser des tâches avec l\'IA')

    const sansParcours = routeur()
    revenir(sansParcours, undefined, null)
    expect(sansParcours.push).toHaveBeenCalledWith('/')
    expect(sansParcours.back).not.toHaveBeenCalled()
  })
})
