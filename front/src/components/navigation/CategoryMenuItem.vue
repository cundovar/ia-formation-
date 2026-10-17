<template>
  <!-- Un parcours du menu : sur ordinateur, le survol ouvre ses chapitres à droite ; sur mobile, un clic les déplie -->
  <div
    class="parcours-item"
    @mouseenter="isXlOuPlus && $emit('hoverCategory', cat.name)"
  >
    <router-link
      v-if="isXlOuPlus"
      :to="`/category/${cat.name}`"
      :class="['parcours-row', { 'parcours-row--active': isOpen }]"
      @click="$emit('closeMenu')"
      @focus="$emit('hoverCategory', cat.name)"
    >
      <span class="parcours-name">{{ cat.name }}</span>
      <i
        class="fas fa-chevron-right parcours-chevron"
        aria-hidden="true"
      />
    </router-link>
    <button
      v-else
      type="button"
      :class="['parcours-row', { 'parcours-row--active': isOpen }]"
      :aria-expanded="isOpen"
      @click="$emit('openMenu', cat.name)"
    >
      <span class="parcours-name">{{ cat.name }}</span>
      <i
        :class="['fas', isOpen ? 'fa-chevron-up' : 'fa-chevron-down', 'parcours-chevron']"
        aria-hidden="true"
      />
    </button>

    <!-- Chapitres et cours du parcours -->
    <div
      v-if="isOpen"
      class="parcours-panel div-scrollbar"
    >
      <router-link
        :to="`/category/${cat.name}`"
        class="parcours-all"
        @click="$emit('closeMenu')"
      >
        Voir le parcours
        <i
          class="fas fa-arrow-right"
          aria-hidden="true"
        />
      </router-link>

      <section
        v-for="group in menusByCategory[cat.name]"
        :key="group.label"
        class="parcours-chapter"
      >
        <p class="parcours-chapter-title">
          {{ group.label }}
        </p>
        <ul class="parcours-courses">
          <li
            v-for="menu in group.items"
            :key="menu.page.slug"
          >
            <router-link
              :to="`/pages${menu.page.slug}`"
              class="parcours-course"
              @click="$emit('closeMenu')"
            >
              <i
                class="fas fa-file-lines"
                aria-hidden="true"
              />
              <span>{{ menu.title }}</span>
            </router-link>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  cat: {
    type: Object,
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

const isOpen = computed(() =>
  props.isXlOuPlus ? props.hoveredCategory === props.cat.name : props.clickMenu === props.cat.name
)
</script>

<style scoped>
.parcours-item {
  position: relative;
}

.parcours-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  min-height: 2.75rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.75rem;
  text-align: left;
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.3;
  color: #1f2937;
  text-decoration: none;
  background: transparent;
  transition: background-color 160ms ease;
}

.parcours-row:hover,
.parcours-row--active {
  background: #fff;
}

.parcours-row--active {
  box-shadow: inset 4px 0 0 #93c5fd;
}

.parcours-row:focus-visible {
  outline: 3px solid #1d4ed8;
  outline-offset: 2px;
}

.parcours-name {
  flex: 1;
}

.parcours-chevron {
  font-size: 0.75rem;
  color: #4b5563;
}

/* Panneau des chapitres : à droite de la colonne sur ordinateur, sous le parcours sur mobile */
.parcours-panel {
  margin: 0.25rem 0 0.5rem;
  padding: 0.75rem;
  border-radius: 1rem;
  background: #fff;
  box-shadow: 0 8px 20px rgb(15 23 42 / 10%);
  max-height: 24rem;
  overflow-y: auto;
}

@media (min-width: 1280px) {
  .parcours-panel {
    position: absolute;
    top: 0;
    left: calc(100% + 1rem);
    z-index: 40;
    width: 24rem;
    margin: 0;
  }
}

.parcours-all {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  padding: 0.25rem 0.5rem;
  border-radius: 0.5rem;
  font-weight: 700;
  color: #1e3a8a;
  text-decoration: underline;
}

.parcours-all:focus-visible,
.parcours-course:focus-visible {
  outline: 3px solid #1d4ed8;
  outline-offset: 2px;
}

.parcours-chapter + .parcours-chapter {
  margin-top: 0.5rem;
}

.parcours-chapter-title {
  padding: 0.25rem 0.5rem;
  font-size: 0.875rem;
  font-weight: 700;
  color: #4b5563;
}

.parcours-courses {
  list-style: none;
  margin: 0;
  padding: 0;
}

.parcours-course {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  min-height: 2.5rem;
  padding: 0.5rem;
  border-radius: 0.5rem;
  font-size: 0.95rem;
  line-height: 1.35;
  color: #1f2937;
  text-decoration: none;
}

.parcours-course i {
  margin-top: 0.2rem;
  color: #1e40af;
}

.parcours-course:hover {
  background: #eff6ff;
}

@media (prefers-reduced-motion: reduce) {
  .parcours-row {
    transition: none;
  }
}
</style>
