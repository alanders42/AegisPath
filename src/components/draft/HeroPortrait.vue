<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Hero } from '@/types'
import { assetUrl } from '@/utils'
const props = defineProps<{ hero: Hero; eager?: boolean }>()
const failed = ref(false)
watch(
  () => props.hero.id,
  () => {
    failed.value = false
  },
)
</script>
<template>
  <span class="hero-portrait"
    ><img
      v-if="!failed"
      :src="assetUrl(hero.portrait)"
      alt=""
      :loading="eager ? 'eager' : 'lazy'"
      width="256"
      height="144"
      @error="failed = true"
    /><span v-else class="portrait-fallback" aria-hidden="true">{{
      hero.name.slice(0, 2).toUpperCase()
    }}</span></span
  >
</template>
