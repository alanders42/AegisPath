<script setup lang="ts">
import { UsersRound, ArrowUpRight, CircleCheck } from '@lucide/vue'
import HeroPortrait from '@/components/draft/HeroPortrait.vue'
import { useDraftStore } from '@/stores/draft'
import { POSITION_NAMES } from '@/types'
const store = useDraftStore()
</script>
<template>
  <section class="panel synergy-panel" aria-labelledby="synergy-title">
    <div class="section-heading">
      <div class="heading-with-step">
        <span class="step">03</span>
        <div>
          <h2 id="synergy-title" class="section-title">Better together</h2>
          <p class="muted text-sm">Explore complementary picks for open roles.</p>
        </div>
      </div>
      <span class="demo-badge">DEMO</span>
    </div>
    <div v-if="!store.ownHero" class="empty-state">
      <UsersRound :size="30" />
      <h3>A team starts with one pick</h3>
      <p>Select your hero to see examples for the remaining allied positions.</p>
    </div>
    <div v-else-if="!store.synergy.length" class="empty-state compact">
      <CircleCheck :size="28" />
      <h3>Your team is complete</h3>
      <p>Change a pick to explore another composition.</p>
    </div>
    <div v-else class="synergy-groups">
      <div v-for="group in store.synergy" :key="group.position" class="synergy-group">
        <h3>
          <span class="role-number">{{ group.position }}</span
          >{{ POSITION_NAMES[group.position] }}<span class="muted">Open position</span>
        </h3>
        <div class="synergy-options">
          <button
            v-for="rec in group.recommendations"
            :key="rec.heroId"
            type="button"
            class="synergy-card"
            @click="store.setHero('allies', group.position - 1, rec.heroId)"
          >
            <div class="synergy-card-top">
              <HeroPortrait :hero="store.heroById.get(rec.heroId)!" /><span class="score"
                ><strong>{{ rec.score }}</strong
                ><small>DEMO</small></span
              >
            </div>
            <div class="synergy-name">
              <strong>{{ store.heroById.get(rec.heroId)!.name }}</strong
              ><ArrowUpRight :size="14" />
            </div>
            <p>{{ rec.explanation }}</p>
            <div class="strength-tags">
              <span v-for="strength in rec.strengths" :key="strength">{{ strength }}</span>
            </div>
          </button>
        </div>
      </div>
    </div>
    <p v-if="store.ownHero" class="data-caveat">
      Curated composition examples · scores are illustrative, not win probabilities.
    </p>
  </section>
</template>
