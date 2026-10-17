<template>
  <div class="home min-h-screen px-4 pb-40 pt-6 md:px-10 xl:pt-0">
    <!-- Présentation -->
    <section
      class="mx-auto max-w-5xl text-center"
      aria-labelledby="home-title"
    >
      <h1
        id="home-title"
        class="text-4xl font-bold md:text-5xl"
      >
        L'intelligence artificielle, pas à pas
      </h1>
      <p class="mx-auto mt-5 max-w-3xl text-xl text-gray-700 md:text-2xl">
        Des cours gratuits et sans inscription, à suivre seul chez soi ou en atelier.
      </p>
    </section>

    <!-- Grandes rubriques : rubrique → parcours → modules → cours -->
    <section
      v-if="rubriques.length"
      class="mx-auto mt-10 max-w-6xl"
      aria-labelledby="rubriques-title"
    >
      <h2
        id="rubriques-title"
        class="text-center text-2xl font-bold text-gray-900 md:text-3xl"
      >
        Choisissez une rubrique
      </h2>
      <ul
        class="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3"
        data-testid="rubriques-list"
      >
        <li
          v-for="(rubrique, index) in rubriques"
          :key="rubrique.id"
          :class="['surface-card', `surface-card--${cardVariants[index % cardVariants.length]}`, 'entry-card group relative flex flex-col p-6']"
        >
          <h3 class="text-xl font-bold text-gray-900 md:text-2xl">
            <router-link
              :to="`/rubrique/${rubrique.id}`"
              class="entry-link"
            >
              {{ rubrique.name }}
            </router-link>
          </h3>
          <ul class="mt-3 space-y-1 text-lg text-gray-700">
            <li
              v-for="item in rubrique.parcours"
              :key="item.id"
              class="flex items-start gap-2"
            >
              <i
                class="fas fa-angle-right mt-1.5 text-gray-500"
                aria-hidden="true"
              />
              <span>{{ item.title }}</span>
            </li>
          </ul>
          <span
            class="mt-auto inline-flex items-center gap-2 self-start pt-4 text-lg font-bold text-blue-800 group-hover:underline"
            aria-hidden="true"
          >
            {{ rubrique.parcours.length }} parcours
            <i class="fas fa-arrow-right transition-transform duration-300 group-hover:translate-x-1" />
          </span>
        </li>
      </ul>
    </section>

    <!-- Les deux entrées du site -->
    <h2
      v-if="rubriques.length"
      class="mx-auto mt-14 max-w-5xl text-center text-2xl font-bold text-gray-900 md:text-3xl"
    >
      Ou choisissez selon votre profil
    </h2>
    <nav
      :class="['mx-auto grid max-w-5xl gap-6 md:grid-cols-2', rubriques.length ? 'mt-6' : 'mt-10']"
      aria-label="Choisir votre parcours"
    >
      <article
        v-for="audience in AUDIENCES"
        :key="audience.key"
        :class="[
          'surface-card entry-card group relative flex flex-col p-6 md:p-8',
          audience.cardBgClass
        ]"
        :data-testid="`entry-${audience.key}`"
      >
        <div
          :class="[audience.iconBgClass, 'mb-5 flex h-16 w-16 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110']"
          aria-hidden="true"
        >
          <i :class="[audience.icon, 'text-3xl text-gray-900']" />
        </div>

        <h2 class="text-2xl font-bold text-gray-900 md:text-3xl">
          <!-- Lien étiré : toute la carte est cliquable, le nom accessible reste le titre -->
          <router-link
            :to="audience.path"
            class="entry-link"
          >
            {{ audience.title }}
          </router-link>
        </h2>

        <p class="mt-3 text-lg text-gray-700">
          {{ audience.lead }}
        </p>

        <p class="mt-5 text-lg font-semibold text-gray-800">
          Par exemple :
        </p>
        <ul class="mt-2 space-y-2 text-lg text-gray-700">
          <li
            v-for="example in audience.examples"
            :key="example"
            class="flex items-start gap-3"
          >
            <i
              class="fas fa-check mt-1.5 text-green-700"
              aria-hidden="true"
            />
            <span>{{ example }}</span>
          </li>
        </ul>

        <span
          class="mt-6 inline-flex items-center gap-2 self-start text-lg font-bold text-blue-800 group-hover:underline"
          aria-hidden="true"
        >
          Commencer
          <i class="fas fa-arrow-right transition-transform duration-300 group-hover:translate-x-1" />
        </span>
      </article>
    </nav>

    <!-- Comment ça marche -->
    <section
      class="mx-auto mt-14 max-w-5xl"
      aria-labelledby="how-title"
    >
      <h2
        id="how-title"
        class="text-center text-2xl font-bold text-gray-900 md:text-3xl"
      >
        Comment ça marche ?
      </h2>
      <ul class="mt-6 grid gap-5 md:grid-cols-3">
        <li
          v-for="point in howItWorks"
          :key="point.title"
          class="rounded-2xl bg-white p-6 shadow"
        >
          <i
            :class="[point.icon, 'text-2xl text-blue-800']"
            aria-hidden="true"
          />
          <h3 class="mt-3 text-xl font-bold text-gray-900">
            {{ point.title }}
          </h3>
          <p class="mt-2 text-lg text-gray-700">
            {{ point.text }}
          </p>
        </li>
      </ul>
    </section>

    <!-- Laboratoires : pratiquer avec des workflows simulés -->
    <section
      class="surface-card surface-card--white entry-card group relative mx-auto mt-10 flex max-w-5xl flex-col gap-4 p-6 md:flex-row md:items-center"
      aria-labelledby="labos-title"
      data-testid="entry-laboratoires"
    >
      <div
        class="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-rose-100"
        aria-hidden="true"
      >
        <i class="fas fa-flask text-3xl text-gray-900" />
      </div>
      <div>
        <h2
          id="labos-title"
          class="text-2xl font-bold text-gray-900"
        >
          <router-link
            to="/laboratoires"
            class="entry-link"
          >
            Laboratoires : apprendre en manipulant
          </router-link>
        </h2>
        <p class="mt-2 text-lg text-gray-700">
          Construisez une automatisation bloc par bloc, lancez-la et regardez ce qui se passe à chaque étape. Tout est simulé dans votre navigateur.
        </p>
      </div>
    </section>

    <!-- Le site n'est pas un service officiel -->
    <aside
      class="mx-auto mt-10 flex max-w-5xl items-start gap-4 rounded-2xl border-l-8 border-amber-500 bg-amber-50 p-6"
      aria-label="À savoir"
    >
      <i
        class="fas fa-circle-info mt-1 text-2xl text-amber-700"
        aria-hidden="true"
      />
      <p class="text-lg text-gray-800">
        Ce site n'est pas un service de l'administration ni d'un éditeur d'IA. Il vous apprend à vous servir
        des outils d'IA : leurs réponses peuvent être fausses, vérifiez-les toujours auprès d'une source fiable.
        N'indiquez jamais vos identifiants, mots de passe ou données personnelles, ni sur ce site ni dans une IA.
      </p>
    </aside>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { AUDIENCES } from '@/config/audiences'
