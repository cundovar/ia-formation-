// Copie profonde des données d'un laboratoire. Elles sont toujours du JSON ; une copie JSON
// accepte aussi les objets réactifs de Vue, que structuredClone refuse.
export const cloner = (valeur) => (valeur === undefined ? undefined : JSON.parse(JSON.stringify(valeur)))
