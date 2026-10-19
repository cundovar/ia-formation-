<template>
  <!-- Parcours du menu regroupés par grande rubrique (SuperMenu), dans l'ordre des rubriques -->
  <div
    class="rubrique-menu"
    data-testid="rubrique-menu"
  >
    <template
      v-for="group in groups"
      :key="group.id ?? 'sans-rubrique'"
    >
      <details
        v-if="group.name"
        class="rubrique"
        :open="isOpen(group)"
      >
        <summary class="rubrique-summary">
          <span class="rubrique-name">{{ group.name }}</span>
          <i
            class="fas fa-chevron-down rubrique-chevron"
            aria-hidden="true"
          />
        </summary>
        <ul class="rubrique-parcours">
          <li
            v-for="cat in group.categories"
            :key="cat.id"
          >
            <CategoryMenuItem
              :cat="cat"
              :menus-by-category="menusByCategory"
              :hovered-category="hoveredCategory"
              :click-menu="clickMenu"
              :is-xl-ou-plus="isXlOuPlus"
              @open-menu="$emit('openMenu', $event)"
              @hover-category="$emit('hoverCategory', $event)"
              @close-menu="$emit('closeMenu')"
            />
          </li>
        </ul>
      </details>

      <!-- Parcours sans rubrique : à la suite, sous un titre seulement s'il existe des rubriques -->
      <div
        v-else
        class="rubrique"
      >
        <p
          v-if="groups.length > 1"
          class="rubrique-summary rubrique-summary--static"
        >
          <span class="rubrique-name">Autres parcours</span>
        </p>
        <ul class="rubrique-parcours">
          <li
            v-for="cat in group.categories"
            :key="cat.id"
          >
            <CategoryMenuItem
              :cat="cat"
              :menus-by-category="menusByCategory"
              :hovered-category="hoveredCategory"
              :click-menu="clickMenu"
              :is-xl-ou-plus="isXlOuPlus"
              @open-menu="$emit('openMenu', $event)"
              @hover-category="$emit('hoverCategory', $event)"
              @close-menu="$emit('closeMenu')"
            />
          </li>
        </ul>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import CategoryMenuItem from './CategoryMenuItem.vue'
import { groupByRubrique } from '@/utils/parcours'

const props = defineProps({
  cats: {
    type: Array,
    required: true
  },
  menusByCategory: {
    type: Object,
    required: true
  },
  hoveredCategory: {
    type: String,
    default: null
  },
  clickMenu: {
    type: String,
    default: null
  },
  isXlOuPlus: {
    type: Boolean,
    default: false
  }
})

defineEmits(['openMenu', 'hoverCategory', 'closeMenu'])

const route = useRoute()
const groups = computed(() => groupByRubrique(props.cats))

// Une rubrique est ouverte si elle contient le parcours affiché ; sinon seule la première l'est
const currentCategory = computed(() => String(route.params.category ?? '').toLowerCase())
const isOpen = (group) =>
  group.categories.some((cat) => cat.name?.toLowerCase() === currentCategory.value) ||
  (!currentCategory.value && group === groups.value[0])
</script>

<style scoped>
.rubrique-menu {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.rubrique {
  border-radius: 1rem;
  background: #eff6ff;
  box-shadow: 0 4px 12px rgb(15 23 42 / 6%);
}

.rubrique-summary {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 3rem;
  padding: 0.75rem 1rem;
  cursor: pointer;
  list-style: none;
  border-radius: 1rem;
}

.rubrique-summary::-webkit-details-marker {
  display: none;
}

.rubrique-summary:hover {
  background: #dbeafe;
}

.rubrique-summary:focus-visible {
  outline: 3px solid #1d4ed8;
  outline-offset: 2px;
}

.rubrique-summary--static {
  cursor: default;
}

.rubrique-summary--static:hover {
  background: transparent;
}

.rubrique-name {
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.3;
  color: #111827;
}

.rubrique-chevron {
  font-size: 0.875rem;
  color: #374151;
  transition: transform 160ms ease;
}

details[open] > .rubrique-summary .rubrique-chevron {
  transform: rotate(180deg);
}

.rubrique-parcours {
  list-style: none;
  margin: 0;
  /* Retrait à gauche : les parcours se lisent comme un sous-menu de la rubrique */
  padding: 0 0.5rem 0.5rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

@media (prefers-reduced-motion: reduce) {
  .rubrique-chevron {
    transition: none;
  }
}
</style>
