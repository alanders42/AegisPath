<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Search, Check, X } from '@lucide/vue'
import Dialog from '@/components/ui/dialog/Dialog.vue'
import HeroPortrait from './HeroPortrait.vue'
import { useDraftStore } from '@/stores/draft'
const props = defineProps<{ open: boolean; title: string; currentId: number | null }>()
const emit = defineEmits<{ 'update:open': [value: boolean]; select: [id: number] }>()
const store = useDraftStore()
const query = ref('')
const attribute = ref('all')
const attributes = [
  { key: 'all', label: 'All heroes' },
  { key: 'str', label: 'Strength' },
  { key: 'agi', label: 'Agility' },
  { key: 'int', label: 'Intelligence' },
  { key: 'all-attr', label: 'Universal' },
]
const filtered = computed(() =>
  store.heroes.filter(
    (hero) =>
      (attribute.value === 'all' ||
        hero.attribute === (attribute.value === 'all-attr' ? 'all' : attribute.value)) &&
      hero.name.toLowerCase().includes(query.value.trim().toLowerCase()),
  ),
)
watch(
  () => props.open,
  (open) => {
    if (open) {
      query.value = ''
      attribute.value = 'all'
    }
  },
)
function pick(id: number) {
  emit('select', id)
}
</script>
<template>
  <Dialog
    :open="open"
    :title="title"
    description="Search the bundled roster. Heroes already in the draft are unavailable."
    @update:open="emit('update:open', $event)"
  >
    <div class="hero-search">
      <Search :size="18" aria-hidden="true" /><input
        v-model="query"
        data-hero-search
        type="search"
        aria-label="Search heroes"
        placeholder="Search heroes…"
        autocomplete="off"
      /><button v-if="query" type="button" aria-label="Clear search" @click="query = ''">
        <X :size="16" />
      </button>
    </div>
    <div class="attribute-filters" role="group" aria-label="Filter by attribute">
      <button
        v-for="tab in attributes"
        :key="tab.key"
        type="button"
        :aria-pressed="attribute === tab.key"
        :class="{ active: attribute === tab.key }"
        @click="attribute = tab.key"
      >
        {{ tab.label }}
      </button>
    </div>
    <p class="muted text-xs" role="status">
      {{ filtered.length }} heroes · {{ store.taken.size }} drafted
    </p>
    <div v-if="filtered.length" class="hero-grid">
      <button
        v-for="hero in filtered"
        :key="hero.id"
        type="button"
        :disabled="store.taken.has(hero.id) && currentId !== hero.id"
        :class="['hero-option', { selected: currentId === hero.id }]"
        @click="pick(hero.id)"
      >
        <HeroPortrait :hero="hero" /><span class="hero-option-name"
          >{{ hero.name }}<Check v-if="currentId === hero.id" :size="13" /></span
        ><span v-if="store.taken.has(hero.id) && currentId !== hero.id" class="drafted-label"
          >Drafted</span
        >
      </button>
    </div>
    <div v-else class="empty-state compact">
      <Search :size="24" />
      <h3>No heroes found</h3>
      <p>Try another name or choose a different attribute.</p>
    </div>
  </Dialog>
</template>
