// Validation d'une scène d'après le catalogue de référence (regles/scenes/catalogue.json).
// Même logique que src/Service/Redaction/SceneValidator.php : les deux lisent le même catalogue et sont
// testés sur le même jeu d'exemples (regles/scenes/exemples/). Refuse les champs inconnus, le HTML,
// les liens javascript:/data:, les références cassées et les dépassements de limites.
import catalogue from '@regles/scenes/catalogue.json'

export const CATALOGUE = catalogue

export const sceneDuCatalogue = (type) => catalogue.scenes.find((s) => s.id === type) ?? null

const HTML = /<\s*\/?\s*[a-z!?]|javascript:|data:/i
const IDENTIFIANT = /^[a-z0-9_-]{1,30}$/

const longueur = (texte) => [...texte].length

const verifierValeur = (valeur, regle, chemin, erreurs) => {
  const ajouter = (code, message) => erreurs.push({ code, champ: chemin, message })
  switch (regle.type) {
    case 'texte': {
      if (typeof valeur !== 'string' || valeur.trim() === '') return ajouter('SCENE_TYPE', `${chemin} : texte attendu.`)
      if (HTML.test(valeur)) return ajouter('SCENE_HTML', `${chemin} : ni balise HTML ni lien javascript: ou data:.`)
      const n = longueur(valeur.trim())
      if (regle.max && n > regle.max) ajouter('SCENE_LIMITE', `${chemin} : ${n} caractères, ${regle.max} au plus.`)
      if (regle.min && n < regle.min) ajouter('SCENE_LIMITE', `${chemin} : ${n} caractères, ${regle.min} au moins.`)
      return undefined
    }
    case 'entier':
      if (!Number.isInteger(valeur)) return ajouter('SCENE_TYPE', `${chemin} : nombre entier attendu.`)
      if (regle.min !== undefined && valeur < regle.min) ajouter('SCENE_LIMITE', `${chemin} : ${regle.min} au moins.`)
      if (regle.max !== undefined && valeur > regle.max) ajouter('SCENE_LIMITE', `${chemin} : ${regle.max} au plus.`)
      return undefined
    case 'booleen':
      if (typeof valeur !== 'boolean') ajouter('SCENE_TYPE', `${chemin} : true ou false attendu.`)
      return undefined
    case 'choix':
      if (!regle.valeurs.includes(valeur)) ajouter('SCENE_TYPE', `${chemin} : une valeur parmi ${regle.valeurs.join(', ')}.`)
      return undefined
    case 'identifiant':
      if (typeof valeur !== 'string' || !IDENTIFIANT.test(valeur)) ajouter('SCENE_TYPE', `${chemin} : identifiant de 1 à 30 caractères (a-z, 0-9, - ou _).`)
      return undefined
    case 'liste':
      if (!Array.isArray(valeur)) return ajouter('SCENE_TYPE', `${chemin} : liste attendue.`)
      if (valeur.length < regle.min || valeur.length > regle.max) {
        ajouter('SCENE_LIMITE', `${chemin} : de ${regle.min} à ${regle.max} éléments (${valeur.length} fournis).`)
      }
      valeur.forEach((element, i) => verifierValeur(element, regle.elements, `${chemin}[${i}]`, erreurs))
      return undefined
    case 'objet':
      verifierObjet(valeur, regle.champs, chemin, erreurs)
      return undefined
    default:
      return ajouter('SCENE_TYPE', `${chemin} : type de champ inconnu.`)
  }
}

const verifierObjet = (objet, champs, chemin, erreurs) => {
  if (!objet || typeof objet !== 'object' || Array.isArray(objet)) {
    erreurs.push({ code: 'SCENE_TYPE', champ: chemin, message: `${chemin} : objet attendu.` })
    return
  }
  Object.keys(objet).forEach((cle) => {
    if (!Object.hasOwn(champs, cle)) {
      erreurs.push({ code: 'SCENE_CHAMP_INCONNU', champ: `${chemin}.${cle}`, message: `${chemin}.${cle} : champ inconnu pour ce modèle de scène.` })
    }
  })
  Object.entries(champs).forEach(([cle, regle]) => {
    const valeur = objet[cle]
    if (valeur === undefined || valeur === null) {
      if (regle.obligatoire) erreurs.push({ code: 'SCENE_CHAMP_MANQUANT', champ: `${chemin}.${cle}`, message: `${chemin}.${cle} : champ obligatoire.` })
      return
    }
    verifierValeur(valeur, regle, `${chemin}.${cle}`, erreurs)
  })
}

