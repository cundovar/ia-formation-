import { describe, expect, it } from 'vitest'
import {
  decrireCondition,
  ecrireChemin,
  evaluerCondition,
  lireChemin,
  remplirGabarit,
  supprimerChemin,
  verifierChemin,
} from '@/laboratoires/moteur/expressions'

const donnees = { email: { objet: 'Rappel : votre FACTURE', pieces: ['devis', 'facture'] }, montant: '42,5', actif: true }

describe('chemins', () => {
  it('lit une valeur imbriquée et signale une valeur absente', () => {
    expect(lireChemin(donnees, 'email.objet')).toEqual({ trouve: true, valeur: 'Rappel : votre FACTURE' })
    expect(lireChemin(donnees, 'email.pieces.1')).toEqual({ trouve: true, valeur: 'facture' })
    expect(lireChemin(donnees, 'email.inconnu').trouve).toBe(false)
    expect(lireChemin(donnees, 'montant.chiffre').trouve).toBe(false)
  })

  it('refuse les chemins qui donnent accès aux prototypes ou contiennent du code', () => {
    expect(verifierChemin('__proto__.polluer')).toMatch(/pas autorisé/)
    expect(verifierChemin('email.constructor')).toMatch(/pas autorisé/)
    expect(verifierChemin('email[0]')).toMatch(/caractère non autorisé/)
    expect(verifierChemin('')).toMatch(/Indiquez un chemin/)
    expect(verifierChemin('a.b.c.d.e.f.g.h.i.j.k')).toMatch(/10 niveaux/)
    expect(() => lireChemin(donnees, '__proto__')).toThrow(/pas autorisé/)
    expect(({}).polluer).toBeUndefined()
  })

  it('écrit et supprime sans modifier les données d\'origine', () => {
    const ecrit = ecrireChemin(donnees, 'tri.dossier', 'Comptabilité')
    expect(ecrit.tri.dossier).toBe('Comptabilité')
    expect(donnees.tri).toBeUndefined()

    const supprime = supprimerChemin(donnees, 'email.objet')
    expect(supprime.email.objet).toBeUndefined()
    expect(donnees.email.objet).toBe('Rappel : votre FACTURE')
  })
})

describe('conditions', () => {
  it.each([
    [{ chemin: 'email.objet', operateur: 'contient', valeur: 'facture' }, true],
    [{ chemin: 'email.objet', operateur: 'commencePar', valeur: 'rappel' }, true],
    [{ chemin: 'email.objet', operateur: 'egal', valeur: 'autre' }, false],
    [{ chemin: 'email.objet', operateur: 'different', valeur: 'autre' }, true],
    [{ chemin: 'email.pieces', operateur: 'contient', valeur: 'devis' }, true],
    [{ chemin: 'montant', operateur: 'superieur', valeur: '40' }, true],
    [{ chemin: 'montant', operateur: 'inferieur', valeur: 40 }, false],
    [{ chemin: 'actif', operateur: 'egal', valeur: 'true' }, true],
    [{ chemin: 'email.inconnu', operateur: 'existe' }, false],
    [{ chemin: 'email.inconnu', operateur: 'absent' }, true],
    [{ toutes: [{ chemin: 'actif', operateur: 'existe' }, { chemin: 'email.objet', operateur: 'contient', valeur: 'rappel' }] }, true],
    [{ une: [{ chemin: 'actif', operateur: 'absent' }, { chemin: 'email.objet', operateur: 'egal', valeur: 'x' }] }, false],
  ])('%j vaut %s', (condition, attendu) => {
    expect(evaluerCondition(condition, donnees)).toBe(attendu)
  })

  it('explique une donnée absente, un nombre invalide ou un opérateur inconnu', () => {
    expect(() => evaluerCondition({ chemin: 'email.objt', operateur: 'contient', valeur: 'a' }, donnees)).toThrow(/n'existe pas/)
    expect(() => evaluerCondition({ chemin: 'email.objet', operateur: 'superieur', valeur: 3 }, donnees)).toThrow(/pas un nombre/)
    expect(() => evaluerCondition({ chemin: 'email.objet', operateur: 'eval', valeur: 'x' }, donnees)).toThrow(/n'existe pas/)
  })

  it('décrit une condition en français', () => {
    expect(decrireCondition({ chemin: 'email.objet', operateur: 'contient', valeur: 'facture' })).toBe('« email.objet » contient « facture »')
    expect(decrireCondition({ chemin: 'x', operateur: 'existe' })).toBe('« x » existe')
  })
})

describe('gabarits', () => {
  it('remplace les chemins entre doubles accolades', () => {
    expect(remplirGabarit('Objet : {{ email.objet }} ({{email.pieces.0}})', donnees)).toBe('Objet : Rappel : votre FACTURE (devis)')
  })

  it('signale une donnée absente au lieu d\'écrire « undefined »', () => {
    expect(() => remplirGabarit('Bonjour {{contact.prenom}}', donnees)).toThrow(/contact.prenom/)
  })
})
