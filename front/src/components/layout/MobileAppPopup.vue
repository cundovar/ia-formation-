<template>
  <AppModal
    :model-value="true"
    title="Installer le site"
    size="sm"
    closable
    @close="$emit('close')"
  >
    <!-- Section commentée pour installation PWA -->
    <div class="text-center">
      <p class="text-gray-800 text-lg mb-4">
        Vous pouvez ajouter ce site sur l'écran d'accueil de votre téléphone. Il s'ouvrira comme une application.
      </p>

      <div class="flex flex-col gap-3">
        <AppButton
          variant="primary"
          icon="pi-download"
          text-content="Installer l'application"
          @click="$emit('install')"
        />

        <!-- Explications si le navigateur ne propose pas l'installation directe -->
        <p
          role="status"
          aria-live="polite"
          class="text-left text-lg text-gray-900"
          data-testid="instructions-installation"
        >
          {{ instructions }}
        </p>

        <!-- {# <a
          :href="currentOrigin"
          class="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-green-700 transition-colors"
        >
          <i class="pi pi-external-link"></i>
          Ouvrir dans le navigateur
        </a> #}-->
      </div>
    </div>
  </AppModal>
</template>

<script setup>
import AppModal from '../ui/AppModal.vue';
import AppButton from '../ui/AppButton.vue';

defineProps({
  currentOrigin: {
    type: String,
    default: ''
  },
  instructions: {
    type: String,
    default: ''
  }
});

defineEmits(['close', 'install']);
</script>
