import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useDraftStore } from '@/stores/draft'
import { metaPreview, synergyPreview } from '@/composables/demoSelectors'
import type { GameDataset, Draft, DemoFixtures, Hero } from '@/types'
import { readFileSync, existsSync } from 'node:fs'
const heroes = JSON.parse(
  readFileSync(new URL('../public/data/heroes.json', import.meta.url), 'utf8'),
) as Hero[]
const fixtures = JSON.parse(
  readFileSync(new URL('../public/data/demo.json', import.meta.url), 'utf8'),
) as DemoFixtures
const planner = {
  ...JSON.parse(readFileSync(new URL('../public/data/planner-game.json', import.meta.url), 'utf8')),
  ...JSON.parse(
    readFileSync(new URL('../public/data/planner-guides.json', import.meta.url), 'utf8'),
  ),
}
const data: GameDataset = { heroes, fixtures, planner }
const provider = { load: async () => data }
async function ready() {
  const store = useDraftStore()
  await store.load(provider)
  return store
}
function configured(): Draft {
  return {
    rank: 'Archon',
    position: 3,
    allies: [null, null, 2, null, null],
    enemies: Array(5).fill(null),
  }
}
beforeEach(() => setActivePinia(createPinia()))
describe('draft interactions', () => {
  it('starts with no configuration, picks, or recommendations', async () => {
    const store = await ready()
    expect(store.rank).toBeNull()
    expect(store.position).toBeNull()
    expect(store.filledCount).toBe(0)
    expect(store.meta).toEqual([])
    expect(store.synergy).toEqual([])
    expect(store.buildPlan).toBeNull()
  })
  it('requires a position for the player pick', async () => {
    expect((await ready()).pickOwnHero(2)).toBe(false)
  })
  it('puts the player hero in the correct position without duplicate player state', async () => {
    const store = await ready()
    store.setPosition(3)
    expect(store.pickOwnHero(2)).toBe(true)
    expect(store.allies[2]).toBe(2)
    expect(store.ownHero?.id).toBe(2)
  })
  it('rejects duplicates across and within both teams', async () => {
    const store = await ready()
    store.setHero('allies', 0, 8)
    expect(store.setHero('allies', 1, 8)).toBe(false)
    expect(store.setHero('enemies', 4, 8)).toBe(false)
    store.setHero('enemies', 0, 5)
    expect(store.setHero('enemies', 1, 5)).toBe(false)
    expect(store.setHero('allies', 0, 8)).toBe(true)
  })
  it('replaces and removes picks, releasing the old hero', async () => {
    const store = await ready()
    store.setHero('enemies', 0, 2)
    store.setHero('enemies', 0, 5)
    expect(store.setHero('allies', 0, 2)).toBe(true)
    store.setHero('enemies', 0, null)
    expect(store.setHero('allies', 1, 5)).toBe(true)
  })
  it('swaps the player and teammate when changing to an occupied position', async () => {
    const store = await ready()
    store.setPosition(3)
    store.pickOwnHero(2)
    store.setHero('allies', 0, 8)
    store.setPosition(1)
    expect(store.allies).toEqual([2, null, 8, null, null])
    expect(store.ownHero?.id).toBe(2)
    expect(store.filledCount).toBe(2)
  })
  it('moves the player into an empty position and clears the previous position', async () => {
    const store = await ready()
    store.setPosition(3)
    store.pickOwnHero(2)
    store.setPosition(4)
    expect(store.allies).toEqual([null, null, null, 2, null])
    expect(store.ownHero?.id).toBe(2)
  })
  it('does not move teammates when no player hero was picked', async () => {
    const store = await ready()
    store.setPosition(3)
    store.setHero('allies', 0, 8)
    store.setPosition(1)
    expect(store.allies).toEqual([8, null, null, null, null])
    expect(store.ownHero?.id).toBe(8)
  })
  it('is unchanged when selecting the current position', async () => {
    const store = await ready()
    store.setPosition(3)
    store.pickOwnHero(2)
    store.setPosition(3)
    expect(store.allies[2]).toBe(2)
  })
  it('resets only draft picks and preserves rank and position', async () => {
    const store = await ready()
    store.setRank('Ancient')
    store.setPosition(3)
    store.pickOwnHero(2)
    store.setHero('enemies', 0, 5)
    store.resetDraft()
    expect(store.rank).toBe('Ancient')
    expect(store.position).toBe(3)
    expect(store.filledCount).toBe(0)
    expect(store.ownHero).toBeUndefined()
    expect(store.buildPlan).toBeNull()
    expect(store.synergy).toEqual([])
    expect(store.meta).toHaveLength(5)
  })
  it('rejects invalid heroes and slot indexes without mutating picks', async () => {
    const store = await ready()
    expect(store.setHero('allies', 0, 999999)).toBe(false)
    for (const index of [-1, 5, 1.5, NaN]) expect(store.setHero('enemies', index, 2)).toBe(false)
    expect(store.filledCount).toBe(0)
  })
  it('updates derived suggestions immediately when picks change', async () => {
    const store = await ready()
    store.setRank('Archon')
    store.setPosition(3)
    store.pickOwnHero(2)
    expect(store.synergy).toHaveLength(4)
    store.setHero('allies', 0, 8)
    expect(store.synergy.map((group) => group.position)).toEqual([2, 4, 5])
    store.setHero('enemies', 0, 5)
    expect(store.buildPlan?.progression.some((item) => item.influencedBy.includes(5))).toBe(true)
  })
})
describe('fixture presentation selectors', () => {
  it('requires both rank and position for meta and returns five unique eligible heroes', () => {
    const draft = configured()
    expect(metaPreview(data, { ...draft, rank: null })).toEqual([])
    const recs = metaPreview(data, draft)
    expect(recs).toHaveLength(5)
    expect(new Set(recs.map((r) => r.heroId)).size).toBe(5)
    for (const rec of recs) {
      expect(fixtures.profiles[rec.heroId]?.positions).toContain(3)
      expect(rec.explanation.length).toBeGreaterThan(10)
    }
  })
  it('excludes drafted heroes from meta and synergy', () => {
    const draft = configured()
    draft.enemies[0] = 29
    draft.allies[0] = 8
    expect(metaPreview(data, draft).map((r) => r.heroId)).not.toContain(29)
    for (const group of synergyPreview(data, draft))
      for (const rec of group.recommendations) expect([2, 29, 8]).not.toContain(rec.heroId)
  })
  it('handles a complete team and a hero missing curated profile data', () => {
    const draft = configured()
    draft.allies = [8, 13, 2, 20, 5]
    expect(synergyPreview(data, draft)).toEqual([])
    draft.allies = [null, null, 145, null, null]
    expect(synergyPreview(data, draft)).toHaveLength(4)
    expect(synergyPreview(data, draft)).toHaveLength(4)
  })
  it('is deterministic and never mutates inputs', () => {
    const draft = configured()
    const before = JSON.stringify({ data, draft })
    expect(metaPreview(data, draft)).toEqual(metaPreview(data, draft))
    expect(synergyPreview(data, draft)).toEqual(synergyPreview(data, draft))

    expect(JSON.stringify({ data, draft })).toBe(before)
  })
  it('varies synthetic rank previews and documents their meaning', () => {
    expect(metaPreview(data, { ...configured(), rank: 'Herald' })).not.toEqual(
      metaPreview(data, { ...configured(), rank: 'Guardian' }),
    )
    expect(fixtures.metadata.demonstration).toBe(true)
    expect(fixtures.metadata.limitations.join(' ')).toContain('synthetic')
  })
})
describe('local data loading and asset integrity', () => {
  it('shows an error on load failure and can retry', async () => {
    const store = useDraftStore()
    await store.load({
      load: async () => {
        throw new Error('Offline fixture')
      },
    })
    expect(store.status).toBe('error')
    expect(store.error).toBe('Offline fixture')
    await store.load(provider)
    expect(store.status).toBe('ready')
    expect(store.error).toBe('')
  })
  it('has unique roster entries and every portrait and item icon locally', () => {
    expect(heroes.length).toBeGreaterThan(120)
    expect(new Set(heroes.map((h) => h.id)).size).toBe(heroes.length)
    for (const asset of [
      ...heroes.map((h) => h.portrait),
      ...planner.items.map((i: { icon: string }) => i.icon),
    ])
      expect(existsSync(new URL(`../public/${asset}`, import.meta.url)), asset).toBe(true)
  })
})
