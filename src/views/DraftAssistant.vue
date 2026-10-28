<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  Shield,
  Swords,
  ArrowUpRight,
  CircleHelp,
  Database,
  AlertTriangle,
  RefreshCw,
  Info,
  ChevronDown,
} from '@lucide/vue'
import Button from '@/components/ui/button/Button.vue'
import PlayerConfiguration from '@/components/draft/PlayerConfiguration.vue'
import DraftBoard from '@/components/draft/DraftBoard.vue'
import HeroSelector from '@/components/draft/HeroSelector.vue'
import MetaHeroes from '@/components/recommendations/MetaHeroes.vue'
import SynergyRecommendations from '@/components/recommendations/SynergyRecommendations.vue'
import BuildOverview from '@/components/planner/BuildOverview.vue'
import BuildPlanner from '@/components/planner/BuildPlanner.vue'
import { useDraftStore } from '@/stores/draft'
import type { Team } from '@/types'
const store = useDraftStore()
const selectorOpen = ref(false)
const selectorTarget = ref<{ team: Team; index: number }>({ team: 'allies', index: 0 })
const selectionError = ref('')
const detailsOpen = ref(false)
const targetTitle = computed(() =>
  selectorTarget.value.team === 'allies' && selectorTarget.value.index + 1 === store.position
    ? 'Choose your hero'
    : `Choose ${selectorTarget.value.team === 'allies' ? 'ally' : 'enemy'} ${selectorTarget.value.index + 1}`,
)
const currentId = computed(
  () => store[selectorTarget.value.team][selectorTarget.value.index] ?? null,
)
function openSelector(team: Team, index: number) {
  selectorTarget.value = { team, index }
  selectionError.value = ''
  selectorOpen.value = true
}
function selectHero(id: number) {
  if (store.setHero(selectorTarget.value.team, selectorTarget.value.index, id))
    selectorOpen.value = false
  else selectionError.value = 'That hero is already in the draft. Choose another hero.'
}
function browseOwn() {
  if (store.position) openSelector('allies', store.position - 1)
}
onMounted(() => store.load())
</script>
<template>
  <div class="app-shell">
    <header class="app-header">
      <a href="#main" class="brand"
        ><span class="brand-mark" aria-hidden="true"
          ><Shield :size="24" :stroke-width="1.6" /><span>A</span></span
        ><span>AEGIS<span class="brand-light">PATH</span></span></a
      >
      <nav aria-label="Main navigation">
        <a href="#draft-title" class="nav-active"><Swords :size="15" />Draft Assistant</a>
      </nav>
      <div class="header-right">
        <span class="phase-label">PHASE 02</span
        ><a href="#data-details" class="header-help" @click="detailsOpen = true"
          ><CircleHelp :size="16" /><span>About the data</span></a
        >
      </div>
    </header>
    <main id="main" class="main-content">
      <div class="page-intro">
        <div>
          <p class="eyebrow page-kicker">
            <span class="accent-line" />THE DRAFT IS JUST THE BEGINNING
          </p>
          <h1>
            A better draft.<br class="mobile-break" />
            A clearer game plan.
          </h1>
          <p class="page-description">Find your hero. Build your team. Think one move ahead.</p>
        </div>
        <span class="workspace-badge"><span class="status-dot" />DRAFT WORKSPACE</span>
      </div>
      <div class="demo-banner">
        <Info :size="17" />
        <p>
          <strong>You’re exploring a demo.</strong> Hero suggestions and scores remain illustrative.
          Reviewed build guides use a bundled game-data snapshot; no live meta statistics.
        </p>
        <a href="#data-details" @click="detailsOpen = true"
          >Data details<ArrowUpRight :size="14"
        /></a>
      </div>
      <section
        v-if="store.status === 'idle' || store.status === 'loading'"
        class="panel loading-panel"
        role="status"
        aria-live="polite"
      >
        <RefreshCw class="loading-icon" :size="24" />
        <h2>Preparing your draft workspace</h2>
        <p class="muted">Loading the bundled hero roster and demo fixtures…</p>
        <div class="skeleton-row"><span v-for="n in 5" :key="n" /></div>
      </section>
      <section v-else-if="store.status === 'error'" class="panel error-panel" role="alert">
        <AlertTriangle :size="28" />
        <h2>We couldn’t load the workspace</h2>
        <p>{{ store.error }}</p>
        <Button @click="store.load()"><RefreshCw :size="15" />Retry loading</Button>
      </section>
      <template v-else
        ><PlayerConfiguration />
        <div class="workspace-grid">
          <div class="workspace-main">
            <DraftBoard @select="openSelector" />
            <div class="hero-sections">
              <MetaHeroes @browse="browseOwn" /><SynergyRecommendations />
            </div>
          </div>
          <BuildOverview />
        </div>
        <BuildPlanner />
        <p class="sr-only" role="status" aria-live="polite">
          {{ store.filledCount }} of 10 heroes selected.{{
            store.ownHero ? ` Your hero is ${store.ownHero.name}.` : ''
          }}
        </p></template
      >
      <section id="data-details" class="data-details panel">
        <button
          class="data-summary"
          type="button"
          :aria-expanded="detailsOpen"
          aria-controls="data-content"
          @click="detailsOpen = !detailsOpen"
        >
          <span
            ><Database :size="16" />Transparent by design<span class="muted"
              >Local fixtures · No live API</span
            ></span
          ><ChevronDown :size="16" :class="{ rotated: detailsOpen }" />
        </button>
        <div v-if="detailsOpen" id="data-content" class="data-content">
          <h2 class="section-title">Know what’s behind a recommendation</h2>
          <template v-if="store.dataset"
            ><dl>
              <div>
                <dt>Dataset</dt>
                <dd>{{ store.dataset.fixtures.metadata.source }}</dd>
              </div>
              <div>
                <dt>Bundled on</dt>
                <dd>{{ store.dataset.fixtures.metadata.updatedAt }}</dd>
              </div>
              <div>
                <dt>Patch applicability</dt>
                <dd>{{ store.dataset.fixtures.metadata.patch }}</dd>
              </div>
              <div>
                <dt>Hero roster</dt>
                <dd>
                  {{ store.heroes.length }} heroes from a pinned
                  <a
                    :href="`${store.dataset.fixtures.metadata.sourceUrl}/tree/${store.dataset.fixtures.metadata.sourceCommit}`"
                    target="_blank"
                    rel="noreferrer"
                    >OpenDota constants snapshot<ArrowUpRight :size="12"
                  /></a>
                </dd>
              </div>
            </dl>
            <ul>
              <li
                v-for="limitation in store.dataset.fixtures.metadata.limitations"
                :key="limitation"
              >
                {{ limitation }}
              </li>
            </ul></template
          >
          <p v-else class="muted">
            This phase uses local demonstration recommendations. Source metadata will appear when
            the dataset loads.
          </p>
          <p class="muted text-xs">
            Dota 2 and its hero and item artwork belong to Valve Corporation. AegisPath is an
            independent community project and is not affiliated with Valve.
          </p>
        </div>
      </section>
    </main>
    <footer class="app-footer">
      <span class="footer-brand"
        ><Shield :size="14" />AEGISPATH<span class="muted"
          >A little preparation. A better game.</span
        ></span
      ><span>Community built. Independently crafted.</span>
    </footer>
    <HeroSelector
      :open="selectorOpen"
      :title="targetTitle"
      :current-id="currentId"
      @update:open="selectorOpen = $event"
      @select="selectHero"
    />
    <p v-if="selectionError" class="toast-error" role="alert">{{ selectionError }}</p>
  </div>
</template>
