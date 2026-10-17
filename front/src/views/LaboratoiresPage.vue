<template>
  <div class="min-h-screen px-4 pb-40 pt-6 md:px-10 xl:pt-0">
    <div class="mx-auto max-w-5xl">
      <!-- Fil d'Ariane -->
      <nav
        aria-label="Fil d'Ariane"
        class="text-lg"
      >
        <ol class="flex flex-wrap items-center gap-2 text-gray-700">
          <li>
            <router-link
              to="/"
              class="text-blue-800 underline"
            >
              Accueil
            </router-link>
          </li>
          <li aria-hidden="true">
            <i class="fas fa-chevron-right text-sm" />
          </li>
          <li aria-current="page">
            Laboratoires
          </li>
        </ol>
      </nav>

      <header class="mt-6 flex flex-col gap-5 md:flex-row md:items-center">
        <div
          class="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-rose-100"
          aria-hidden="true"
        >
          <i class="fas fa-flask text-3xl text-gray-900" />
        </div>
        <div>
          <h1 class="text-3xl font-bold text-gray-900 md:text-4xl">
            Laboratoires IA
          </h1>
          <p class="mt-2 text-xl text-gray-700">
            Construisez des automatisations et des agents, lancez-les et observez chaque étape. Tout est simulé dans votre navigateur : pas de compte, pas de clé, aucune donnée enregistrée.
          </p>
        </div>
      </header>

      <div class="mt-8 max-w-xs">
        <label
          for="filtre-niveau"
          class="text-lg font-semibold text-gray-900"
        >Niveau</label>
        <select
          id="filtre-niveau"
          v-model="niveau"
          :class="CHAMP"
          data-testid="filtre-niveau"
        >
          <option value="">
            Tous les niveaux
          </option>
          <option
            v-for="(libelle, cle) in NIVEAUX"
            :key="cle"
            :value="cle"
          >
            {{ libelle }}
          </option>
        </select>
      </div>

      <ul
        v-if="laboratoires.length"
        class="mt-6 grid gap-6 md:grid-cols-2"
        data-testid="laboratoires"
      >
        <li
          v-for="(lab, index) in laboratoires"
          :key="lab.slug"
          :class="['surface-card', `surface-card--${variantes[index % variantes.length]}`, 'entry-card group relative flex flex-col p-6']"
        >
          <p class="text-base font-semibold text-gray-800">
            {{ NIVEAUX[lab.niveau] }} · {{ lab.duree }}
          </p>
          <h2 class="mt-1 text-xl font-bold text-gray-900 md:text-2xl">
            <router-link
              :to="`/laboratoires/${lab.slug}`"
              class="entry-link"
            >
              {{ lab.titre }}
            </router-link>
          </h2>
          <p class="mt-2 text-lg text-gray-700">
            {{ lab.objectif }}
          </p>
          <span
            class="mt-auto inline-flex items-center gap-2 self-start pt-4 text-lg font-bold text-blue-800 group-hover:underline"
            aria-hidden="true"
          >
            Pratiquer
            <i class="fas fa-arrow-right transition-transform duration-300 group-hover:translate-x-1" />
          </span>
        </li>
      </ul>
      <p
        v-else
        class="mt-6 rounded-2xl bg-white p-6 text-lg text-gray-700 shadow"
        data-testid="laboratoires-vide"
      >
        Aucun laboratoire pour ce niveau pour le moment. Choisissez « Tous les niveaux ».
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { listerLaboratoires, NIVEAUX } from '@/laboratoires/catalogue'
import { CHAMP } from '@/components/features/laboratoires/styles'

const variantes = ['blue', 'green', 'amber', 'purple']
const niveau = ref('')

const laboratoires = computed(() => listerLaboratoires().filter((lab) => !niveau.value || lab.niveau === niveau.value))
</script>

<style scoped>
/* Le lien du titre couvre toute la carte (même principe que l'accueil) */
.entry-link::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 1rem;
}

.entry-link:focus {
  outline: none;
}
</style>
