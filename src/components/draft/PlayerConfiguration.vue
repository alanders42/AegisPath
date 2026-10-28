<script setup lang="ts">
import { Crosshair, ChevronDown } from '@lucide/vue'
import { useDraftStore } from '@/stores/draft'
import { RANKS, POSITIONS, POSITION_NAMES, type Rank } from '@/types'
const store = useDraftStore()
function changeRank(event: Event) {
  store.setRank((event.target as HTMLSelectElement).value as Rank)
}
</script>
<template>
  <section class="panel configuration" aria-labelledby="config-title">
    <div class="config-intro">
      <span class="section-icon"><Crosshair :size="20" /></span>
      <div>
        <h2 id="config-title" class="section-title">Your game, your role.</h2>
        <p class="muted text-sm">Set your bracket and find your place in the draft.</p>
      </div>
    </div>
    <div class="rank-field">
      <label for="rank" class="eyebrow">Rank bracket</label>
      <div class="select-wrap">
        <select id="rank" :value="store.rank ?? ''" @change="changeRank">
          <option value="" disabled>Select your rank</option>
          <option v-for="rank in RANKS" :key="rank" :value="rank">{{ rank }}</option></select
        ><ChevronDown :size="15" aria-hidden="true" />
      </div>
    </div>
    <fieldset class="role-field">
      <legend class="eyebrow">Your position</legend>
      <div class="role-options">
        <button
          v-for="position in POSITIONS"
          :key="position"
          type="button"
          :aria-pressed="store.position === position"
          :class="['role-button', { active: store.position === position }]"
          @click="store.setPosition(position)"
        >
          <span class="role-number">{{ position }}</span
          ><span>{{ POSITION_NAMES[position] }}</span>
        </button>
      </div>
    </fieldset>
  </section>
</template>
