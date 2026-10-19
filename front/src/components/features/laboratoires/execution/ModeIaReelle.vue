<template>
  <section
    class="rounded-2xl border border-indigo-200 bg-indigo-50 p-4"
    aria-labelledby="ia-reelle-titre"
    data-testid="mode-ia-reelle"
  >
    <h3
      id="ia-reelle-titre"
      class="text-xl font-bold text-gray-900"
    >
      Essayer avec une vraie IA (facultatif)
    </h3>
    <p class="mt-2 text-base text-gray-900">
      Par défaut, l'agent suit des règles écrites à l'avance. Avec votre propre clé d'API, vous pouvez confier le bloc Agent à un vrai modèle et comparer. Le reste du laboratoire reste simulé.
    </p>

    <fieldset class="mt-3">
      <legend class="text-base font-semibold text-gray-900">
        Mode de l'agent
      </legend>
      <div class="mt-2 flex flex-wrap gap-4">
        <label class="inline-flex min-h-11 items-center gap-2 text-lg text-gray-900">
          <input
            type="radio"
            name="mode-agent"
            class="h-5 w-5 accent-blue-700"
            :checked="!ia.actif"
            data-testid="mode-simulation"
            @change="ia.activer(false)"
          >
          Simulation
        </label>
        <label class="inline-flex min-h-11 items-center gap-2 text-lg text-gray-900">
          <input
            type="radio"
            name="mode-agent"
            class="h-5 w-5 accent-blue-700"
            :checked="ia.actif"
            :disabled="horsLigne"
            data-testid="mode-reel"
            @change="ia.activer(true)"
          >
          IA réelle, avec ma clé
        </label>
      </div>
    </fieldset>

    <p
      v-if="horsLigne"
      class="mt-2 text-base text-gray-900"
      data-testid="ia-hors-ligne"
    >
      Vous êtes hors ligne : seule la simulation est disponible.
    </p>

    <div
      v-if="ia.actif"
      class="mt-4 space-y-4"
    >
      <div
        class="rounded-xl border border-amber-300 bg-amber-50 p-3 text-base text-gray-900"
        data-testid="ia-avertissements"
      >
        <p class="font-semibold">
          Avant d'utiliser votre clé :
        </p>
        <ul class="mt-1 list-disc space-y-1 pl-5">
          <li>Chaque réponse est facturée par le fournisseur, sur votre compte. Fixez un plafond de dépense sur sa page officielle.</li>
          <li data-testid="ia-lieu-donnees">
            La consigne de l'agent et la donnée qu'il reçoit partent chez {{ lieuDonnees }}. Ses conditions d'utilisation disent si ces contenus peuvent être conservés ou réutilisés. N'y écrivez rien de personnel ni de confidentiel.
          </li>
          <li>Votre clé est un mot de passe. Elle n'est envoyée qu'au fournisseur, jamais à ce site, et elle est oubliée en quittant la page.</li>
          <li>Les objectifs du laboratoire restent vérifiés en simulation : une vraie IA ne répond jamais deux fois pareil.</li>
        </ul>
      </div>

      <div>
        <label
          for="ia-fournisseur"
          class="text-base font-semibold text-gray-900"
        >Fournisseur</label>
        <select
          id="ia-fournisseur"
          :value="ia.fournisseur"
          :class="CHAMP"
          aria-describedby="ia-fournisseur-aide"
          @change="ia.choisirFournisseur($event.target.value)"
        >
          <option
            v-for="fournisseur in fournisseurs"
            :key="fournisseur.id"
            :value="fournisseur.id"
          >
            {{ fournisseur.libelle }}
          </option>
        </select>
        <p
          id="ia-fournisseur-aide"
          class="mt-1 text-base text-gray-700"
        >
          Seuls les fournisseurs qui acceptent un appel direct depuis le navigateur sont proposés. Ce site n'a aucun lien avec eux.
        </p>
      </div>

      <div>
        <label
          for="ia-modele"
          class="text-base font-semibold text-gray-900"
        >Modèle</label>
        <select
          id="ia-modele"
          :value="ia.modele"
          :class="CHAMP"
          @change="ia.choisirModele($event.target.value)"
        >
          <option
            v-for="modele in ia.fournisseurChoisi?.modeles ?? []"
            :key="modele.id"
            :value="modele.id"
          >
            {{ modele.libelle }}
          </option>
        </select>
      </div>

      <div>
        <label
          for="ia-cle"
          class="text-base font-semibold text-gray-900"
        >Votre clé d'API</label>
        <input
          id="ia-cle"
          :value="ia.cle"
          type="password"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          :class="CHAMP"
          aria-describedby="ia-cle-aide"
          data-testid="ia-cle"
          @input="ia.definirCle($event.target.value)"
        >
        <p
          id="ia-cle-aide"
          class="mt-1 text-base text-gray-700"
        >
          <template v-if="formatDouteux">
            Cette clé ne ressemble pas à une clé {{ ia.fournisseurChoisi?.libelle }} : vérifiez la copie.
          </template>
          <template v-else>
            Créez-la sur la page officielle du fournisseur.
          </template>
          <template v-if="ia.fournisseurChoisi?.aideCle">
            {{ ia.fournisseurChoisi.aideCle }}
          </template>
          <a
            v-if="ia.fournisseurChoisi"
            :href="ia.fournisseurChoisi.pageCles"
            target="_blank"
            rel="noopener noreferrer"
            class="font-semibold text-blue-800 underline"
          >Clés d'API (nouvel onglet)</a>,
          <a
            v-if="ia.fournisseurChoisi"
            :href="ia.fournisseurChoisi.pageFacturation"
            target="_blank"
            rel="noopener noreferrer"
            class="font-semibold text-blue-800 underline"
          >facturation et plafond (nouvel onglet)</a>.
        </p>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <button
          type="button"
          :class="BOUTON.principal"
          :disabled="!ia.cle.trim() || ia.test.etat === 'en_cours'"
          data-testid="ia-tester"
          @click="ia.tester()"
        >
          <i
            class="fas fa-plug-circle-check"
            aria-hidden="true"
          />
          Tester ma clé
        </button>
        <button
          type="button"
          :class="BOUTON.secondaire"
          data-testid="ia-oublier"
          @click="oublier"
        >
          <i
            class="fas fa-eraser"
            aria-hidden="true"
          />
          Oublier ma clé
        </button>
      </div>

      <p
        class="text-base text-gray-900"
        role="status"
        data-testid="ia-etat"
      >
        {{ etat }}
      </p>
    </div>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { FOURNISSEURS } from '@/services/iaReelle'
