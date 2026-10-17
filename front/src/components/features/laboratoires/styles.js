// Classes partagées des laboratoires : fonds clairs ou pastel, texte foncé (AGENTS.md)
const FOCUS = 'focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blue-800'

export const BOUTON = {
  principal: `inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border-2 border-blue-300 bg-blue-100 px-4 py-2 text-lg font-semibold text-blue-950 hover:bg-blue-200 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-500 ${FOCUS}`,
  secondaire: `inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-4 py-2 text-lg font-semibold text-gray-900 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400 ${FOCUS}`,
  succes: `inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border-2 border-green-300 bg-green-100 px-4 py-2 text-lg font-semibold text-green-950 hover:bg-green-200 ${FOCUS}`,
  danger: `inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border-2 border-red-300 bg-white px-3 py-1 text-base font-semibold text-red-800 hover:bg-red-50 ${FOCUS}`,
  lien: `inline-flex min-h-11 items-center gap-2 text-lg font-bold text-blue-800 underline ${FOCUS}`,
}

export const CHAMP = `mt-1 block w-full rounded-lg border-2 border-gray-300 bg-white px-3 py-2 text-lg text-gray-900 ${FOCUS}`

// Couleur de chaque type de bloc (toujours accompagnée d'une icône et d'un nom)
export const COULEURS_BLOC = {
  amber: { carte: 'border-amber-300 bg-amber-50', icone: 'bg-amber-100 text-amber-900' },
  sky: { carte: 'border-sky-300 bg-sky-50', icone: 'bg-sky-100 text-sky-900' },
  violet: { carte: 'border-violet-300 bg-violet-50', icone: 'bg-violet-100 text-violet-900' },
  emerald: { carte: 'border-emerald-300 bg-emerald-50', icone: 'bg-emerald-100 text-emerald-900' },
  rose: { carte: 'border-rose-300 bg-rose-50', icone: 'bg-rose-100 text-rose-900' },
}

// État d'un bloc pendant l'exécution : un texte, une icône et une couleur
export const ETATS = {
  attente: { texte: 'En attente', icone: 'fas fa-hourglass-start', classes: 'bg-white text-gray-700 border-gray-300' },
  prochain: { texte: 'Prochaine étape', icone: 'fas fa-play', classes: 'bg-blue-100 text-blue-950 border-blue-400' },
  ok: { texte: 'Exécuté', icone: 'fas fa-check', classes: 'bg-green-100 text-green-950 border-green-400' },
  ignore: { texte: 'Ignoré (chemin non pris)', icone: 'fas fa-forward', classes: 'bg-gray-100 text-gray-800 border-gray-300' },
  erreur: { texte: 'Erreur', icone: 'fas fa-triangle-exclamation', classes: 'bg-red-100 text-red-950 border-red-400' },
}

export const json = (valeur) => JSON.stringify(valeur, null, 2)
