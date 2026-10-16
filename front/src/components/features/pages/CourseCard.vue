<template>
  <AppCard
    :title="title"
    :icon="iconClass"
    :items="menus"
    :show-footer="true"
    footer-text="cours"
    footer-icon="fas fa-book"
  >
    <template #item="{ item }">
      <router-link
        :to="`/pages${item.page.slug}`"
        class="course-link"
      >
        <div class="course-info">
          <i class="fas fa-file-lines course-item-icon" />
          <span class="course-name"> {{ item.title }}</span>
        </div>
        <i class="fas fa-arrow-right course-arrow" />
      </router-link>
    </template>
  </AppCard>
</template>

<script setup>
import AppCard from '@/components/ui/AppCard.vue'

defineProps({
  title: {
    type: String,
    required: true
  },
  menus: {
    type: Array,
    required: true
  },
  iconClass: {
    type: String,
    default: 'fas fa-book'
  }
})
</script>

<style scoped>
.course-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 15px 18px;
  text-decoration: none;
  color: inherit;
  border-radius: 12px;
  transition: background-color 160ms ease;
  min-height: 3.25rem;
}

.course-info { display: flex; align-items: center; flex: 1; }
.course-item-icon { font-size: 16px; color: #334155; margin-right: 12px; width: 20px; text-align: center; }
.course-name { font-size: 16px; font-weight: 500; color: #334155; line-height: 1.4; }
.course-arrow { font-size: 14px; color: #334155; transition: transform 160ms ease; }
.course-link:hover .course-arrow { transform: translateX(4px); }
.course-link:hover, .course-link:focus-visible { background: #dbeafe; }
.course-link:focus-visible { outline: 3px solid #1d4ed8; outline-offset: 2px; }
</style>
