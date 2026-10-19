/**
 * GLM de Zhipu AI (Chine), par la plateforme BigModel : API compatible OpenAI. La plateforme
 * internationale api.z.ai refuse l'appel depuis un navigateur (constat du 19 octobre 2026), et ses clés
 * ne sont pas valables ici. Modèles et codes relevés sur la documentation officielle ([ZHIPU-API]).
 */
import { creerFournisseurCompatibleOpenAI } from './compatibleOpenAI.js'
import { erreur } from './erreurs.js'

export const ADRESSE = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'

// Codes « métier » de BigModel, plus précis que le statut HTTP (429 sert aussi au crédit épuisé)
const CODES = {
  CLE_REFUSEE: ['1000', '1001', '1003'],
  CREDIT_EPUISE: ['1113', '1316', '1317', '1318', '1319', '1320', '1321'],
  MODELE_INCONNU: ['1211', '1221', '1222'],
  CONTENU_FILTRE: ['1301'],
}

export default creerFournisseurCompatibleOpenAI({
  id: 'glm',
  libelle: 'GLM (Zhipu AI)',
  adresse: ADRESSE,
  lieuDonnees: 'en Chine',
  horsUnionEuropeenne: true,
  aideCle: 'Utilisez une clé de la plateforme bigmodel.cn : une clé z.ai (plateforme internationale) ne fonctionne pas ici.',
  modeles: [
    { id: 'glm-4.7-flash', libelle: 'GLM-4.7 Flash (gratuit, rapide)' },
    { id: 'glm-5.3', libelle: 'GLM-5.3 (plus précis, payant)' },
  ],
  pageCles: 'https://bigmodel.cn/usercenter/proj-mgmt/apikeys',
  pageFacturation: 'https://bigmodel.cn/usercenter/financial/overview',
  formatCle: /^[A-Za-z0-9]{20,}\.[A-Za-z0-9]{8,}$/,
  erreurMetier: (code) => {
    const trouve = Object.entries(CODES).find(([, codes]) => codes.includes(code))
    return trouve ? erreur(trouve[0]) : null
  },
})
