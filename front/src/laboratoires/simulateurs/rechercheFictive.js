/**
 * Recherche documentaire fictive (le « R » d'un RAG) : elle compare les mots de la question
 * à ceux des passages, sans IA ni index réel. Le score est la part des mots de la question
 * présents dans le passage (de 0 à 1). Le calcul est simple et toujours le même.
 *
 * simulateurs.documents : [{ id, titre, source, passages: [{ id, reference, texte }] }]
 */

// Mots trop courants pour aider à trouver un passage
const MOTS_VIDES = new Set([
  'au', 'aux', 'avec', 'ce', 'ces', 'cet', 'cette', 'dans', 'de', 'des', 'du', 'en', 'est', 'et', 'il', 'je', 'la', 'le', 'les',
  'leur', 'ma', 'mes', 'mon', 'ne', 'nos', 'notre', 'on', 'ou', 'par', 'pas', 'peut', 'pour', 'puis', 'quand', 'que', 'quel',
  'quelle', 'quelles', 'quels', 'qui', 'quoi', 'sa', 'se', 'ses', 'son', 'sont', 'sur', 'ta', 'tes', 'ton', 'tu', 'un', 'une',
  'vos', 'votre', 'vous', 'est-ce', 'bonjour', 'merci', 'comment', 'combien', 'faire', 'fait', 'aussi',
])

export const TOP_K_MAX = 5

// Mots d'un texte : minuscules, sans accents, sans mots vides, sans « s » ou « x » final
export function motsCles(texte) {
  const mots = String(texte ?? '')
    .toLocaleLowerCase('fr')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((mot) => mot.length > 2 && !MOTS_VIDES.has(mot))
    .map((mot) => (mot.length > 3 ? mot.replace(/[sx]$/, '') : mot))
  return [...new Set(mots)]
}

export function scorer(question, texte) {
  const demandes = motsCles(question)
  if (demandes.length === 0) return 0
  const presents = new Set(motsCles(texte))
  const trouves = demandes.filter((mot) => presents.has(mot)).length
  return Math.round((trouves / demandes.length) * 100) / 100
}

/**
 * Renvoie les `topK` passages les plus proches de la question dont le score atteint `scoreMin`
 * (et dépasse 0). À score égal, l'ordre des documents décide.
 */
export function rechercher(documents = [], question, { topK = 3, scoreMin = 0 } = {}) {
  const candidats = documents.flatMap((document) => (document.passages ?? []).map((passage) => ({
    document: document.id,
    titre: document.titre,
    source: document.source,
    passage: passage.id,
    reference: passage.reference ?? '',
    texte: passage.texte,
    score: scorer(question, passage.texte),
  })))
  return candidats
    .map((candidat, rang) => ({ candidat, rang }))
    .filter(({ candidat }) => candidat.score > 0 && candidat.score >= scoreMin)
    .sort((a, b) => b.candidat.score - a.candidat.score || a.rang - b.rang)
    .slice(0, topK)
    .map(({ candidat }) => candidat)
}

export const citation = (resultat) => (resultat.reference ? `${resultat.titre}, ${resultat.reference}` : resultat.titre)
