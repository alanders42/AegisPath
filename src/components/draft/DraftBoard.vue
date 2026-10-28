<script setup lang="ts">
import { Plus, X, Swords, Shield, RotateCcw, UserRound } from '@lucide/vue'
import Button from '@/components/ui/button/Button.vue'
import HeroPortrait from './HeroPortrait.vue'
import { useDraftStore } from '@/stores/draft'
import { POSITION_NAMES, POSITIONS, type Position, type Team } from '@/types'
const store = useDraftStore()
function assignPosition(index: number, event: Event) {
  const element = event.target as HTMLSelectElement
  const value = element.value ? (Number(element.value) as Position) : null
  if (!store.setEnemyPosition(index, value))
    element.value = String(store.enemyPositions[index] ?? '')
}
defineEmits<{ select: [team: Team, index: number] }>()
const teams = [
  {
    key: 'allies' as const,
    label: 'Your team',
    subtitle: 'Build a lineup that works together',
    icon: Shield,
  },
  {
    key: 'enemies' as const,
    label: 'Enemy team',
    subtitle: 'Add opponents to explore item adaptations',
    icon: Swords,
  },
]
</script>
<template>
  <section class="panel draft-board" aria-labelledby="draft-title">
    <div class="section-heading">
      <div class="heading-with-step">
        <span class="step">01</span>
        <div>
          <h2 id="draft-title" class="section-title">The draft board</h2>
          <p class="muted text-sm">Every pick changes the picture.</p>
        </div>
      </div>
      <Button variant="ghost" size="sm" :disabled="!store.filledCount" @click="store.resetDraft()"
        ><RotateCcw :size="14" />Reset draft</Button
      >
    </div>
    <div v-for="team in teams" :key="team.key" :class="['team-row', team.key]">
      <div class="team-label">
        <div>
          <component :is="team.icon" :size="15" />
          <h3>{{ team.label }}</h3>
          <span class="muted team-hint">{{ team.subtitle }}</span>
        </div>
        <span class="muted tabular-nums">{{ store[team.key].filter(Boolean).length }} / 5</span>
      </div>
      <div class="draft-slots">
        <div
          v-for="(id, index) in store[team.key]"
          :key="index"
          :class="[
            'draft-slot',
            {
              'own-slot': team.key === 'allies' && index + 1 === store.position,
              occupied: id !== null,
            },
          ]"
        >
          <div class="slot-label">
            <span>{{
              team.key === 'allies'
                ? `${index + 1} · ${POSITION_NAMES[(index + 1) as Position]}`
                : `Enemy ${index + 1}`
            }}</span
            ><span v-if="team.key === 'allies' && index + 1 === store.position" class="you-label"
              ><UserRound :size="10" /> YOU</span
            >
          </div>
          <button
            type="button"
            class="slot-pick"
            :aria-label="`${id ? 'Change ' + store.heroById.get(id)?.name : 'Select hero'} for ${team.key === 'allies' ? 'allied position' : 'enemy slot'} ${index + 1}`"
            @click="$emit('select', team.key, index)"
          >
            <template v-if="id && store.heroById.get(id)"
              ><HeroPortrait :hero="store.heroById.get(id)!" eager /><span class="slot-hero-name">{{
                store.heroById.get(id)!.name
              }}</span
              ><span class="slot-edit" aria-hidden="true">Change hero</span></template
            >
            <template v-else
              ><span class="slot-plus"><Plus :size="20" /></span
              ><span class="slot-placeholder">Select hero</span></template
            >
          </button>
          <div v-if="team.key === 'enemies' && id" class="enemy-position-field">
            <label :for="`enemy-position-${index}`" class="sr-only"
              >Enemy {{ index + 1 }} position</label
            >
            <select
              :id="`enemy-position-${index}`"
              :value="store.enemyPositions[index] ?? ''"
              @change="assignPosition(index, $event)"
            >
              <option value="">Position unknown</option>
              <option
                v-for="position in POSITIONS"
                :key="position"
                :value="position"
                :disabled="
                  store.enemyPositions.some(
                    (assigned, other) => assigned === position && other !== index,
                  )
                "
              >
                {{ position }} · {{ POSITION_NAMES[position] }}
              </option>
            </select>
          </div>
          <button
            v-if="id"
            class="remove-hero"
            type="button"
            :aria-label="`Remove ${store.heroById.get(id)?.name} from ${team.key === 'allies' ? 'allied position' : 'enemy slot'} ${index + 1}`"
            @click="store.setHero(team.key, index, null)"
          >
            <X :size="12" />
          </button>
        </div>
      </div>
    </div>
    <div class="draft-footnote">
      <span class="status-dot" />{{ store.filledCount }} of 10 heroes selected<span class="muted"
        >Partial drafts welcome. Start with your own pick.</span
      >
    </div>
  </section>
</template>
