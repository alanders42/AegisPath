<script setup lang="ts">
import { computed } from 'vue'
import { Backpack, ArrowDownRight } from '@lucide/vue'
import { useDraftStore } from '@/stores/draft'
import { STRATEGIES, STRATEGY_LABELS, type StrategyChoice } from '@/types/planner'
import StartingPurchase from './StartingPurchase.vue'
import { assetUrl } from '@/utils'
const store = useDraftStore()
const plan = computed(() => store.buildPlan)
const next = computed(
  () => plan.value?.progression.filter((p) => p.stage === 'Early game').slice(0, 2) ?? [],
)
const counter = computed(() => plan.value?.alternatives.find((c) => c.selected))
function changeStrategy(event: Event) {
  store.setStrategy((event.target as HTMLSelectElement).value as StrategyChoice)
}
</script>
<template>
  <section class="panel items-panel build-overview" aria-labelledby="items-title">
    <div class="section-heading">
      <div class="heading-with-step">
        <span class="step">04</span>
        <div>
          <h2 id="items-title" class="section-title">Build for the game</h2>
          <p class="muted text-sm">
            {{
              store.ownHero
                ? `${store.ownHero.name} · Position ${store.position}`
                : 'A lane plan. A build. A purpose.'
            }}
          </p>
        </div>
      </div>
      <span class="demo-badge">{{ plan?.status === 'ready' ? plan.patch : 'GUIDES' }}</span>
    </div>
    <div v-if="!plan" class="empty-state">
      <Backpack :size="30" />
      <h3>Make your first pick</h3>
      <p>Select your hero to explore a reviewed build or see its coverage status.</p>
    </div>
    <div v-else-if="plan.status === 'limited'" class="overview-content">
      <h3>Limited recommendation data</h3>
      <p class="planner-note">{{ plan.warnings[0] }}</p>
      <a href="#build-planner" class="planner-link"
        >View coverage and sources<ArrowDownRight :size="14"
      /></a>
    </div>
    <div v-else class="overview-content">
      <div class="strategy-summary">
        <span class="eyebrow">Laning approach</span
        ><strong>{{ STRATEGY_LABELS[plan.lane.strategy] }}</strong
        ><span class="confidence-label">{{
          plan.lane.confidence === 'assigned'
            ? 'Assigned lane positions'
            : plan.lane.confidence === 'partial'
              ? 'Partial lane information'
              : 'Estimated lane'
        }}</span
        ><label for="lane-strategy" class="sr-only">Laning strategy</label
        ><select id="lane-strategy" :value="store.strategy" @change="changeStrategy">
          <option v-for="strategy in STRATEGIES" :key="strategy" :value="strategy">
            {{ STRATEGY_LABELS[strategy] }}
          </option>
        </select>
        <p v-if="plan.lane.overridden" class="planner-note">
          Override active · Auto suggests {{ STRATEGY_LABELS[plan.lane.automatic] }}.
        </p>
        <p class="planner-note">{{ plan.lane.assessment }}</p>
      </div>
      <StartingPurchase v-if="plan.starting" :inventory="plan.starting" compact />
      <div class="overview-next">
        <h3>Next power spikes</h3>
        <div v-for="step in next" :key="step.itemId" class="next-item">
          <img :src="assetUrl(step.item.icon)" alt="" width="34" height="25" /><span>{{
            step.item.name
          }}</span
          ><span class="gold">{{ step.additionalCost }}g</span>
        </div>
      </div>
      <div v-if="counter" class="overview-counter">
        <h3>Top counter priority</h3>
        <strong>{{ counter.item.name }}</strong>
        <p class="planner-note">{{ counter.reason }}</p>
        <p class="influenced">
          Against {{ counter.influencedBy.map((id) => store.heroById.get(id)?.name).join(', ') }}
        </p>
      </div>
      <a class="planner-link" href="#build-planner"
        >Open full match plan<ArrowDownRight :size="14"
      /></a>
    </div>
  </section>
</template>
