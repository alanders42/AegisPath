import { computed, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import type { DataProvider, Draft, GameDataset, Position, Rank, Team } from '@/types'
import { POSITIONS, RANKS } from '@/types'
import { localDataProvider } from '@/providers/local'
import { metaPreview, selectedIds, synergyPreview } from '@/composables/demoSelectors'
import { createBuildPlan } from '@/engines/buildPlanner'
import type { StrategyChoice } from '@/types/planner'
export const useDraftStore = defineStore('draft', () => {
  const rank = ref<Rank | null>(null)
  const position = ref<Position | null>(null)
  const allies = ref<(number | null)[]>(Array(5).fill(null))
  const enemies = ref<(number | null)[]>(Array(5).fill(null))
  const enemyPositions = ref<(Position | null)[]>(Array(5).fill(null))
  const strategy = ref<StrategyChoice>('auto')
  const asOf = new Date().toISOString().slice(0, 10)
  const dataset = shallowRef<GameDataset | null>(null)
  const status = ref<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const error = ref('')
  const draft = computed<Draft>(() => ({
    rank: rank.value,
    position: position.value,
    allies: allies.value,
    enemies: enemies.value,
  }))
  const heroes = computed(() => dataset.value?.heroes ?? [])
  const heroById = computed(() => new Map(heroes.value.map((hero) => [hero.id, hero])))
  const ownHero = computed(() =>
    position.value ? heroById.value.get(allies.value[position.value - 1] ?? -1) : undefined,
  )
  const taken = computed(() => selectedIds(draft.value))
  const filledCount = computed(() => taken.value.size)
  const meta = computed(() => (dataset.value ? metaPreview(dataset.value, draft.value) : []))
  const synergy = computed(() => (dataset.value ? synergyPreview(dataset.value, draft.value) : []))
  const buildPlan = computed(() =>
    ownHero.value && position.value
      ? createBuildPlan(
          {
            hero: ownHero.value,
            position: position.value,
            rank: rank.value,
            draft: draft.value,
            enemyPositions: enemyPositions.value,
            strategy: strategy.value,
            patch: dataset.value?.planner?.rules.id ?? '',
            asOf,
          },
          dataset.value?.planner,
        )
      : null,
  )
  async function load(provider: DataProvider = localDataProvider) {
    if (status.value === 'loading') return
    status.value = 'loading'
    error.value = ''
    try {
      dataset.value = await provider.load()
      status.value = 'ready'
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'Unable to load local data.'
      status.value = 'error'
    }
  }
  function setRank(value: Rank) {
    if (RANKS.includes(value)) rank.value = value
  }
  function setPosition(value: Position) {
    if (!POSITIONS.includes(value)) return
    const previous = position.value
    if (previous && previous !== value && allies.value[previous - 1] !== null) {
      const displaced = allies.value[value - 1] ?? null
      allies.value[value - 1] = allies.value[previous - 1] ?? null
      allies.value[previous - 1] = displaced
    }
    if (position.value !== value) strategy.value = 'auto'
    position.value = value
  }
  function setHero(team: Team, index: number, heroId: number | null): boolean {
    if (!Number.isInteger(index) || index < 0 || index > 4) return false
    if (heroId !== null && !heroById.value.has(heroId)) return false
    const slots = team === 'allies' ? allies.value : enemies.value
    if (heroId !== null && taken.value.has(heroId) && slots[index] !== heroId) return false
    if (team === 'allies' && index + 1 === position.value && slots[index] !== heroId)
      strategy.value = 'auto'
    slots[index] = heroId
    if (team === 'enemies' && heroId === null) enemyPositions.value[index] = null
    return true
  }
  function pickOwnHero(heroId: number) {
    return position.value ? setHero('allies', position.value - 1, heroId) : false
  }
  function resetDraft() {
    allies.value = Array(5).fill(null)
    enemies.value = Array(5).fill(null)
    enemyPositions.value = Array(5).fill(null)
    strategy.value = 'auto'
  }
  function setEnemyPosition(index: number, value: Position | null): boolean {
    if (!Number.isInteger(index) || index < 0 || index > 4 || enemies.value[index] === null)
      return false
    if (
      value !== null &&
      (!POSITIONS.includes(value) ||
        enemyPositions.value.some((position, other) => position === value && other !== index))
    )
      return false
    enemyPositions.value[index] = value
    return true
  }
  function setStrategy(value: StrategyChoice) {
    if (['auto', 'aggressive', 'defensive', 'sustain'].includes(value)) strategy.value = value
  }
  return {
    rank,
    position,
    allies,
    enemies,
    enemyPositions,
    strategy,
    dataset,
    status,
    error,
    heroes,
    heroById,
    ownHero,
    taken,
    filledCount,
    meta,
    synergy,
    buildPlan,
    load,
    setRank,
    setPosition,
    setHero,
    pickOwnHero,
    resetDraft,
    setEnemyPosition,
    setStrategy,
  }
})
