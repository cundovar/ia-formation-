<template>
  <div class="min-h-screen px-4 pb-40 pt-6 md:px-10 xl:pt-0">
    <div class="mx-auto max-w-6xl">
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
          <li>
            <router-link
              to="/laboratoires"
              class="text-blue-800 underline"
            >
              Laboratoires
            </router-link>
          </li>
          <li aria-hidden="true">
            <i class="fas fa-chevron-right text-sm" />
          </li>
          <li aria-current="page">
            {{ laboratoire ? laboratoire.titre : 'Laboratoire introuvable' }}
          </li>
        </ol>
      </nav>

      <template v-if="laboratoire">
        <header class="mt-6">
          <h1 class="text-3xl font-bold text-gray-900 md:text-4xl">
            {{ laboratoire.titre }}
          </h1>
          <p class="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-lg text-gray-700">
            <span><i
              class="fas fa-signal mr-2"
              aria-hidden="true"
            />Niveau : {{ NIVEAUX[laboratoire.niveau] }}</span>
            <span><i
              class="fas fa-clock mr-2"
              aria-hidden="true"
            />Durée : {{ laboratoire.duree }}</span>
          </p>
          <p
            v-if="prerequis.length"
            class="mt-2 text-lg text-gray-700"
          >
            À faire avant :
            <template
              v-for="(lab, index) in prerequis"
              :key="lab.slug"
            >
              <router-link
                :to="`/laboratoires/${lab.slug}`"
                class="font-semibold text-blue-800 underline"
              >
                {{ lab.titre }}
              </router-link><span v-if="index < prerequis.length - 1">, </span>
            </template>
          </p>
        </header>

        <div class="mt-6">
          <LaboratoirePlayer
            :key="laboratoire.slug"
            :laboratoire="laboratoire"
          />
        </div>
      </template>

      <div
        v-else
        class="mt-6 rounded-2xl bg-white p-6 text-lg text-gray-700 shadow"
        data-testid="laboratoire-introuvable"
      >
        <p>Ce laboratoire n'existe pas ou n'est plus disponible.</p>
        <router-link
          to="/laboratoires"
          class="mt-3 inline-block font-bold text-blue-800 underline"
        >
          Voir tous les laboratoires
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { NIVEAUX, trouverLaboratoire } from '@/laboratoires/catalogue'
import LaboratoirePlayer from '@/components/features/laboratoires/LaboratoirePlayer.vue'

const props = defineProps({
  slug: { type: String, required: true },
})

const laboratoire = computed(() => trouverLaboratoire(props.slug))
const prerequis = computed(() => (laboratoire.value?.prerequis ?? []).map(trouverLaboratoire).filter(Boolean))
</script>
