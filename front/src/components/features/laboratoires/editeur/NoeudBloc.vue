<template>
  <article
    :id="`bloc-${noeud.id}`"
    tabindex="-1"
    :class="['rounded-2xl border-2 p-4 md:p-5 scroll-mt-32', couleurs.carte, estProchain ? 'ring-4 ring-blue-300' : '']"
    :aria-labelledby="`bloc-${noeud.id}-titre`"
    :data-testid="`bloc-${noeud.id}`"
  >
    <header class="flex flex-wrap items-start gap-3">
      <span
        :class="['flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl', couleurs.icone]"
        aria-hidden="true"
      >
        <i :class="bloc?.icone ?? 'fas fa-question'" />
      </span>
      <div class="min-w-0 flex-1">
        <h3
          :id="`bloc-${noeud.id}-titre`"
          class="text-xl font-bold text-gray-900"
        >
          <span class="sr-only">Étape {{ numero }} : </span>{{ nom }}
        </h3>
        <p class="text-base text-gray-700">
          {{ bloc?.libelle ?? noeud.type }}<template v-if="verrouille">
            · <i
              class="fas fa-lock"
              aria-hidden="true"
            /> bloc fourni
          </template>
        </p>
        <p class="mt-1 text-lg text-gray-900">
          {{ resume }}
        </p>
      </div>
      <span
        :class="['inline-flex items-center gap-2 rounded-full border px-3 py-1 text-base font-semibold', etat.classes]"
        :data-testid="`etat-${noeud.id}`"
      >
        <i
          :class="etat.icone"
          aria-hidden="true"
        />
        {{ etat.texte }}
      </span>
    </header>

    <ul
      v-if="erreurs.length"
      class="mt-3 space-y-1 rounded-xl border border-red-300 bg-red-50 p-3 text-base text-red-950"
    >
      <li
        v-for="erreur in erreurs"
        :key="erreur.code + erreur.message"
        class="flex gap-2"
      >
        <i
          class="fas fa-triangle-exclamation mt-1"
          aria-hidden="true"
        />
        <span>{{ erreur.message }}</span>
      </li>
    </ul>

    <!-- Liens : la vue en étapes permet de tout relier au clavier -->
    <div class="mt-4 space-y-3 text-lg">
      <p v-if="bloc?.entrees.length">
        <span class="font-semibold">Reçoit de :</span>&#32;<span :class="entrants.length ? '' : 'text-red-800'">{{ entrants.length ? entrants.map((lien) => nomDe(lien.source)).join(', ') : 'aucun bloc' }}</span>
      </p>

      <div
        v-for="sortie in bloc?.sorties ?? []"
        :key="sortie.id"
      >
        <p class="font-semibold">
          {{ bloc.sorties.length > 1 ? sortie.libelle : 'Envoie vers' }} :
        </p>
        <ul class="mt-1 flex flex-wrap gap-2">
          <li
            v-for="lien in sortants(sortie.id)"
            :key="lien.id"
            class="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white py-1 pl-3 pr-1"
          >
            <i
              class="fas fa-arrow-right text-gray-600"
              aria-hidden="true"
            />
            {{ nomDe(lien.cible) }}
            <button
              type="button"
              class="flex h-9 w-9 items-center justify-center rounded-full text-red-800 hover:bg-red-50 focus-visible:outline focus-visible:outline-3 focus-visible:outline-blue-800"
              :aria-label="`Supprimer le lien vers ${nomDe(lien.cible)}`"
              @click="delier(lien.id, sortie.id)"
            >
              <i
                class="fas fa-xmark"
                aria-hidden="true"
              />
            </button>
          </li>
          <li
            v-if="!sortants(sortie.id).length"
            class="text-gray-700"
          >
            aucun bloc
          </li>
        </ul>
        <div
          v-if="candidats(sortie.id).length"
          class="mt-2 flex flex-wrap items-end gap-2"
        >
          <div class="min-w-48 flex-1">
            <label
              :for="`relier-${noeud.id}-${sortie.id}`"
              class="text-base text-gray-800"
            >Ajouter une destination{{ bloc.sorties.length > 1 ? ` (${sortie.libelle.toLowerCase()})` : '' }}</label>
            <select
              :id="`relier-${noeud.id}-${sortie.id}`"
              v-model="choix[sortie.id]"
              :class="CHAMP"
            >
              <option value="">
                Choisir un bloc…
              </option>
              <option
                v-for="candidat in candidats(sortie.id)"
                :key="candidat.id"
                :value="candidat.id"
              >
                {{ nomDe(candidat.id) }}
              </option>
            </select>
          </div>
          <button
            type="button"
            :class="BOUTON.secondaire"
            :disabled="!choix[sortie.id]"
            :data-testid="`relier-${noeud.id}-${sortie.id}`"
            @click="relier(sortie.id)"
          >
            <i
              class="fas fa-link"
              aria-hidden="true"
            />
            Relier
          </button>
        </div>
      </div>
    </div>

    <div class="mt-4 flex flex-wrap gap-2">
      <button
        v-if="!verrouille"
        type="button"
        :class="BOUTON.secondaire"
        :aria-expanded="ouvert"
        :aria-controls="`reglages-${noeud.id}`"
        :data-testid="`modifier-${noeud.id}`"
        @click="ouvert = !ouvert"
      >
        <i
          class="fas fa-sliders"
          aria-hidden="true"
        />
        {{ ouvert ? 'Fermer les réglages' : 'Modifier' }}
      </button>
      <button
        v-if="dupliquable"
        type="button"
        :class="BOUTON.secondaire"
        :data-testid="`dupliquer-${noeud.id}`"
        @click="dupliquer"
      >
        <i
          class="fas fa-clone"
          aria-hidden="true"
        />
        Dupliquer
      </button>
      <button
        v-if="!verrouille"
        type="button"
        :class="BOUTON.danger"
        :data-testid="`supprimer-${noeud.id}`"
        @click="supprimer"
      >
        <i
          class="fas fa-trash"
          aria-hidden="true"
        />
        Supprimer le bloc
      </button>
    </div>

    <div
      v-if="ouvert && bloc"
      :id="`reglages-${noeud.id}`"
    >
      <p class="mt-3 text-base text-gray-700">
        {{ bloc.description }}
      </p>
      <PanneauConfiguration
        :noeud="noeud"
        :bloc="bloc"
        @configurer="(champ, valeur) => store.configurer(noeud.id, champ, valeur)"
        @renommer="(libelle) => store.renommer(noeud.id, libelle)"
      />
    </div>
  </article>
