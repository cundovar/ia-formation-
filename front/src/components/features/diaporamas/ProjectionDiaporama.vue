<!-- Projection d'un diaporama : la zone projetée (16:9) est seule en plein écran ; commandes, sommaire et
     notes restent en dehors. Clavier : → / Espace / Page suivante (étape puis diapositive suivante),
     ← / Page précédente, Début, Fin, R (rejouer), F (plein écran), N (notes), M (mouvement).
     Sur un écran étroit, le thème Atelier visuel empile les éléments (format `etroit`). -->
<template>
  <div
    ref="racine"
    class="projection"
    data-testid="projection"
  >
    <div class="projection__barre">
      <label class="projection__sommaire">
        <span>Diapositive</span>
        <select
          :value="index"
          data-testid="projection-sommaire"
          @change="allerA(Number($event.target.value))"
        >
          <option
            v-for="(element, i) in plan.diapositives"
            :key="i"
            :value="i"
          >
            {{ i + 1 }}. {{ element.titre }}
          </option>
        </select>
      </label>
      <p
        class="projection__position"
        aria-hidden="true"
      >
        {{ index + 1 }} / {{ plan.diapositives.length }}
        <template v-if="sceneCourante && !fixe">
          · étape {{ etape + 1 }} / {{ sceneCourante.etapes.length }}
        </template>
      </p>
    </div>

    <div
      ref="zoneProjetee"
      class="projection__scene"
      :class="{ 'projection__scene--plein-ecran': pleinEcran }"
      data-testid="projection-zone"
    >
      <DiapositiveHtml
        v-if="diapositive"
        :key="`${index}-${plan.formatNom}`"
        :diapositive="diapositive"
        :maitre="decors[diapositive.maitre]"
        :numero="index + 1"
        :format="plan.format"
        :etape="fixe ? -1 : etape"
        :mouvement="mouvement"
        niveau-titre="h2"
      />
    </div>

    <div
      class="projection__commandes"
      role="toolbar"
      aria-label="Commandes de projection"
    >
      <AppButton
        variant="outline"
        size="md"
        icon="pi pi-arrow-left"
        :disabled="estAuDebut"
        data-testid="projection-precedent"
        @click="precedent"
      >
        Précédent
      </AppButton>
      <AppButton
        variant="primary"
        size="md"
        icon="pi pi-arrow-right"
        :disabled="estALaFin"
        data-testid="projection-suivant"
        @click="suivant"
      >
        Suivant
      </AppButton>
      <AppButton
        v-if="sceneCourante"
        variant="outline"
        size="md"
        icon="pi pi-replay"
        data-testid="projection-rejouer"
        @click="rejouer"
      >
        Rejouer
      </AppButton>
      <AppButton
        v-for="v in variantes"
        :key="`${v.cle}-${v.valeur}`"
        variant="outline"
        size="md"
        :aria-pressed="varianteActive(v) ? 'true' : 'false'"
        :data-testid="`projection-variante-${v.valeur}`"
        @click="choisirVariante(v)"
      >
        {{ v.cle === 'brancheSuivie' ? `Branche : ${v.libelle}` : v.libelle }}
      </AppButton>
      <AppButton
        v-if="sceneCourante"
        variant="outline"
        size="md"
        :aria-pressed="fixe ? 'true' : 'false'"
        data-testid="projection-fixe"
        @click="fixe = !fixe"
      >
        {{ fixe ? 'Revenir aux étapes' : 'Vue fixe légendée' }}
      </AppButton>
      <AppButton
        variant="outline"
        size="md"
        :aria-pressed="mouvement ? 'false' : 'true'"
        data-testid="projection-mouvement"
        @click="mouvement = !mouvement"
      >
        {{ mouvement ? 'Lecture sans mouvement' : 'Réactiver le mouvement' }}
      </AppButton>
      <AppButton
        variant="outline"
        size="md"
        icon="pi pi-window-maximize"
        data-testid="projection-plein-ecran"
        @click="basculerPleinEcran"
      >
        Plein écran
      </AppButton>
      <AppButton
        variant="ghost"
        size="md"
        :aria-expanded="notesVisibles ? 'true' : 'false'"
        data-testid="projection-notes-bouton"
        @click="notesVisibles = !notesVisibles"
      >
        {{ notesVisibles ? 'Masquer les notes' : 'Notes' }}
      </AppButton>
    </div>

    <p
      class="sr-only"
      aria-live="polite"
    >
      {{ annonce }}
    </p>

    <section
      v-if="sceneCourante"
      class="projection__etapes"
      :aria-label="sceneCourante.genre === 'demonstration' ? 'Étapes de la démonstration' : 'Étapes du schéma'"
      data-testid="projection-etapes"
    >
      <h3>{{ sceneCourante.titreEtapes ?? 'Le schéma, étape par étape' }}</h3>
      <p>{{ sceneCourante.description }}</p>
      <ol>
        <li
          v-for="(e, i) in sceneCourante.etapes"
          :key="i"
          :aria-current="!fixe && i === etape ? 'step' : null"
        >
          {{ e.legende }}
        </li>
      </ol>
      <p
        v-if="sceneCourante.justification"
        class="projection__justification"
      >
        Pourquoi ce schéma : {{ sceneCourante.justification }}
      </p>
    </section>

    <section
      v-if="notesVisibles"
      class="projection__notes"
      aria-label="Notes de présentation"
      data-testid="projection-notes"
    >
      <h3>Notes de présentation</h3>
      <p>{{ diapositive?.notes || 'Pas de notes pour cette diapositive.' }}</p>
    </section>

    <p class="projection__aide">
      Clavier : flèches ou Espace pour avancer et revenir, R pour rejouer, F pour le plein écran,
      N pour les notes, M pour la lecture sans mouvement.
    </p>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AppButton from '../../ui/AppButton.vue'
