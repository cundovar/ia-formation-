import { describe, expect, it } from 'vitest'
import { connexionValide, versLiens, versNoeuds } from '@/laboratoires/adaptateurs/vueFlow'
import { trouverLaboratoire } from '@/laboratoires/catalogue'
import { executerTout } from '@/laboratoires/moteur/execution'
import { normaliser } from '@/laboratoires/moteur/workflow'

const lab = trouverLaboratoire('trier-des-emails')
const correction = normaliser(lab.correction.workflow)

describe('adaptateur Vue Flow', () => {
  it('projette chaque bloc avec sa position, son état et son verrou', () => {
    const noeuds = versNoeuds(correction, { prochain: 'est-facture', verrous: ['declencheur'], selection: 'resultat' })
    expect(noeuds.map((noeud) => noeud.id)).toEqual(correction.noeuds.map((noeud) => noeud.id))
    expect(noeuds[0]).toMatchObject({ type: 'bloc', position: { x: 0, y: 0 }, deletable: false, data: { nom: 'Un e-mail arrive', etat: 'attente', verrouille: true } })
    expect(noeuds[0].ariaLabel).toBe('Un e-mail arrive, bloc Déclencheur, en attente, bloc fourni')
    expect(noeuds[1].ariaLabel).toMatch(/Condition, prochaine étape$/)
    expect(noeuds[1].data).toMatchObject({ etat: 'prochain', resume: 'Teste si « email.objet » contient « facture »' })
    expect(noeuds[1].data.bloc.sorties.map((sortie) => sortie.id)).toEqual(['vrai', 'faux'])
    expect(noeuds.find((noeud) => noeud.id === 'resultat').selected).toBe(true)
  })

  it('place en ligne un bloc sans position', () => {
    const noeuds = versNoeuds(normaliser({ noeuds: [{ id: 'a', type: 'declencheur' }, { id: 'b', type: 'resultat' }], liens: [] }))
    expect(noeuds.map((noeud) => noeud.position)).toEqual([{ x: 0, y: 0 }, { x: 340, y: 0 }])
  })

  it('projette les liens avec leur poignée, leur nom accessible et leur état d\'exécution', async () => {
    const execution = await executerTout(correction, lab.jeuxDeDonnees[0])
    const liens = versLiens(correction, { liensActifs: execution.liensActifs })
    const vrai = liens.find((lien) => lien.id === 'l3')
    const faux = liens.find((lien) => lien.id === 'l4')
    expect(vrai).toMatchObject({ source: 'est-facture', target: 'comptabilite', sourceHandle: 'vrai', targetHandle: 'entree', class: 'lien-pris' })
    expect(vrai.ariaLabel).toBe('Lien de L\'objet parle-t-il d\'une facture ? (si vrai) vers Classer dans Comptabilité')
    expect(faux).toMatchObject({ class: 'lien-non-pris' })
    expect(versLiens(correction)[0].class).toBe('lien-attente')
  })

  it('refuse les connexions qui casseraient le workflow', () => {
    const valide = (source, sourceHandle, target) => connexionValide(correction, { source, sourceHandle, target })
    expect(valide('comptabilite', 'sortie', 'a-lire')).toBe(true)
    expect(valide('a-lire', 'sortie', 'a-lire')).toBe(false)
    expect(valide('a-lire', 'sortie', 'resultat')).toBe(false)
    expect(valide('resultat', 'sortie', 'declencheur')).toBe(false)
    expect(valide('comptabilite', 'sortie', 'declencheur')).toBe(false)
    expect(valide('comptabilite', 'sortie', 'est-facture')).toBe(false)
    expect(valide('est-facture', 'peut-etre', 'resultat')).toBe(false)
    expect(valide('fantome', 'sortie', 'resultat')).toBe(false)
  })
})