import { useIaReelleStore } from '@/stores/iaReelle'
import { useLaboratoireStore } from '@/stores/laboratoire'
import { BOUTON, CHAMP } from '../styles'

const ia = useIaReelleStore()
const laboratoire = useLaboratoireStore()
const fournisseurs = Object.values(FOURNISSEURS)

const horsLigne = ref(typeof navigator !== 'undefined' && navigator.onLine === false)
const majConnexion = () => {
  horsLigne.value = navigator.onLine === false
  if (horsLigne.value) ia.activer(false)
}
onMounted(() => {
  window.addEventListener('online', majConnexion)
  window.addEventListener('offline', majConnexion)
})
onBeforeUnmount(() => {
  window.removeEventListener('online', majConnexion)
  window.removeEventListener('offline', majConnexion)
})

// « Anthropic, qui les traite aux États-Unis, hors de l'Union européenne »
const lieuDonnees = computed(() => {
  const fournisseur = ia.fournisseurChoisi
  if (!fournisseur) return 'le fournisseur'
  return `${fournisseur.libelle}, qui les traite ${fournisseur.lieuDonnees}${fournisseur.horsUnionEuropeenne ? ', hors de l\'Union européenne' : ''}`
})

const formatDouteux = computed(() => ia.cle.trim() !== '' && ia.fournisseurChoisi?.formatCle && !ia.fournisseurChoisi.formatCle.test(ia.cle.trim()))

const etat = computed(() => {
  if (ia.test.etat !== 'inconnu') return ia.test.message
  if (!ia.cle.trim()) return 'Mode IA réelle choisi : saisissez votre clé. Sans clé, l\'agent reste en simulation.'
  return 'Clé saisie : le bloc Agent répondra avec une vraie IA à la prochaine exécution.'
})

const oublier = () => {
  ia.oublier()
  laboratoire.reinitialiser()
}
</script>