// Valeurs désignées par un chemin du catalogue : « blocs », « support.lignes », « branches[].id »
const valeursDe = (scene, chemin) => {
  const [base, sous] = chemin.split('[].')
  const liste = base.split('.').reduce((v, cle) => (v && typeof v === 'object' ? v[cle] : undefined), scene)
  if (sous === undefined) return liste
  return Array.isArray(liste) ? liste.map((e) => (e && typeof e === 'object' ? e[sous] : undefined)) : []
}

const verifierReferences = (scene, references, erreurs) => {
  references.forEach((ref) => {
    if (ref.indiceDe) {
      const valeur = valeursDe(scene, ref.champ)
      const liste = valeursDe(scene, ref.indiceDe)
      if (valeur !== undefined && Number.isInteger(valeur) && Array.isArray(liste) && valeur >= liste.length) {
        erreurs.push({ code: 'SCENE_REFERENCE', champ: ref.champ, message: `${ref.champ} : désigne l'élément ${valeur} de ${ref.indiceDe}, qui n'en a que ${liste.length} (le premier est 0).` })
      }
    } else if (ref.parmi) {
      const valeur = valeursDe(scene, ref.champ)
      const possibles = valeursDe(scene, ref.parmi) ?? []
      if (valeur !== undefined && !possibles.includes(valeur)) {
        erreurs.push({ code: 'SCENE_REFERENCE', champ: ref.champ, message: `${ref.champ} : « ${valeur} » ne fait pas partie de ${ref.parmi} (${possibles.join(', ')}).` })
      }
    } else if (ref.unique) {
      const valeurs = valeursDe(scene, ref.unique) ?? []
      if (new Set(valeurs).size !== valeurs.length) {
        erreurs.push({ code: 'SCENE_REFERENCE', champ: ref.unique, message: `${ref.unique} : chaque valeur doit être unique.` })
      }
    } else if (ref.auMoinsUn) {
      const valeurs = valeursDe(scene, ref.auMoinsUn) ?? []
      if (!valeurs.includes(ref.valeur)) {
        erreurs.push({ code: 'SCENE_REFERENCE', champ: ref.auMoinsUn, message: `${ref.auMoinsUn} : il faut au moins un élément avec la valeur ${ref.valeur}.` })
      }
    }
  })
}

/**
 * @param {unknown} scene données de la scène
 * @returns {{ code: string, champ: string, message: string }[]} liste vide si la scène est valide
 */
export const validerScene = (scene) => {
  const erreurs = []
  if (!scene || typeof scene !== 'object' || Array.isArray(scene)) {
    return [{ code: 'SCENE_TYPE', champ: 'scene', message: 'scene : objet attendu.' }]
  }
  const modele = sceneDuCatalogue(scene.type)
  if (!modele) {
    return [{ code: 'SCENE_INCONNUE', champ: 'scene.type', message: `scene.type : « ${scene.type} » n'est pas dans le catalogue (${catalogue.scenes.map((s) => s.id).join(', ')}).` }]
  }
  if (scene.version !== modele.version) {
    erreurs.push({ code: 'SCENE_INCONNUE', champ: 'scene.version', message: `scene.version : version ${modele.version} attendue pour ${modele.id}.` })
  }
  const { type, version, ...communs } = catalogue.champsCommuns
  void type
  void version
  verifierObjet(scene, { ...communs, type: catalogue.champsCommuns.type, version: catalogue.champsCommuns.version, ...modele.champs }, 'scene', erreurs)
  if (erreurs.length === 0) verifierReferences(scene, modele.references ?? [], erreurs)
  return erreurs
}
