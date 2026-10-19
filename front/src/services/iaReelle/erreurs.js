/**
 * Erreur d'un appel à une vraie IA, traduite en langage clair. Le message ne contient jamais la clé.
 */
export class ErreurIaReelle extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'ErreurIaReelle'
    this.code = code
  }
}

export const MESSAGES = {
  CLE_MANQUANTE: 'Saisissez votre clé d\'API pour utiliser le mode IA réelle.',
  ENTREE_TROP_LONGUE: 'La consigne ou la donnée transmise est trop longue pour le mode IA réelle.',
  CLE_REFUSEE: 'Le fournisseur refuse cette clé : vérifiez qu\'elle correspond bien au fournisseur choisi, ou créez-en une nouvelle sur sa page officielle.',
  ACCES_REFUSE: 'Cette clé n\'a pas accès à ce modèle.',
  CREDIT_EPUISE: 'Le fournisseur indique un crédit épuisé ou un plafond de dépense atteint sur votre compte.',
  TROP_DE_REQUETES: 'Trop de demandes en peu de temps : patientez une minute, puis réessayez.',
  MODELE_INCONNU: 'Le fournisseur ne connaît pas ce modèle.',
  CONTENU_FILTRE: 'Le fournisseur a bloqué la consigne ou la réponse par son propre filtre de contenus. Reformulez, ou revenez à la simulation.',
  DEMANDE_REFUSEE: 'Le fournisseur a refusé la demande.',
  INDISPONIBLE: 'Le service du fournisseur est indisponible pour le moment. Réessayez plus tard ou revenez à la simulation.',
  DELAI_DEPASSE: 'Le fournisseur n\'a pas répondu à temps. Réessayez ou revenez à la simulation.',
  ANNULE: 'La demande a été annulée.',
  RESEAU: 'L\'appel n\'a pas abouti : vous êtes peut-être hors ligne, ou votre navigateur a bloqué la demande. La simulation reste disponible.',
  REPONSE_ILLISIBLE: 'La réponse du fournisseur n\'a pas pu être lue.',
}

export const erreur = (code) => new ErreurIaReelle(code, MESSAGES[code])
