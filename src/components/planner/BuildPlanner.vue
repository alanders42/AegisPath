<script setup lang="ts">
import { computed } from 'vue'
import { TabsRoot, TabsList, TabsTrigger, TabsContent } from 'reka-ui'
import { Swords, ListOrdered, Sparkles, BookOpen, AlertTriangle } from '@lucide/vue'
import { useDraftStore } from '@/stores/draft'
import { STRATEGY_LABELS } from '@/types/planner'
import StartingPurchase from './StartingPurchase.vue'
import HeroPortrait from '@/components/draft/HeroPortrait.vue'
import { assetUrl } from '@/utils'
const store = useDraftStore()
const plan = computed(() => store.buildPlan)
const stages = computed(() =>
  ['Laning phase', 'Early game', 'Midgame', 'Late game'].map((stage) => ({
    name: stage,
    steps: plan.value?.progression.filter((step) => step.stage === stage) ?? [],
  })),
)
const items = computed(() => new Map(store.dataset?.planner?.items.map((i) => [i.id, i]) ?? []))
function itemName(id: string) {
  return items.value.get(id)?.name ?? id
}
function abilityName(id: string) {
  return (
    store.dataset?.planner?.abilities.find((a) => a.id === id)?.name ??
    id.split('_').slice(1).join(' ')
  )
}
function heroes(ids: number[]) {
  return ids.map((id) => store.heroById.get(id)?.name ?? 'Unknown hero').join(', ')
}
function shopUnlock(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}
</script>
<template>
  <section id="build-planner" class="panel expanded-planner" aria-labelledby="planner-title">
    <div class="planner-heading">
      <div v-if="store.ownHero" class="planner-identity">
        <HeroPortrait :hero="store.ownHero" />
        <div>
          <p class="eyebrow">YOUR MATCH PLAN · POSITION {{ store.position }}</p>
          <h2 id="planner-title">{{ store.ownHero.name }}</h2>
          <p>{{ plan?.title }}</p>
        </div>
      </div>
      <div v-else>
        <p class="eyebrow">PREPARE WITH PURPOSE</p>
        <h2 id="planner-title">Your match plan</h2>
      </div>
      <span v-if="plan" class="planner-patch">{{ plan.confidence }} · {{ plan.patch }}</span>
    </div>
    <div v-if="!plan" class="empty-state compact">
      <Swords :size="28" />
      <h3>One pick unlocks your plan</h3>
      <p>Choose your hero and position above. Reviewed coverage includes all five roles.</p>
    </div>
    <template v-else
      ><p
        v-if="plan.warnings.some((warning) => warning.startsWith('Stale snapshot'))"
        class="planner-stale"
        role="status"
      >
        {{ plan.warnings.find((warning) => warning.startsWith('Stale snapshot')) }}
      </p>
      <div v-if="plan.status === 'limited'" class="limited-plan" role="status">
        <AlertTriangle :size="22" />
        <div>
          <h3>Limited recommendation data</h3>
          <p v-for="warning in plan.warnings" :key="warning">{{ warning }}</p>
          <button
            v-if="store.dataset?.plannerError"
            class="ui-button button-outline"
            type="button"
            @click="store.load()"
          >
            Reload planner data
          </button>
        </div>
      </div>
      <template v-else
        ><div class="lane-analysis">
          <div>
            <h3>
              {{ STRATEGY_LABELS[plan.lane.strategy] }}
              <span class="confidence-label">{{
                plan.lane.overridden ? 'Your override' : 'Automatic assessment'
              }}</span>
            </h3>
            <p>{{ plan.lane.explanation }}</p>
            <p class="lane-opponents">
              {{
                plan.lane.opponentIds.length
                  ? `Assigned lane opponents: ${heroes(plan.lane.opponentIds)}`
                  : 'Lane opponents unknown — assign enemy positions above to refine the assessment.'
              }}
            </p>
            <p v-if="plan.lane.allyIds.length" class="planner-note">
              Lane partner: {{ heroes(plan.lane.allyIds) }}
            </p>
          </div>
          <details>
            <summary>Threats & advantages</summary>
            <ul>
              <li v-for="threat in plan.lane.threats" :key="`${threat.heroId}-${threat.abilityId}`">
                <strong>{{ heroes([threat.heroId]) }} · {{ abilityName(threat.abilityId) }}</strong>
                — {{ threat.explanation }}
              </li>
              <li v-if="!plan.lane.threats.length">
                No reviewed, assigned lane threats yet. This is not a claim that the lane is safe.
              </li>
              <li v-for="advantage in plan.lane.advantages" :key="advantage">{{ advantage }}</li>
            </ul>
          </details>
          <details open>
            <summary>First several minutes</summary>
            <ul>
              <li v-for="action in plan.lane.actions" :key="action">{{ action }}</li>
            </ul>
          </details>
        </div>
        <TabsRoot default-value="items" class="planner-tabs"
          ><TabsList class="planner-tab-list" aria-label="Build plan sections"
            ><TabsTrigger value="items"><ListOrdered :size="15" />Item Build</TabsTrigger
            ><TabsTrigger value="skills"><Sparkles :size="15" />Skill Build</TabsTrigger></TabsList
          >
          <TabsContent value="items" class="planner-tab-content"
            ><StartingPurchase v-if="plan.starting" :inventory="plan.starting" />
            <div class="timeline-header">
              <h3>Purchase progression</h3>
              <span>Relative order · no invented minute timings</span>
            </div>
            <div class="build-timeline">
              <section v-for="(stage, index) in stages" :key="stage.name" class="timeline-stage">
                <h4>
                  <span>{{ index + 2 }}</span
                  >{{ stage.name }}
                </h4>
                <ol>
                  <li v-for="step in stage.steps" :key="step.order" class="timeline-step">
                    <div class="step-main">
                      <span class="purchase-order">{{ step.order }}</span
                      ><img :src="assetUrl(step.item.icon)" alt="" width="48" height="35" />
                      <div>
                        <strong>{{ step.item.name }}</strong
                        ><span :class="['importance', step.importance]">{{ step.importance }}</span>
                      </div>
                      <span class="gold"
                        >{{ step.additionalCost }}g
                        <small>{{ step.uses.length ? 'to complete' : 'purchase' }}</small></span
                      >
                    </div>
                    <p>{{ step.reason }}</p>
                    <p v-if="step.influencedBy.length" class="influenced">
                      Against {{ heroes(step.influencedBy) }}
                    </p>
                    <p v-if="step.replaces?.length" class="replacement-note">
                      Instead of the default {{ step.replaces.map(itemName).join(', ') }}.
                    </p>
                    <p v-if="step.sells.length" class="replacement-note">
                      Sell / retire {{ step.sells.map(itemName).join(', ') }} to make room.
                    </p>
                    <p v-if="step.item.availableAfter" class="planner-note">
                      Shop unlock: {{ shopUnlock(step.item.availableAfter) }} · this is an
                      availability rule, not a purchase-time estimate.
                    </p>
                    <details>
                      <summary>Components & inventory</summary>
                      <p v-if="step.uses.length">
                        Reuse
                        {{
                          step.uses.map((c) => `${c.quantity}× ${itemName(c.itemId)}`).join(', ')
                        }}.
                      </p>
                      <p v-if="step.componentsToBuy.length">
                        Buy
                        {{
                          step.componentsToBuy
                            .map((c) => `${c.quantity}× ${itemName(c.itemId)}`)
                            .join(' → ')
                        }}{{ step.item.recipeCost ? `; includes recipe cost in the total` : '' }}.
                      </p>
                      <p v-if="step.consumes.length">
                        Use / replenish as needed: {{ step.consumes.map(itemName).join(', ') }}.
                        Consumables are not permanent final slots.
                      </p>
                      <p>
                        Completed main items:
                        {{ step.inventoryAfter.map(itemName).join(', ') || 'None yet' }}.
                      </p>
                    </details>
                  </li>
                </ol>
              </section>
            </div>
            <section class="final-inventory">
              <div class="timeline-header">
                <h3>Final six-slot inventory</h3>
                <span>Eventual target · not every game reaches six items</span>
              </div>
              <div class="final-six">
                <details v-for="(entry, index) in plan.finalInventory" :key="entry.item.id">
                  <summary>
                    <span class="final-slot-number">{{ index + 1 }}</span
                    ><img
                      :src="assetUrl(entry.item.icon)"
                      alt=""
                      width="72"
                      height="52"
                    /><strong>{{ entry.item.name }}</strong
                    ><span :class="['importance', entry.importance]">{{ entry.importance }}</span>
                  </summary>
                  <p>{{ entry.reason }}</p>
                </details>
              </div>
              <p class="planner-note">
                TP, neutral slots, consumed Shards, and upgraded components are excluded. Supports
                should secure vision and affordable saves before these late-game luxury targets.
              </p>
            </section>
            <section class="counter-branches">
              <h3>Matchup decisions & alternative branches</h3>
              <p v-if="!plan.alternatives.length" class="planner-note">
                No reviewed item substitutions are justified by the selected enemy abilities. Keep
                the baseline and add opponents to refine it.
              </p>
              <article
                v-for="decision in plan.alternatives"
                :key="decision.ruleId"
                class="counter-branch"
              >
                <img :src="assetUrl(decision.item.icon)" alt="" width="42" height="31" />
                <div>
                  <h4>
                    {{ decision.item.name }}
                    <span>{{
                      decision.covered
                        ? 'Core item already included'
                        : decision.selected
                          ? 'In primary path'
                          : 'Conditional alternative'
                    }}</span>
                  </h4>
                  <p>{{ decision.reason }}</p>
                  <p class="influenced">
                    Against {{ heroes(decision.influencedBy) }} ·
                    {{ decision.abilityIds.map(abilityName).join(', ') }}
                  </p>
                  <p>{{ decision.limitations }}</p>
                  <p v-if="!decision.selected && decision.replaces" class="replacement-note">
                    If this threat becomes the limiting factor, replace
                    {{ itemName(decision.replaces) }} in the primary path. Do not add a seventh
                    final item.
                  </p>
                </div>
              </article>
            </section>
          </TabsContent>
          <TabsContent value="skills" class="planner-tab-content"
            ><template v-if="plan.skills"
              ><div class="skill-intro">
                <h3>Level-by-level progression</h3>
                <p>{{ plan.skills.firstReason }}</p>
                <p v-if="plan.skills.influencedBy.length" class="influenced">
                  Matchup context: {{ heroes(plan.skills.influencedBy) }}
                </p>
                <p class="planner-note">
                  Skill and talent points are separate. A level can include both an ability or
                  attribute upgrade and a talent. Remaining talents use their own points at levels
                  27–30.
                </p>
              </div>
              <div class="skill-grid">
                <article
                  v-for="row in plan.skills.levels"
                  :key="row.level"
                  :class="['skill-level', { 'talent-level': row.talent }]"
                  :aria-label="`Level ${row.level}`"
                >
                  <span class="level-number">LVL {{ row.level }}</span
                  ><img
                    v-if="row.selection.icon"
                    :src="assetUrl(row.selection.icon)"
                    alt=""
                    width="38"
                    height="38"
                    loading="lazy"
                  /><span v-else class="skill-symbol" aria-hidden="true">{{
                    row.selection.kind === 'attributes' ? '+' : '—'
                  }}</span
                  ><strong>{{ row.selection.name }}</strong
                  ><span class="planner-note">{{
                    row.selection.kind === 'ability'
                      ? `Rank ${row.selection.rank} · 1 skill point`
                      : row.selection.kind === 'attributes'
                        ? `Bonus ${row.selection.rank} · 1 skill point`
                        : 'No skill point spent'
                  }}</span>
                  <details v-if="row.selection.kind !== 'complete'">
                    <summary>Why this level?</summary>
                    <p>{{ row.selection.explanation }}</p>
                  </details>
                  <div v-if="row.talent" class="talent-choice">
                    <span>1 TALENT POINT</span><strong>{{ row.talent.talent.name }}</strong>
                    <details>
                      <summary>Why this talent?</summary>
                      <p>{{ row.talent.reason }}</p>
                    </details>
                  </div>
                </article>
              </div>
              <section class="innate-section">
                <h3>Innate · acquired automatically</h3>
                <article
                  v-for="ability in plan.skills.innates"
                  :key="ability.id"
                  class="innate-ability"
                >
                  <img :src="assetUrl(ability.icon)" alt="" width="46" height="46" />
                  <div>
                    <h4>{{ ability.name }}</h4>
                    <p>{{ ability.summary }}</p>
                    <span class="planner-note">No skill point. No facet selection.</span>
                  </div>
                </article>
                <h3 v-if="plan.skills.itemGranted.length">
                  Item-granted abilities · not level-up choices
                </h3>
                <article
                  v-for="ability in plan.skills.itemGranted"
                  :key="ability.id"
                  class="innate-ability"
                >
                  <img :src="assetUrl(ability.icon)" alt="" width="46" height="46" />
                  <div>
                    <h4>{{ ability.name }}</h4>
                    <p>{{ ability.summary }}</p>
                    <span class="planner-note"
                      >Requires {{ itemName(ability.grantedBy!) }}. Unlocks only if that item is
                      acquired; never spends a skill point.</span
                    >
                  </div>
                </article>
              </section></template
            ></TabsContent
          >
        </TabsRoot>
      </template>
      <details class="plan-sources">
        <summary><BookOpen :size="15" />Sources, confidence & limitations</summary>
        <p class="planner-note">
          Game data checked {{ store.dataset?.planner?.rules.checkedAt ?? 'date unavailable' }}.
          Snapshot coverage does not guarantee future patch freshness.
        </p>
        <ul>
          <li v-for="warning in plan.warnings" :key="warning">{{ warning }}</li>
        </ul>
        <ul class="source-links">
          <li v-for="source in plan.sources" :key="source.url">
            <a
              v-if="source.kind !== 'curated'"
              :href="source.url"
              target="_blank"
              rel="noreferrer"
              >{{ source.label }}</a
            ><span v-else>{{ source.label }}</span>
          </li>
        </ul>
      </details>
    </template>
  </section>
</template>
