<template>
  <section
    v-if="supported"
    class="read-aloud"
    aria-label="Lecture à voix haute"
  >
    <div class="read-aloud__controls">
      <AppButton
        :icon="isPlaying ? 'pi pi-pause' : 'pi pi-volume-up'"
        variant="secondary"
        size="md"
        :aria-label="toggleLabel"
        @click="toggle"
      >
        {{ toggleLabel }}
      </AppButton>

      <AppButton
        v-if="status !== 'idle'"
        icon="pi pi-stop-circle"
        variant="outline"
        size="md"
        aria-label="Arrêter la lecture"
        @click="stop"
      >
        Arrêter
      </AppButton>

      <label class="read-aloud__rate">
        <span>Vitesse</span>
        <select
          :value="rate"
          @change="setRate(Number($event.target.value))"
        >
          <option
            v-for="option in RATES"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
      </label>
    </div>

    <!-- Annonce vocale pour les lecteurs d'écran, sans répéter le texte du cours -->
    <p
      class="read-aloud__status"
      role="status"
      aria-live="polite"
    >
      {{ statusText }}
    </p>
  </section>
</template>

<script setup>
import { computed, toRef } from 'vue'
import AppButton from '../../ui/AppButton.vue'
import { useReadAloud, RATES } from '@/composables/ui/useReadAloud'

const props = defineProps({
  // Élément du DOM qui contient le texte du cours à lire
  target: {
    type: Object,
    default: null
  }
})

const { supported, status, isPlaying, rate, progress, toggle, stop, setRate } = useReadAloud(toRef(props, 'target'))

const toggleLabel = computed(() => {
  if (status.value === 'playing') return 'Mettre en pause'
  if (status.value === 'paused') return 'Reprendre la lecture'
  return 'Écouter ce cours'
})

const statusText = computed(() => {
  if (status.value === 'playing') return `Lecture en cours, passage ${progress.value.current + 1} sur ${progress.value.total}`
  if (status.value === 'paused') return 'Lecture en pause'
  return ''
})
</script>

<style scoped>
.read-aloud {
  max-width: 44rem;
  margin: 1rem auto 0;
  padding: 0 1.25rem;
}

.read-aloud__controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}

.read-aloud__rate {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  color: #111827;
}

.read-aloud__rate select {
  min-height: 2.5rem;
  padding: 0.25rem 0.5rem;
  border: 2px solid #6b7280;
  border-radius: 0.5rem;
  background: #fff;
  color: #111827;
}

.read-aloud__status {
  min-height: 1.25rem;
  margin-top: 0.5rem;
  font-size: 0.9rem;
  color: #374151;
}

/* La lecture n'a pas de sens sur papier */
@media print {
  .read-aloud {
    display: none;
  }
}
</style>