import DiapositiveHtml from './DiapositiveHtml.vue'
import { maitres, planDiaporama } from '@/diaporamas/miseEnPage'
import { variantesDe } from '@/diaporamas/scenes'

const props = defineProps({
  diaporama: { type: Object, required: true },
  images: { type: Object, default: () => ({}) },
  site: { type: String, default: 'Formation IA' },
  // Largeur sous laquelle le thème Atelier visuel passe en lecture étroite (pixels)
  largeurEtroite: { type: Number, default: 640 },
})

const racine = ref(null)
const zoneProjetee = ref(null)
const index = ref(0)
const etape = ref(0)
const fixe = ref(false)
const notesVisibles = ref(false)
const pleinEcran = ref(false)
const etroit = ref(false)
const formatForce = ref(null)
const variantesChoisies = ref({})
const preferenceReduite = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const mouvement = ref(!preferenceReduite)

const plan = computed(() => planDiaporama(props.diaporama, {
  images: props.images,
  // formatForce : imposé par le contrôle de rendu de l'aperçu, qui mesure les deux formats
  format: formatForce.value ?? (etroit.value && !pleinEcran.value ? 'etroit' : 'large'),
  variantes: variantesChoisies.value,
}))
const decors = computed(() => maitres(plan.value, props.site))
const diapositive = computed(() => plan.value.diapositives[index.value] ?? null)
// Scène planifiée de la diapositive en cours
const sceneCourante = computed(() => diapositive.value?.scene ?? null)
const nombreEtapes = computed(() => sceneCourante.value?.etapes.length ?? 1)
const variantes = computed(() => variantesDe(props.diaporama.diapositives?.[index.value]?.scene))

const estAuDebut = computed(() => index.value === 0 && (etape.value === 0 || fixe.value))
const estALaFin = computed(() => index.value === plan.value.diapositives.length - 1 && (fixe.value || etape.value >= nombreEtapes.value - 1))

const annonce = computed(() => {
  if (!diapositive.value) return ''
  const base = `Diapositive ${index.value + 1} sur ${plan.value.diapositives.length} : ${diapositive.value.titre}.`
  if (!sceneCourante.value || fixe.value) return base
  return `${base} Étape ${etape.value + 1} sur ${nombreEtapes.value} : ${sceneCourante.value.etapes[etape.value].legende}`
})

let minuteur = null
const arreterLecture = () => {
  clearInterval(minuteur)
  minuteur = null
}

const allerA = (nouveau, etapeVoulue = 0) => {
  arreterLecture()
  index.value = Math.min(Math.max(0, nouveau), plan.value.diapositives.length - 1)
  const total = plan.value.diapositives[index.value]?.scene?.etapes.length ?? 1
  etape.value = etapeVoulue === 'fin' ? total - 1 : Math.min(etapeVoulue, total - 1)
  fixe.value = false
}

const suivant = () => {
  arreterLecture()
  if (sceneCourante.value && !fixe.value && etape.value < nombreEtapes.value - 1) etape.value += 1
  else if (index.value < plan.value.diapositives.length - 1) allerA(index.value + 1)
}

const precedent = () => {
  arreterLecture()
  if (sceneCourante.value && !fixe.value && etape.value > 0) etape.value -= 1
  else if (index.value > 0) allerA(index.value - 1, 'fin')
}

// Rejouer : retour à la première étape, puis avance automatique (sauf lecture sans mouvement)
const rejouer = () => {
  arreterLecture()
  fixe.value = false
  etape.value = 0
  if (!mouvement.value) return
  minuteur = setInterval(() => {
    if (etape.value < nombreEtapes.value - 1) etape.value += 1
    else arreterLecture()
  }, 1600)
}

const varianteActive = (v) => {
  const choisie = variantesChoisies.value[index.value]?.[v.cle]
  const parDefaut = props.diaporama.diapositives?.[index.value]?.scene?.[v.cle]
  return (choisie ?? parDefaut) === v.valeur
}

const choisirVariante = (v) => {
  variantesChoisies.value = { ...variantesChoisies.value, [index.value]: { [v.cle]: v.valeur } }
  rejouer()
}

