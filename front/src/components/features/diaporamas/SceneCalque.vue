<!-- Calque d'une scène animée sur une diapositive. Chaque primitive garde son identifiant d'une étape
     à l'autre : le navigateur anime alors son déplacement, sa taille et sa couleur (transitions CSS).
     Sans mouvement (préférence système ou choix de la personne), l'étape s'affiche directement.
     Le dessin est décoratif pour les lecteurs d'écran : la description et la légende de l'étape sont en texte. -->
<template>
  <div
    class="scene-calque"
    :class="{ 'scene-calque--sans-mouvement': !mouvement }"
    role="group"
    :aria-label="`Schéma : ${scene.description}`"
    :data-scene="scene.type"
  >
    <TransitionGroup
      name="scene"
      tag="div"
      class="scene-calque__dessin"
      aria-hidden="true"
    >
      <template
        v-for="element in elementsVisibles"
        :key="element.id"
      >
        <div
          v-if="element.type === 'forme'"
          class="scene-calque__forme"
          :style="styleForme(element, format)"
          :data-id="element.id"
        />
        <DiapositiveTexte
          v-else-if="element.type === 'texte'"
          :element="element.attenue ? { ...element, couleur: couleurAttenuee } : element"
          :data-id="element.id"
        />
      </template>
    </TransitionGroup>
    <svg
      class="scene-calque__liaisons"
      :viewBox="`0 0 ${format.largeur} ${format.hauteur}`"
      aria-hidden="true"
    >
      <defs>
        <marker
          v-for="couleur in couleursLignes"
          :id="`${idFleche}-${couleur}`"
          :key="couleur"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path
            d="M 0 0 L 10 5 L 0 10 z"
            :fill="`#${couleur}`"
          />
        </marker>
      </defs>
      <line
        v-for="ligne in lignes"
        :key="ligne.id"
        class="scene-calque__ligne"
        :class="{ 'scene-calque__ligne--attenue': ligne.attenue }"
        :x1="ligne.x1"
        :y1="ligne.y1"
        :x2="ligne.x2"
        :y2="ligne.y2"
        :stroke="`#${ligne.couleur}`"
        :stroke-width="ligne.epaisseur / 72"
        :stroke-dasharray="ligne.pointille ? `${8 / 72} ${6 / 72}` : null"
        :marker-end="ligne.fleche ? `url(#${idFleche}-${ligne.couleur})` : null"
      />
    </svg>
    <DiapositiveTexte
      v-if="scene.legende"
      class="scene-calque__legende"
      :element="elementLegende"
      aria-hidden="true"
    />
    <p class="sr-only">
      {{ fixe ? `${scene.description} ${scene.fixe.legendes.join(' ')}` : `Étape ${etape + 1} sur ${scene.etapes.length} : ${scene.etapes[etape].legende}` }}
    </p>
  </div>
</template>

<script setup>
import { computed, inject, unref, useId } from 'vue'
import DiapositiveTexte from './DiapositiveTexte.vue'
import { CLE_FORMAT, styleForme } from './geometrie'
import { FORMAT } from '@/diaporamas/theme'
import { elementsEtape, estFixe, legendeCourte } from '@/diaporamas/scenes'

const props = defineProps({
  // Scène planifiée (planDiaporama : etapes, fixe, legende, description)
  scene: { type: Object, required: true },
  // Numéro de l'étape affichée, ou -1 pour l'équivalent fixe (toutes les étapes, légendes numérotées)
  etape: { type: Number, default: -1 },
  mouvement: { type: Boolean, default: true },
  couleurTexte: { type: String, default: '353B49' },
  couleurAttenuee: { type: String, default: '5A6170' },
})

const formatInjecte = inject(CLE_FORMAT, FORMAT)
const format = computed(() => unref(formatInjecte))
const idFleche = `fleche-${useId()}`

const fixe = computed(() => estFixe(props.scene, props.etape))
const elements = computed(() => elementsEtape(props.scene, props.etape))
const elementsVisibles = computed(() => elements.value.filter((e) => e.type !== 'ligne'))
const lignes = computed(() => elements.value.filter((e) => e.type === 'ligne'))
const couleursLignes = computed(() => [...new Set(lignes.value.map((l) => l.couleur))])

const elementLegende = computed(() => ({
  type: 'texte',
  ...props.scene.legende,
  paragraphes: [{
    // Légende projetée courte, sur une ligne ; la phrase complète est dans la liste des étapes et pour les lecteurs d'écran
    texte: legendeCourte(props.scene, props.etape),
    puce: null,
    lien: null,
  }],
  taille: 24,
  gras: false,
  couleur: props.couleurTexte,
  align: 'left',
  valign: 'middle',
}))
</script>

<style scoped>
.scene-calque,
.scene-calque__dessin,
.scene-calque__liaisons {
  position: absolute;
  inset: 0;
}

.scene-calque {
  pointer-events: none;
}

.scene-calque__liaisons {
  width: 100%;
  height: 100%;
  overflow: visible;
}

.scene-calque__forme {
  position: absolute;
  box-sizing: border-box;
}

/* Le mouvement guide le regard vers l'étape en cours */
.scene-calque__forme,
.scene-calque__dessin :deep(.diapositive-texte) {
  transition:
    left 0.7s ease-in-out,
    top 0.7s ease-in-out,
    width 0.5s ease,
    height 0.5s ease,
    background-color 0.4s ease,
    border-color 0.4s ease,
    color 0.4s ease;
}

.scene-calque__ligne {
  transition: opacity 0.4s ease;
}

.scene-calque__ligne--attenue {
  opacity: 0.55;
}

.scene-enter-active {
  transition: opacity 0.45s ease, transform 0.45s ease;
}

.scene-enter-from {
  opacity: 0;
  transform: translateY(0.6cqw);
}

.scene-leave-active {
  transition: opacity 0.25s ease;
}

.scene-leave-to {
  opacity: 0;
}

.scene-calque--sans-mouvement .scene-calque__forme,
.scene-calque--sans-mouvement :deep(.diapositive-texte),
.scene-calque--sans-mouvement .scene-calque__ligne,
.scene-calque--sans-mouvement .scene-enter-active,
.scene-calque--sans-mouvement .scene-leave-active {
  transition: none !important;
}

@media (prefers-reduced-motion: reduce) {
  .scene-calque__forme,
  .scene-calque :deep(.diapositive-texte),
  .scene-calque__ligne,
  .scene-enter-active,
  .scene-leave-active {
    transition: none !important;
  }
}
</style>