import { useData } from '@/utils/fetchDataPwa'
import { buildRubriques } from '@/utils/parcours'
import { useNiveauStore } from '@/stores/niveauCoursStore'

// Couleurs pastel des cartes, comme celles des parcours
const cardVariants = ['blue', 'green', 'purple', 'amber']

const { fetchMenus, menus, cats } = useData()
const { selectedNiveau } = storeToRefs(useNiveauStore())
const rubriques = computed(() => buildRubriques(cats.value, menus.value, selectedNiveau.value))

onMounted(() => {
  fetchMenus()
})

const howItWorks = [
  {
    icon: 'fas fa-gift',
    title: 'Gratuit, sans compte',
    text: 'Aucune inscription : vous ouvrez un cours et vous commencez.',
  },
  {
    icon: 'fas fa-shoe-prints',
    title: 'Pas à pas',
    text: "Chaque cours montre un exemple, puis vous essayez vous-même dans l'outil d'IA, à votre rythme.",
  },
  {
    icon: 'fas fa-people-roof',
    title: 'Seul ou en atelier',
    text: 'Les cours se suivent chez soi ou avec un formateur, sur ordinateur, tablette ou téléphone.',
  },
]
</script>

<style scoped>
/* Le lien du titre couvre toute la carte */
.entry-link::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 1rem;
}

.entry-link:focus {
  outline: none;
}

/* Contour de focus bien visible au clavier, sur toute la carte */
</style>
