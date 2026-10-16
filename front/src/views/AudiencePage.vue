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
            {{ audience.title }}
          </li>
        </ol>
      </nav>

      <header class="mt-6 flex flex-col gap-5 md:flex-row md:items-center">
        <div
          :class="[audience.iconBgClass, 'flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl']"
          aria-hidden="true"
        >
          <i :class="[audience.icon, 'text-3xl text-gray-900']" />
        </div>
        <div>
          <h1 class="text-3xl font-bold text-gray-900 md:text-4xl">
            {{ audience.title }}
          </h1>
          <p class="mt-2 text-xl text-gray-700">
            {{ audience.lead }}
          </p>
        </div>
      </header>

      <!-- Parcours de ce public -->
      <section
        class="mt-10"
        aria-labelledby="parcours-title"
      >
        <h2
          id="parcours-title"
          class="text-2xl font-bold text-gray-900"
        >
          Choisissez un parcours
        </h2>

        <p
          v-if="loading"
          class="mt-6 text-lg text-gray-700"
          role="status"
        >
          Chargement des parcours…
        </p>

        <ParcoursCards
          v-else-if="parcours.length"
          :parcours="parcours"
        />

        <div
          v-else
          class="mt-6 rounded-2xl bg-white p-6 text-lg text-gray-700 shadow"
          data-testid="parcours-empty"
        >
          <p>Les premiers parcours sont en préparation. Revenez bientôt !</p>
          <p
            v-if="selectedNiveau"
            class="mt-2"
          >
            Un niveau est choisi en haut de la page : essayez « Tous les niveaux » pour voir tous les parcours.
          </p>
        </div>
      </section>

      <!-- Passage vers l'autre public -->
      <p class="mt-12 text-lg text-gray-800">
        {{ audience.otherAudienceText }}
        <router-link
          :to="otherAudience.path"
          class="font-bold text-blue-800 underline"
        >
          {{ otherAudience.title }}
        </router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { getAudience, getOtherAudience } from '@/config/audiences'
import { useData } from '@/utils/fetchDataPwa'
import { buildParcours } from '@/utils/parcours'
import { useNiveauStore } from '@/stores/niveauCoursStore'
import ParcoursCards from '@/components/features/parcours/ParcoursCards.vue'

const props = defineProps({
  audienceKey: {
    type: String,
    required: true,
  },
})

const audience = computed(() => getAudience(props.audienceKey))
const otherAudience = computed(() => getOtherAudience(props.audienceKey))

const { fetchMenus, menus, cats } = useData()
const { selectedNiveau } = storeToRefs(useNiveauStore())

const loading = ref(cats.value.length === 0)
const parcours = computed(() =>
  buildParcours(cats.value, menus.value, props.audienceKey, selectedNiveau.value)
)

onMounted(async () => {
  try {
    await fetchMenus()
  } finally {
    loading.value = false
  }
})
</script>
