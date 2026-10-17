<template>
  <section
    class="rounded-2xl border border-blue-200 bg-blue-50 p-4"
    aria-labelledby="controles-titre"
  >
    <h3
      id="controles-titre"
      class="text-xl font-bold text-gray-900"
    >
      Lancer la simulation
    </h3>

    <label
      for="jeu-donnees"
      class="mt-3 block text-base font-semibold text-gray-900"
    >Données d'essai (fictives)</label>
    <select
      id="jeu-donnees"
      :value="store.jeuId"
      :class="CHAMP"
      data-testid="jeu-donnees"
      @change="store.choisirJeu($event.target.value)"
    >
      <option
        v-for="jeu in store.lab.jeuxDeDonnees"
        :key="jeu.id"
        :value="jeu.id"
      >
        {{ jeu.libelle }}
      </option>
    </select>

    <div class="mt-4 grid grid-cols-2 gap-2">
      <button
        type="button"
        :class="BOUTON.principal"
        :disabled="invalide || store.lecture"
        data-testid="pas-a-pas"
        @click="store.pas()"
      >
        <i
          class="fas fa-forward-step"
          aria-hidden="true"
        />
        Pas à pas
      </button>
      <button
        v-if="!store.lecture"
        type="button"
        :class="BOUTON.principal"
        :disabled="invalide"
        data-testid="lecture"
        @click="store.lire()"
      >
        <i
          class="fas fa-play"
          aria-hidden="true"
        />
        Exécuter
      </button>
      <button
        v-else
        type="button"
        :class="BOUTON.principal"
        data-testid="pause"
        @click="store.pause()"
      >
        <i
          class="fas fa-pause"
          aria-hidden="true"
        />
        Pause
      </button>
      <button
        type="button"
        :class="[BOUTON.secondaire, 'col-span-2']"
        :disabled="!store.execution"
        data-testid="reinitialiser"
        @click="store.reinitialiser()"
      >
        <i
          class="fas fa-rotate-left"
          aria-hidden="true"
        />
        Réinitialiser l'exécution
      </button>
    </div>

    <p
      v-if="invalide"
      class="mt-3 text-base text-red-900"
    >
      Corrigez d'abord les problèmes signalés dans le workflow.
    </p>

    <div class="mt-3">
      <label
        for="vitesse"
        class="text-base text-gray-800"
      >Durée de chaque étape en exécution continue</label>
      <select
        id="vitesse"
        v-model.number="store.vitesse"
        :class="CHAMP"
      >
        <option :value="600">
          Rapide (0,6 seconde)
        </option>
        <option :value="1200">
          Normale (1,2 seconde)
        </option>
        <option :value="2500">
          Lente (2,5 secondes)
        </option>
      </select>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { useLaboratoireStore } from '@/stores/laboratoire'
import { BOUTON, CHAMP } from '../styles'

const store = useLaboratoireStore()
const invalide = computed(() => store.erreursValidation.length > 0)
</script>
