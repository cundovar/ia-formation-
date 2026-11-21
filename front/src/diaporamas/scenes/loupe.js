// Scène « loupe » : vérifier un détail.
// Le support s'affiche, une zone est mise en évidence (cadre épais vert sauge), puis un détail légendé
// apparaît, relié à la zone.
import { axeDe, boite, etat, etiquette, indice, liaison, repartir, texte } from './outils'

export const type = 'loupe'

const geometrie = (zone, n) => {
  if (axeDe(zone) === 'horizontal') {
    const support = { x: zone.x, y: zone.y, w: zone.w * 0.55, h: zone.h }
    const detail = { x: support.x + support.w + 0.7, y: zone.y, w: zone.w - support.w - 0.7, h: zone.h }
    return { support, detail }
  }
  const support = { x: zone.x, y: zone.y, w: zone.w, h: zone.h * 0.5 }
  const detail = { x: zone.x, y: support.y + support.h + 0.45, w: zone.w, h: zone.h - support.h - 0.45 }
  return { support, detail, n }
}

export const etats = (donnees, { zone, couleurs }) => {
  const lignes = (donnees.support?.lignes ?? []).map(texte)
  const n = lignes.length
  const g = geometrie(zone, n)
  const z = indice(donnees.zone, n, 0)
  const enTete = { x: g.support.x + 0.15, y: g.support.y + 0.08, w: g.support.w - 0.3, h: 0.45 }
  const corps = { x: g.support.x + 0.15, y: g.support.y + 0.6, w: g.support.w - 0.3, h: g.support.h - 0.7 }
  const cases = repartir(corps, n, 'vertical', 0.04)
  const libelleSupport = texte(donnees.support?.libelle)
  const detail = { libelle: texte(donnees.detail?.libelle), legende: texte(donnees.detail?.legende) }

  const dessiner = (etape) => {
    const liste = [
      boite('support', g.support, { fond: couleurs.fiche, bordure: couleurs.ficheBordure, epaisseur: 1.5, rayon: 0.12 }),
      etiquette('support-titre', enTete, [libelleSupport], { couleur: couleurs.texte, gras: true, align: 'left' }),
    ]
    lignes.forEach((ligne, i) => {
      const enEvidence = etape >= 1 && i === z
      if (enEvidence) {
        liste.push(boite('loupe', { x: cases[i].x - 0.08, y: cases[i].y - 0.02, w: cases[i].w + 0.16, h: cases[i].h + 0.04 }, {
          fond: couleurs.actif, bordure: couleurs.actifBordure, epaisseur: 3.5, rayon: 0.08,
        }))
      }
      liste.push(etiquette(`ligne-${i}`, cases[i], [ligne], {
        couleur: couleurs.texte, gras: enEvidence, align: 'left', attenue: etape >= 1 && !enEvidence,
      }))
    })
    if (etape >= 2) {
      const cible = cases[z]
      const horizontal = axeDe(zone) === 'horizontal'
      liste.push(
        liaison('lien-detail',
          horizontal ? cible.x + cible.w + 0.1 : cible.x + cible.w / 2,
          horizontal ? cible.y + cible.h / 2 : g.support.y + g.support.h + 0.04,
          horizontal ? g.detail.x - 0.05 : g.detail.x + g.detail.w / 2,
          horizontal ? g.detail.y + g.detail.h / 2 : g.detail.y - 0.04,
          { couleur: couleurs.actifBordure, epaisseur: 3 }),
        boite('detail', g.detail, { fond: couleurs.actif, bordure: couleurs.actifBordure, epaisseur: 2 }),
        etiquette('detail-titre', { x: g.detail.x + 0.15, y: g.detail.y + 0.1, w: g.detail.w - 0.3, h: 0.5 }, [detail.libelle], {
          couleur: couleurs.texte, gras: true, align: 'left',
        }),
        etiquette('detail-legende', { x: g.detail.x + 0.15, y: g.detail.y + 0.65, w: g.detail.w - 0.3, h: g.detail.h - 0.75 }, [detail.legende], {
          couleur: couleurs.texte, align: 'left', valign: 'top',
        }),
      )
    }
    return liste
  }

  return [
    etat(`Le support : ${libelleSupport}`, dessiner(0), 'Le support'),
    etat(`Zone observée : ${lignes[z] ?? ''}`, dessiner(1), `Zone observée : ligne ${z + 1}`),
    etat(`${detail.libelle} : ${detail.legende}`, dessiner(2), `Détail : ${detail.libelle}`),
  ]
}
