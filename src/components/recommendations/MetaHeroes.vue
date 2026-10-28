<script setup lang="ts">
import { TrendingUp, ArrowUpRight, Crosshair } from '@lucide/vue'
import HeroPortrait from '@/components/draft/HeroPortrait.vue'
import { useDraftStore } from '@/stores/draft'
import { POSITION_NAMES } from '@/types'
const store = useDraftStore()
defineEmits<{ browse: [] }>()
</script>
<template>
  <section class="panel meta-panel" aria-labelledby="meta-title">
    <div class="section-heading">
      <div class="heading-with-step">
        <span class="step">02</span>
        <div>
          <h2 id="meta-title" class="section-title">Find your opening</h2>
          <p class="muted text-sm">Five picks to start exploring.</p>
        </div>
      </div>
      <span class="demo-badge">DEMO</span>
    </div>
    <div v-if="!store.rank || !store.position" class="empty-state">
      <Crosshair :size="30" />
      <h3>Start with your rank and role</h3>
      <p>Select both above to explore five example hero picks.</p>
    </div>
    <template v-else>
      <div class="recommendation-context">
        <TrendingUp :size="14" /><span
          >{{ store.rank }} <span class="muted">/</span> {{ POSITION_NAMES[store.position] }}</span
        ><span class="muted">Synthetic scores</span>
      </div>
      <div class="meta-list">
        <button
          v-for="(rec, index) in store.meta"
          :key="rec.heroId"
          class="meta-card"
          type="button"
          @click="store.pickOwnHero(rec.heroId)"
        >
          <span class="meta-rank">{{ String(index + 1).padStart(2, '0') }}</span
          ><HeroPortrait :hero="store.heroById.get(rec.heroId)!" /><span class="meta-copy"
            ><strong>{{ store.heroById.get(rec.heroId)!.name }}</strong
            ><span class="meta-tags">{{ rec.strengths.join(' · ') }}</span
            ><span class="meta-explanation">{{ rec.explanation }}</span></span
          ><span class="score"
            ><strong>{{ rec.score }}</strong
            ><small>DEMO</small></span
          ><ArrowUpRight :size="15" class="muted" />
        </button>
      </div>
      <p v-if="!store.meta.length" class="muted p-4 text-sm">
        All fixture candidates are drafted. Browse the roster for another hero.
      </p>
      <p class="data-caveat">
        Example ordering for this bracket. No measured win rates or current-meta claims.
      </p>
    </template>
    <button
      class="browse-heroes"
      type="button"
      :disabled="!store.position"
      @click="$emit('browse')"
    >
      {{
        store.position
          ? `Browse all ${store.heroes.length} heroes`
          : 'Choose a position to browse your pick'
      }}<ArrowUpRight :size="15" />
    </button>
  </section>
</template>
