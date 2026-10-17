<template>
  <section
    v-if="messages.length"
    class="rounded-2xl border border-teal-200 bg-teal-50 p-4"
    aria-labelledby="mcp-titre"
    data-testid="messages-mcp"
  >
    <h3
      id="mcp-titre"
      class="text-xl font-bold text-gray-900"
    >
      Messages MCP échangés
    </h3>
    <p class="mt-1 text-base text-gray-800">
      Échanges JSON-RPC 2.0 avec le serveur fictif. Chaque réponse reprend le numéro (« id ») de la question.
    </p>
    <ol class="mt-3 space-y-3">
      <li
        v-for="message in messages"
        :key="message.etape"
        class="rounded-xl border border-teal-200 bg-white p-3"
      >
        <p class="text-lg font-bold text-gray-900">
          {{ message.requete.method }} (id {{ message.requete.id }}) :
          <span :class="message.reponse.error ? 'text-red-900' : 'text-green-900'">
            {{ message.reponse.error ? `erreur ${message.reponse.error.code}` : 'réponse reçue' }}
          </span>
        </p>
        <p class="mt-2 text-base font-semibold text-gray-900">
          Le client envoie :
        </p>
        <pre class="mt-1 max-h-48 overflow-auto rounded-lg bg-gray-50 p-2 text-sm text-gray-900">{{ json(message.requete) }}</pre>
        <p class="mt-2 text-base font-semibold text-gray-900">
          Le serveur répond :
        </p>
        <pre class="mt-1 max-h-48 overflow-auto rounded-lg bg-gray-50 p-2 text-sm text-gray-900">{{ json(message.reponse) }}</pre>
      </li>
    </ol>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { useLaboratoireStore } from '@/stores/laboratoire'
import { json } from '../styles'

const store = useLaboratoireStore()
const messages = computed(() => (store.execution?.evenements ?? []).filter((evenement) => evenement.type === 'mcp'))
</script>