</template>

<script setup>
import { computed, nextTick, reactive, ref } from 'vue'
import { trouverBloc } from '@/laboratoires/blocs'
import { accessiblesDepuis, liensEntrants, nomDuNoeud } from '@/laboratoires/moteur/workflow'
import { useLaboratoireStore } from '@/stores/laboratoire'
import PanneauConfiguration from './PanneauConfiguration.vue'
import { BOUTON, CHAMP, COULEURS_BLOC, ETATS } from '../styles'

const props = defineProps({
  noeud: { type: Object, required: true },
  numero: { type: Number, required: true },
})

const emit = defineEmits(['supprime'])

const store = useLaboratoireStore()
const ouvert = ref(false)
const choix = reactive({})

const bloc = computed(() => trouverBloc(props.noeud.type))
const couleurs = computed(() => COULEURS_BLOC[bloc.value?.couleur] ?? COULEURS_BLOC.sky)
const nom = computed(() => nomDuNoeud(props.noeud))
const verrouille = computed(() => store.verrouille(props.noeud.id))
const estProchain = computed(() => store.prochainNoeud === props.noeud.id)

const resume = computed(() => {
  try {
    return bloc.value?.resumer?.(props.noeud.config ?? {}) ?? ''
  } catch {
    return ''
  }
})

const etat = computed(() => {
  if (estProchain.value) return ETATS.prochain
  return ETATS[store.execution?.etats?.[props.noeud.id] ?? 'attente'] ?? ETATS.attente
})

const erreurs = computed(() => store.erreursValidation.filter((erreur) => erreur.noeudId === props.noeud.id))
const entrants = computed(() => liensEntrants(store.workflow, props.noeud.id))
const sortants = (sortie) => store.workflow.liens.filter((lien) => lien.source === props.noeud.id && lien.sortie === sortie)

const nomDe = (id) => {
  const noeud = store.workflow.noeuds.find((candidat) => candidat.id === id)
  return noeud ? nomDuNoeud(noeud) : id
}

// Destinations possibles : blocs qui reçoivent des données, sans créer de boucle ni de doublon
const candidats = (sortie) => store.workflow.noeuds.filter((candidat) => {
  if (candidat.id === props.noeud.id) return false
  if (!trouverBloc(candidat.type)?.entrees.length) return false
  if (sortants(sortie).some((lien) => lien.cible === candidat.id)) return false
  return !accessiblesDepuis(store.workflow, candidat.id).has(props.noeud.id)
})

// Après un ajout ou une suppression de lien, le focus reste sur ce bloc :
// sur le choix de destination s'il existe encore, sinon sur le bloc lui-même
const garderFocus = async (sortie) => {
  await nextTick()
  const cible = document.getElementById(`relier-${props.noeud.id}-${sortie}`) ?? document.getElementById(`bloc-${props.noeud.id}`)
  cible?.focus()
}

const relier = (sortie) => {
  store.relier(props.noeud.id, sortie, choix[sortie])
  choix[sortie] = ''
  garderFocus(sortie)
}

const delier = (lienId, sortie) => {
  store.delier(lienId)
  garderFocus(sortie)
}

const dupliquable = computed(() => props.noeud.type !== 'declencheur' && (store.lab?.blocsDisponibles ?? []).includes(props.noeud.type))

const dupliquer = async () => {
  const id = store.dupliquerBloc(props.noeud.id)
  await nextTick()
  document.getElementById(`bloc-${id}`)?.focus()
}

const supprimer = () => {
  store.supprimerBloc(props.noeud.id)
  emit('supprime')
}
</script>
