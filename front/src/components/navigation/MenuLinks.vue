<template>
  <!--
    Menu sur mobile et tablette : mêmes entrées que la colonne d'ordinateur, parcours dépliables au toucher.
    shrink-0 : dans la colonne flexible, le menu défile au lieu d'être écrasé ; pb-28 : la dernière entrée
    reste visible au-dessus de la barre de navigation du bas.
  -->
  <div class="shrink-0 text-2xl max-md:text-xl xl:hidden max-md:drop-shadow-xl pb-28 mt-4 pl-1">
    <div
      v-for="audience in AUDIENCES"
      :key="audience.key"
      class="mt-4"
    >
      <div :class="[audience.menuBgClass, 'flex items-stretch shadow-neutral-600']">
        <router-link
          :to="audience.path"
          :class="[
            audience.menuHoverClass,
            'flex-1 min-w-0 text-lg min-h-[3rem] cursor-pointer p-2 text-gray-900 font-bold hover:underline flex items-center gap-2 break-words'
          ]"
          @click="$emit('closeMenu')"
        >
          <i
            :class="audience.icon"
            aria-hidden="true"
          />
          <span class="min-w-0">{{ audience.title }}</span>
        </router-link>
        <button
          v-if="parcours[audience.key].length"
          type="button"
          :class="[audience.menuHoverClass, 'shrink-0 w-12 flex items-center justify-center text-gray-900 text-base focus-visible:outline focus-visible:outline-3 focus-visible:outline-blue-800']"
          :aria-expanded="ouverts[audience.key]"
          :aria-controls="`parcours-${audience.key}-mobile`"
          :aria-label="`${ouverts[audience.key] ? 'Masquer' : 'Afficher'} les parcours : ${audience.title}`"
          :data-testid="`deplier-${audience.key}-mobile`"
          @click="ouverts[audience.key] = !ouverts[audience.key]"
        >
          <i
            :class="['fas', ouverts[audience.key] ? 'fa-chevron-up' : 'fa-chevron-down']"
            aria-hidden="true"
          />
        </button>
      </div>
      <div
        v-if="ouverts[audience.key] && parcours[audience.key].length"
        :id="`parcours-${audience.key}-mobile`"
        :class="['audience-panel text-base', audience.menuPanelClass]"
        role="region"
        :aria-label="`Parcours : ${audience.title}`"
      >
        <CategoryMenu
          :cats="parcours[audience.key]"
          :menus-by-category="menusByCategory"
          :click-menu="clickMenu"
          :is-xl-ou-plus="false"
          @open-menu="$emit('openMenu', $event)"
          @close-menu="$emit('closeMenu')"
        />
      </div>
    </div>
    <router-link
      to="/qcm"
      class="text-lg min-h-[3rem] cursor-pointer mt-4 shadow-neutral-600 bg-purple-300 p-2 hover:bg-purple-400 text-gray-900 font-bold hover:underline flex items-center gap-2"
      @click="$emit('closeMenu')"
    >
      <i
        class="fas fa-brain"
        aria-hidden="true"
      />
      QCM
    </router-link>
    <router-link
      to="/laboratoires"
      class="text-lg min-h-[3rem] cursor-pointer mt-4 shadow-neutral-600 bg-rose-200 p-2 hover:bg-rose-300 text-gray-900 font-bold hover:underline flex items-center gap-2"
      @click="$emit('closeMenu')"
    >
      <i
        class="fas fa-flask"
        aria-hidden="true"
      />
      Laboratoires
    </router-link>
  </div>
</template>

<script setup>
import { computed, reactive } from 'vue';
import CategoryMenu from './CategoryMenu.vue';
import { AUDIENCES, catsParAudience } from '@/config/audiences';

const props = defineProps({
  cats: { type: Array, default: () => [] },
  menusByCategory: { type: Object, default: () => ({}) },
  clickMenu: { type: String, default: null },
});

defineEmits(['closeMenu', 'openMenu']);

// Entrées dépliées, et parcours de chaque entrée (même logique pour « J'apprends » et « Je forme »)
const ouverts = reactive(Object.fromEntries(AUDIENCES.map((audience) => [audience.key, false])));
const parcours = computed(() => catsParAudience(props.cats));
</script>
