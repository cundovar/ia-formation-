/**
 * DeepSeek (Chine) : API compatible OpenAI. Modèles et codes d'erreur relevés le 19 octobre 2026
 * sur la documentation officielle (regles/sources.md, [DEEPSEEK-API]).
 */
import { creerFournisseurCompatibleOpenAI } from './compatibleOpenAI.js'

export const ADRESSE = 'https://api.deepseek.com/chat/completions'

export default creerFournisseurCompatibleOpenAI({
  id: 'deepseek',
  libelle: 'DeepSeek',
  adresse: ADRESSE,
  lieuDonnees: 'en Chine',
  horsUnionEuropeenne: true,
  modeles: [
    { id: 'deepseek-flash', libelle: 'DeepSeek Flash (rapide, le moins cher)' },
    { id: 'deepseek-v4-pro', libelle: 'DeepSeek V4 Pro (plus précis, plus cher)' },
  ],
  pageCles: 'https://platform.deepseek.com/api_keys',
  pageFacturation: 'https://platform.deepseek.com/usage',
  formatCle: /^sk-[A-Za-z0-9]{20,}$/,
})