const basculerPleinEcran = async () => {
  if (document.fullscreenElement) await document.exitFullscreen?.()
  else await zoneProjetee.value?.requestFullscreen?.().catch(() => {})
}

const surPleinEcran = () => {
  pleinEcran.value = document.fullscreenElement === zoneProjetee.value
}

const CLES_SUIVANT = ['ArrowRight', 'PageDown', ' ', 'Enter']
const CLES_PRECEDENT = ['ArrowLeft', 'PageUp', 'Backspace']

const surTouche = (evenement) => {
  if (evenement.defaultPrevented || evenement.altKey || evenement.ctrlKey || evenement.metaKey) return
  const cible = evenement.target
  const dansChamp = cible instanceof HTMLElement && cible.closest('input, select, textarea, [contenteditable="true"]')
  // Espace et Entrée gardent leur rôle sur un bouton ou un lien
  const surCommande = cible instanceof HTMLElement && cible.closest('button, a')
  if (dansChamp) return
  if (CLES_SUIVANT.includes(evenement.key) && !(surCommande && [' ', 'Enter'].includes(evenement.key))) {
    evenement.preventDefault()
    suivant()
  } else if (CLES_PRECEDENT.includes(evenement.key)) {
    evenement.preventDefault()
    precedent()
  } else if (evenement.key === 'Home') {
    evenement.preventDefault()
    allerA(0)
  } else if (evenement.key === 'End') {
    evenement.preventDefault()
    allerA(plan.value.diapositives.length - 1, 'fin')
  } else if (evenement.key.toLowerCase() === 'r' && sceneCourante.value) {
    rejouer()
  } else if (evenement.key.toLowerCase() === 'f') {
    basculerPleinEcran()
  } else if (evenement.key.toLowerCase() === 'n') {
    notesVisibles.value = !notesVisibles.value
  } else if (evenement.key.toLowerCase() === 'm') {
    mouvement.value = !mouvement.value
  }
}

// Lecture étroite selon la largeur réellement disponible (mesurée au montage, puis à chaque changement)
const mesurer = () => {
  const largeur = racine.value?.getBoundingClientRect().width ?? 0
  if (largeur > 0) etroit.value = largeur < props.largeurEtroite
}

let observateur = null
onMounted(() => {
  window.addEventListener('keydown', surTouche)
  window.addEventListener('resize', mesurer)
  document.addEventListener('fullscreenchange', surPleinEcran)
  mesurer()
  if (typeof ResizeObserver !== 'undefined' && racine.value) {
    observateur = new ResizeObserver(mesurer)
    observateur.observe(racine.value)
  }
})

onBeforeUnmount(() => {
  arreterLecture()
  window.removeEventListener('keydown', surTouche)
  window.removeEventListener('resize', mesurer)
  document.removeEventListener('fullscreenchange', surPleinEcran)
  observateur?.disconnect()
})

// Un autre diaporama : on repart du début
watch(() => props.diaporama, () => allerA(0))

defineExpose({ suivant, precedent, allerA, rejouer, index, etape, mouvement, formatForce })
</script>

<style scoped>
.projection {
  display: grid;
  gap: 0.9rem;
  color: #1f2937;
}

.projection__barre {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.projection__sommaire {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
}

.projection__sommaire select {
  max-width: min(32rem, 100%);
  padding: 0.4rem 0.6rem;
  border: 1px solid #94a3b8;
  border-radius: 0.5rem;
  background: #fff;
}

.projection__position {
  margin: 0;
  font-variant-numeric: tabular-nums;
}

.projection__scene {
  width: 100%;
  border: 1px solid #d6dbe4;
  border-radius: 0.75rem;
  overflow: hidden;
  background: #fffdf8;
}

/* En plein écran, la diapositive 16:9 occupe tout l'espace disponible, sans commandes */
.projection__scene:fullscreen,
.projection__scene--plein-ecran {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 0;
  background: #fffdf8;
}

.projection__scene:fullscreen > :deep(.diapositive) {
  width: min(100vw, calc(100vh * 13.333 / 7.5));
}

.projection__commandes {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.projection__etapes,
.projection__notes {
  padding: 1rem 1.15rem;
  border: 1px solid #e3dccb;
  border-radius: 0.75rem;
  background: #fbf8f0;
}

.projection__etapes h3,
.projection__notes h3 {
  margin: 0 0 0.4rem;
  font-size: 1.05rem !important;
}

.projection__etapes ol {
  margin: 0.5rem 0 0;
  padding-left: 1.4rem;
}

.projection__etapes li[aria-current='step'] {
  font-weight: 700;
  background: #e1eedf;
  border-radius: 0.3rem;
}

.projection__justification {
  margin: 0.6rem 0 0;
  color: #4b5563;
}

.projection__notes p {
  margin: 0;
  white-space: pre-line;
}

.projection__aide {
  margin: 0;
  color: #4b5563;
  font-size: 0.9rem;
}
</style>
