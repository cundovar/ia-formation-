<template>
  <button
    :class="ajoutClass"
    type="button"
    class="flex items-center max-xl:hidden justify-center z-40 cursor-pointer shadow p-2 rounded-md bg-rose-200 hover:bg-rose-300 focus-visible:outline focus-visible:outline-3 focus-visible:outline-blue-800 transition-colors"
    :aria-label="label"
    @click="fonction"
  >
    <i
      :class="isOpen ? 'pi pi-chevron-right' : 'pi pi-chevron-left'"
      class="text-gray-900"
      aria-hidden="true"
    />
  </button>
</template>


<script setup>

const { isOpen, fonction, ajoutClass, label } = defineProps({
  isOpen: { type: Boolean, required: true },
  fonction: { type: Function, required: true },
  ajoutClass: { type: [String, Array, Object], default: '' }, // accepte "absolute right-0 top-6" ou un objet/array
  label: { type: String, default: 'Replier ou déplier le menu' },
})

</script>



        