export default {
  type: 'resultat',
  libelle: 'Résultat',
  description: 'Affiche les données finales de l\'automatisation.',
  icone: 'fas fa-flag-checkered',
  couleur: 'rose',
  entrees: ['entree'],
  sorties: [],
  champs: [],
  configParDefaut: () => ({}),
  verifierConfig: () => [],
  resumer: () => 'Affiche les données finales',
  executer: ({ entree }) => ({
    donnees: entree,
    explication: 'Le résultat affiche les données finales. L\'automatisation est terminée pour ce chemin.',
  }),
}
