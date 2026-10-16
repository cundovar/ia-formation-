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
            {{ rubrique?.name ?? 'Rubrique' }}
          </li>
        </ol>
      </nav>

      <p
        v-if="loading"
        class="mt-6 text-lg text-gray-700"
        role="status"
      >
        Chargement de la rubrique…
      </p>

      <template v-else-if="rubrique">
        <header class="mt-6 flex flex-col gap-5 md:flex-row md:items-center">
          <div
            class="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-blue-100"
            aria-hidden="true"
          >
            <i class="fas fa-layer-group text-3xl text-gray-900" />
          </div>
          <div>
            <h1 class="text-3xl font-bold text-gray-900 md:text-4xl">
              {{ rubrique.name }}
            </h1>
            <p class="mt-2 text-xl text-gray-700">
              {{ rubrique.parcours.length }} parcours dans cette rubrique.
            </p>
          </div>
        </header>

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
          <ParcoursCards :parcours="rubrique.parcours" />
        </section>
      </template>

      <div
        v-else
        class="mt-6 rounded-2xl bg-white p-6 text-lg text-gray-700 shadow"
        data-testid="rubrique-empty"
      >
        <p>Cette rubrique n'a pas encore de parcours publié.</p>
        <router-link
          to="/"
          class="mt-2 inline-block font-bold text-blue-800 underline"
        >
          Retour à l'accueil
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useData } from '@/utils/fetchDataPwa'
import { buildRubriques } from '@/utils/parcours'
import { useNiveauStore } from '@/stores/niveauCoursStore'
import ParcoursCards from '@/components/features/parcours/ParcoursCards.vue'

const props = defineProps({
  id: {
    type: [String, Number],
    required: true,
  },
})

const { fetchMenus, menus, cats } = useData()
const { selectedNiveau } = storeToRefs(useNiveauStore())

const loading = ref(cats.value.length === 0)
const rubrique = computed(() =>
  buildRubriques(cats.value, menus.value, selectedNiveau.value).find((item) => item.id === Number(props.id)) ?? null
)

onMounted(async () => {
  try {
    await fetchMenus()
  } finally {
    loading.value = false
  }
})
</script>
