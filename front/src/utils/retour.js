/**
 * Bouton « Retour » d'un cours : revient à la page précédente du site. Arrivé directement sur le cours
 * (lien partagé, favori, nouvel onglet), il n'y a pas de page précédente : on va au parcours du cours,
 * ou à l'accueil s'il n'en a pas.
 */
export function revenir(router, parcours, etatHistorique = window.history.state) {
  if (etatHistorique?.back) {
    router.back()
    return
  }
  router.push(parcours ? `/category/${parcours}` : '/')
}
