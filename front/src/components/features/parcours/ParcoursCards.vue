<template>
  <!-- Cartes des parcours : catalogue d'un public ou d'une rubrique -->
  <ul
    class="mt-6 grid gap-6 md:grid-cols-2"
    data-testid="parcours-list"
  >
    <li
      v-for="(item, index) in parcours"
      :key="item.id"
      :class="['surface-card', `surface-card--${cardVariants[index % cardVariants.length]}`, 'parcours-card group relative flex flex-col p-6']"
    >
      <div class="flex items-start gap-4">
        <!-- Place réservée à la miniature, même sans illustration, pour garder des cartes alignées -->
        <div
          class="parcours-thumb flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/70 sm:h-24 sm:w-24"
          data-testid="parcours-thumb"
        >
          <img
            v-if="item.illustration"
            :src="item.illustration.url"
            :alt="item.illustration.alt"
            width="96"
            height="96"
            loading="lazy"
            decoding="async"
            class="h-full w-full object-cover"
          >
          <i
            v-else
            class="fas fa-book-open text-3xl text-gray-500"
            aria-hidden="true"
          />
        </div>
        <div class="min-w-0 flex-1">
          <h3 class="text-2xl font-bold text-gray-900">
            <router-link
              :to="`/category/${item.name}`"
              class="parcours-link"
            >
              {{ item.title }}
            </router-link>
          </h3>
          <p
            v-if="item.summary"
            class="summary mt-2 text-lg text-gray-700"
          >
            {{ item.summary }}
          </p>
        </div>
      </div>
      <p class="mt-4 flex flex-wrap items-center gap-3 text-base text-gray-700">
        <span class="inline-flex items-center gap-2">
          <i
            class="fas fa-book-open"
            aria-hidden="true"
          />
          {{ item.courseCount }} cours
        </span>
        <span
          v-if="item.niveau"
          class="rounded-full bg-gray-100 px-3 py-1 font-semibold"
        >
          Niveau : {{ item.niveau }}
        </span>
      </p>
    </li>
  </ul>
</template>

<script setup>
defineProps({
  // Parcours préparés par buildParcours ou buildParcoursOfRubrique (utils/parcours.js)
  parcours: {
    type: Array,
    required: true,
  },
})

// Couleurs pastel inspirées des entrées colorées du menu desktop.
const cardVariants = ['blue', 'green', 'purple', 'amber']
</script>

<style scoped>
/* Le lien du titre couvre toute la carte */
.parcours-link::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 1rem;
}

.parcours-link:focus {
  outline: none;
}

/* Résumé limité à trois lignes sur la carte */
.summary {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
