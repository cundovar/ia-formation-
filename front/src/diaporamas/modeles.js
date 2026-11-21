// Modèles de diapositive : catalogue de référence partagé avec le serveur (regles/diaporamas/modeles.json,
// lu par DiaporamaChecker et par le connecteur). Champs, limites, ordre de lecture et rendus y sont décrits.
import catalogue from '@regles/diaporamas/modeles.json'

export const MODELES = catalogue.modeles

export const RENDUS_PAR_DEFAUT = catalogue.rendusParDefaut

export const COMPOSITIONS = Object.keys(MODELES).filter((id) => MODELES[id].composition)

export const estModeleConnu = (modele) => Object.hasOwn(MODELES, modele)

export const rendusModele = (modele) => ({ ...RENDUS_PAR_DEFAUT, ...(MODELES[modele]?.rendus ?? {}) })
