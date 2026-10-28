import { beforeEach, describe, expect, it } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { createPinia, setActivePinia } from 'pinia'
import { createBuildPlan } from '@/engines/buildPlanner'
import { analyzeLane } from '@/engines/strategy'
import { startingInventory } from '@/engines/startingInventory'
import { useDraftStore } from '@/stores/draft'
import type { BuildContext, LaneStrategy, PlannerDataset } from '@/types/planner'
import type { GameDataset, Hero, Position } from '@/types'
function json(path: string) {
  return JSON.parse(readFileSync(new URL(`../public/data/${path}`, import.meta.url), 'utf8'))
}
const heroes = json('heroes.json') as Hero[]
const planner: PlannerDataset = { ...json('planner-game.json'), ...json('planner-guides.json') }
const dataset: GameDataset = { heroes, fixtures: json('demo.json'), planner }
function context(id = 2, position: Position = 3): BuildContext {
  const allies: (number | null)[] = Array(5).fill(null)
  allies[position - 1] = id
  return {
    hero: heroes.find((h) => h.id === id)!,
    position,
    rank: 'Archon',
    draft: { rank: 'Archon', position, allies, enemies: Array(5).fill(null) },
    enemyPositions: Array(5).fill(null),
    strategy: 'auto',
    patch: planner.rules.id,
    asOf: '2026-10-28',
  }
}
const cases = planner.guides.flatMap((guide) =>
  guide.positions.flatMap((position) =>
    (['aggressive', 'defensive', 'sustain'] as LaneStrategy[]).map((strategy) => ({
      heroId: guide.heroId,
      position,
      strategy,
    })),
  ),
)
describe('reviewed hero-and-position guides', () => {
  it.each(cases)(
    'creates a valid $strategy plan for hero $heroId position $position',
    ({ heroId, position, strategy }) => {
      const ctx = { ...context(heroId, position), strategy }
      const plan = createBuildPlan(ctx, planner)
      expect(plan.status, plan.warnings.join('\n')).toBe('ready')
      expect(plan.starting!.totalCost).toBeLessThanOrEqual(plan.starting!.budget)
      expect(plan.starting!.remainingGold).toBe(plan.starting!.budget - plan.starting!.totalCost)
      expect(plan.starting!.mainSlots).toBeLessThanOrEqual(6)
      expect(plan.finalInventory).toHaveLength(6)
      expect(new Set(plan.finalInventory.map((i) => i.item.id)).size).toBe(6)
      for (const final of plan.finalInventory) {
        expect(final.item.slot).toBe('main')
        expect(final.item.consumable).toBe(false)
        expect(plan.progression.some((p) => p.itemId === final.item.id)).toBe(true)
      }
      expect(new Set(plan.progression.at(-1)!.inventoryAfter)).toEqual(
        new Set(plan.finalInventory.map((i) => i.item.id)),
      )
      for (const step of plan.progression) {
        expect(step.inventoryAfter.length).toBeLessThanOrEqual(6)
        expect(step.additionalCost).toBeGreaterThanOrEqual(0)
      }
      expect(plan.skills!.levels).toHaveLength(30)
      const ranks = new Map<string, number>()
      let attributes = 0
      const talentIds = new Set<string>()
      for (const row of plan.skills!.levels) {
        const selection = row.selection
        if (selection.abilityId) {
          const ability = planner.abilities.find(
            (a) => a.id === selection.abilityId && a.heroId === heroId,
          )!
          expect(ability).toBeDefined()
          expect(['basic', 'ultimate']).toContain(ability.kind)
          expect(selection.rank).toBe((ranks.get(ability.id) ?? 0) + 1)
          expect(selection.rank).toBeLessThanOrEqual(ability.maxLevel)
          expect(row.level).toBeGreaterThanOrEqual(ability.requiredLevels[selection.rank - 1]!)
          expect(selection.skillPoints).toBe(1)
          ranks.set(ability.id, selection.rank)
        }
        if (selection.kind === 'attributes') {
          attributes++
          expect(row.level).toBeGreaterThanOrEqual(planner.rules.attributeLevels[attributes - 1]!)
          expect(attributes).toBeLessThanOrEqual(7)
        }
        if (row.talent) {
          expect(row.talent.talent.heroId).toBe(heroId)
          expect(row.talent.talentPoints).toBe(1)
          expect(talentIds.has(row.talent.talent.id)).toBe(false)
          talentIds.add(row.talent.talent.id)
        }
      }
      expect(attributes).toBe(7)
      expect(talentIds.size).toBe(8)
      expect(plan.skills!.innates.every((a) => a.kind === 'innate')).toBe(true)
      expect(
        plan.skills!.levels.some((row) =>
          plan.skills!.innates.some((a) => a.id === row.selection.abilityId),
        ),
      ).toBe(false)
    },
  )
})
describe('starting purchases and lane strategy', () => {
  it('counts purchase packs, charges, and unstackable branches correctly', () => {
    const guide = planner.guides.find((g) => g.heroId === 8)!
    const inventory = startingInventory(planner, guide, 'sustain')
    const tango = inventory.purchases.find((i) => i.item.id === 'tango')!
    expect(tango.quantity).toBe(2)
    expect(tango.charges).toBe(6)
    expect(tango.slots).toBe(1)
    expect(tango.totalCost).toBe(180)
    expect(inventory.purchases.find((i) => i.item.id === 'branches')!.slots).toBe(2)
    expect(inventory.purchases.some((i) => i.item.id === 'tpscroll' || i.item.cost === 0)).toBe(
      false,
    )
    const support = startingInventory(
      planner,
      planner.guides.find((g) => g.heroId === 5)!,
      'aggressive',
    )
    expect(support.purchases.find((i) => i.item.id === 'enchanted_mango')!.slots).toBe(1)
  })
  it('makes defensible substitutions without forcing every strategy to differ', () => {
    const guide = planner.guides.find((g) => g.heroId === 8)!
    expect(
      startingInventory(planner, guide, 'defensive').purchases.some((i) => i.item.id === 'flask'),
    ).toBe(true)
    expect(
      startingInventory(planner, guide, 'aggressive').purchases.some(
        (i) => i.item.id === 'orb_of_venom',
      ),
    ).toBe(true)
    const meepo = planner.guides.find((g) => g.heroId === 82)!
    expect(startingInventory(planner, meepo, 'aggressive').purchases).toEqual(
      startingInventory(planner, meepo, 'sustain').purchases,
    )
  })
  it('does not infer enemy lane positions from slot order or full-team threats', () => {
    const ctx = context(8, 1)
    ctx.draft.enemies = [25, 82, null, null, null]
    const baseline = createBuildPlan(ctx, planner)
    expect(baseline.lane.confidence).toBe('estimated')
    expect(baseline.lane.opponentIds).toEqual([])
    ctx.enemyPositions = [2, null, null, null, null]
    expect(createBuildPlan(ctx, planner).lane.opponentIds).toEqual([])
    ctx.enemyPositions = [3, 4, null, null, null]
    const assigned = createBuildPlan(ctx, planner)
    expect(assigned.lane.confidence).toBe('assigned')
    expect(assigned.lane.strategy).toBe('defensive')
    expect(assigned.lane.opponentIds).toEqual([25, 82])
  })
  it('uses the opposing mid only for position two and pairs the correct allied lane partner', () => {
    const ctx = context(25, 2)
    ctx.draft.enemies = [82, 2, null, null, null]
    ctx.enemyPositions = [2, 3, null, null, null]
    expect(createBuildPlan(ctx, planner).lane.opponentIds).toEqual([82])
    const side = context(8, 1)
    side.draft.allies[4] = 5
    expect(createBuildPlan(side, planner).lane.allyIds).toEqual([5])
  })
  it('keeps partial and unreviewed lane information explicitly limited', () => {
    const ctx = context(8, 1)
    ctx.draft.enemies[0] = 145
    ctx.enemyPositions[0] = 3
    const plan = createBuildPlan(ctx, planner)
    expect(plan.status).toBe('ready')
    expect(plan.lane.confidence).toBe('partial')
    expect(plan.lane.explanation).toContain('retain the baseline')
    expect(plan.lane.explanation).not.toContain('manageable')
    expect(plan.warnings.join(' ')).toContain('incomplete')
  })
  it('an override changes the start and skill variant without mutating heroes', () => {
    const ctx = context(8, 1)
    const before = JSON.stringify(ctx.draft)
    const defensive = createBuildPlan({ ...ctx, strategy: 'defensive' }, planner)
    const aggressive = createBuildPlan({ ...ctx, strategy: 'aggressive' }, planner)
    expect(defensive.lane.overridden).toBe(true)
    expect(defensive.starting!.purchases).not.toEqual(aggressive.starting!.purchases)
    expect(defensive.skills!.levels[0]!.selection.abilityId).not.toBe(
      aggressive.skills!.levels[0]!.selection.abilityId,
    )
    expect(JSON.stringify(ctx.draft)).toBe(before)
  })
  it('rejects overspending, slot overflow, negative/fractional quantities, and free items as purchases', () => {
    const guide = structuredClone(planner.guides.find((g) => g.heroId === 8)!)
    expect(() =>
      startingInventory(
        { ...planner, rules: { ...planner.rules, startingGold: 100 } },
        guide,
        'sustain',
      ),
    ).toThrow(/budget/)
    for (const quantity of [0, -1, 1.5]) {
      guide.starting.sustain.purchases = [{ itemId: 'branches', quantity, reason: 'invalid' }]
      expect(() => startingInventory(planner, guide, 'sustain')).toThrow(/quantities/)
    }
    guide.starting.sustain.purchases = [{ itemId: 'branches', quantity: 7, reason: 'invalid' }]
    expect(() => startingInventory(planner, guide, 'sustain')).toThrow(/capacity/)
    guide.starting.sustain.purchases = [{ itemId: 'ward_observer', quantity: 1, reason: 'free' }]
    expect(() => startingInventory(planner, guide, 'sustain')).toThrow(/Invalid starting/)
  })
})
describe('coherent item paths and specific counter mechanics', () => {
  it('reuses starting components, upgrades boots, and counts only the completed item', () => {
    const plan = createBuildPlan(context(8, 1), planner)
    const wand = plan.progression.find((step) => step.itemId === 'magic_wand')!
    expect(wand.uses).toEqual(
      expect.arrayContaining([
        { itemId: 'magic_stick', quantity: 1 },
        { itemId: 'branches', quantity: 2 },
      ]),
    )
    expect(wand.additionalCost).toBe(wand.item.recipeCost)
    const boots = plan.progression.find((step) => step.itemId === 'phase_boots')!
    expect(boots.uses).toContainEqual({ itemId: 'boots', quantity: 1 })
    expect(plan.finalInventory.map((i) => i.item.id)).not.toContain('boots')
    const fury = plan.progression.find((step) => step.itemId === 'bfury')!
    expect(fury.uses).toContainEqual({ itemId: 'quelling_blade', quantity: 1 })
    expect(plan.progression.some((step) => step.sells.includes('magic_wand'))).toBe(true)
  })
  it('keeps Shard, TP and other consumed/special items out of final slots', () => {
    const plan = createBuildPlan(context(5, 5), planner)
    expect(plan.progression.some((step) => step.itemId === 'aghanims_shard')).toBe(true)
    expect(plan.finalInventory.some((i) => i.item.consumable || i.item.slot !== 'main')).toBe(false)
    expect(
      plan.skills!.itemGranted.every(
        (a) => !plan.skills!.levels.some((row) => row.selection.abilityId === a.id),
      ),
    ).toBe(true)
  })
  it('prioritizes support saves against magic and marks already covered protection', () => {
    const ctx = context(5, 5)
    ctx.draft.enemies[0] = 25
    ctx.draft.allies[0] = 8
    const plan = createBuildPlan(ctx, planner)
    const glimmer = plan.alternatives.find((c) => c.item.id === 'glimmer_cape')!
    expect(glimmer.covered).toBe(true)
    expect(glimmer.selected).toBe(true)
    expect(glimmer.influencedBy).toEqual([25])
    expect(plan.progression.find((s) => s.itemId === 'glimmer_cape')!.abilityIds).toContain(
      'lina_dragon_slave',
    )
    expect(plan.finalInventory.filter((i) => i.importance === 'luxury').length).toBeGreaterThan(0)
  })
  it('does not recommend BKB against Axe’s piercing taunt or Lotus against ground smoke', () => {
    const ctx = context(8, 1)
    ctx.draft.enemies[0] = 2
    expect(
      createBuildPlan(ctx, planner).alternatives.some((c) => c.item.id === 'black_king_bar'),
    ).toBe(false)
    const support = context(5, 5)
    support.draft.enemies[0] = 32
    const plan = createBuildPlan(support, planner)
    expect(plan.alternatives.some((c) => c.item.id === 'lotus_orb')).toBe(false)
    expect(plan.progression.find((s) => s.itemId === 'dust')?.influencedBy).toEqual([32])
    expect(plan.finalInventory.some((s) => s.item.id === 'dust')).toBe(false)
  })
  it('does not stack a redundant silence-only BKB on a Manta core', () => {
    const ctx = context(8, 1)
    ctx.draft.enemies[0] = 75
    const plan = createBuildPlan(ctx, planner)
    expect(plan.alternatives.some((c) => c.item.id === 'black_king_bar')).toBe(false)
    expect(plan.progression.find((s) => s.itemId === 'manta')!.influencedBy).toEqual([75])
  })
  it('recognizes existing cleave and restoration reduction instead of adding unrelated items', () => {
    const jugg = context(8, 1)
    jugg.draft.enemies[0] = 12
    expect(
      createBuildPlan(jugg, planner).alternatives.find((c) => c.item.id === 'bfury')!.covered,
    ).toBe(true)
    const axe = context()
    axe.draft.enemies[0] = 36
    expect(
      createBuildPlan(axe, planner).progression.find((p) => p.itemId === 'shivas_guard')!
        .influencedBy,
    ).toEqual([36])
  })
  it('uses accuracy only for a compatible attack core and avoids Ghost into severe magic', () => {
    const ctx = context(8, 1)
    ctx.draft.enemies[0] = 44
    expect(
      createBuildPlan(ctx, planner).finalInventory.some((i) => i.item.id === 'monkey_king_bar'),
    ).toBe(true)
    const lina = context(25, 2)
    lina.draft.enemies[0] = 44
    expect(
      createBuildPlan(lina, planner).alternatives.some((c) => c.item.id === 'monkey_king_bar'),
    ).toBe(false)
    const support = context(5, 5)
    support.draft.enemies = [44, 25, null, null, null]
    expect(createBuildPlan(support, planner).alternatives.some((c) => c.item.id === 'ghost')).toBe(
      false,
    )
  })
  it('selects one permanent substitution, keeps alternatives coherent, and removes enemy-only changes', () => {
    const ctx = context(8, 1)
    ctx.draft.enemies = [44, 25, 32, null, null]
    const plan = createBuildPlan(ctx, planner)
    expect(plan.status, plan.warnings.join('\n')).toBe('ready')
    expect(
      plan.alternatives.filter((c) => c.selected && !c.covered && !c.item.consumable).length,
    ).toBeLessThanOrEqual(1)
    for (const alternative of plan.alternatives.filter((c) => !c.selected))
      expect(plan.finalInventory.some((i) => i.item.id === alternative.replaces)).toBe(true)
    const baseline = createBuildPlan(
      { ...ctx, draft: { ...ctx.draft, enemies: Array(5).fill(null) } },
      planner,
    )
    expect(baseline.alternatives).toEqual([])
    expect(baseline.progression.every((p) => !p.influencedBy.length)).toBe(true)
  })
})
describe('ability legality and patch handling', () => {
  it('retains essential early lane utility before maximizing one ability', () => {
    for (const guide of planner.guides)
      for (const strategy of ['aggressive', 'defensive', 'sustain'] as const) {
        const plan = createBuildPlan(
          { ...context(guide.heroId, guide.positions[0]!), strategy },
          planner,
        )
        const early = new Set(
          plan.skills!.levels.filter((row) => row.level <= 4).map((row) => row.selection.abilityId),
        )
        for (const ability of planner.abilities.filter(
          (a) => a.heroId === guide.heroId && a.kind === 'basic',
        ))
          expect(early.has(ability.id), `${guide.heroId}: ${ability.name}`).toBe(true)
      }
  })
  it('adapts a specific talent to evasion and preserves its remaining counterpart at 29', () => {
    const ctx = context(82, 2)
    ctx.draft.enemies[0] = 44
    const plan = createBuildPlan(ctx, planner)
    expect(plan.status, plan.warnings.join(' ')).toBe('ready')
    expect(plan.skills!.levels.find((row) => row.level === 20)!.talent!.talent.name).toContain(
      'True Strike',
    )
    expect(plan.skills!.levels.find((row) => row.level === 29)!.talent!.talent.name).toContain(
      'Ransack',
    )
    expect(plan.skills!.influencedBy).toContain(44)
    const baseline = createBuildPlan(context(82, 2), planner)
    expect(baseline.skills!.levels.find((row) => row.level === 20)!.talent!.talent.name).toContain(
      'Ransack',
    )
  })
  it('uses separate ability and talent points at the same level and fills standard attributes by 22', () => {
    const plan = createBuildPlan(context(5, 5), planner)
    const ten = plan.skills!.levels.find((row) => row.level === 10)!
    expect(ten.selection.skillPoints).toBe(1)
    expect(ten.talent!.talentPoints).toBe(1)
    expect(
      plan.skills!.levels.filter((row) => row.level <= 22 && row.selection.kind === 'attributes'),
    ).toHaveLength(7)
    expect(
      plan
        .skills!.levels.filter((row) => row.selection.abilityId === 'crystal_maiden_freezing_field')
        .map((row) => row.level),
    ).toEqual([6, 12, 18])
    expect(plan.skills!.levels.filter((row) => row.talent).map((row) => row.level)).toEqual([
      10, 15, 20, 25, 27, 28, 29, 30,
    ])
  })
  it('supports Meepo’s four ultimate ranks at hero-specific levels', () => {
    const plan = createBuildPlan(context(82, 2), planner)
    expect(plan.status, plan.warnings.join('\n')).toBe('ready')
    expect(
      plan
        .skills!.levels.filter((row) => row.selection.abilityId === 'meepo_divided_we_stand')
        .map((row) => row.level),
    ).toEqual([3, 10, 17, 24])
  })
  it('fails closed on another hero’s ability, illegal rank requirements, invalid recipes, and unavailable items', () => {
    for (const mutation of ['foreign', 'ranks', 'recipe', 'removed']) {
      const data = structuredClone(planner)
      if (mutation === 'foreign')
        data.guides.find((g) => g.heroId === 2)!.skills.aggressive.first = 'lina_dragon_slave'
      if (mutation === 'ranks')
        data.abilities.find((a) => a.id === 'axe_culling_blade')!.requiredLevels = [6, 12, 31]
      if (mutation === 'recipe') data.items.find((i) => i.id === 'phase_boots')!.recipeCost += 1
      if (mutation === 'removed') data.items.find((i) => i.id === 'heart')!.purchasable = false
      const plan = createBuildPlan(context(), data)
      expect(plan.status).toBe('limited')
      expect(plan.starting).toBeNull()
      expect(plan.skills).toBeNull()
      expect(plan.progression).toEqual([])
    }
  })
  it('discloses unsupported heroes/roles, absent data, stale snapshots and patch mismatches', () => {
    expect(createBuildPlan(context(145, 1), planner).status).toBe('limited')
    expect(createBuildPlan(context(2, 1), planner).progression).toEqual([])
    expect(createBuildPlan(context()).status).toBe('limited')
    expect(
      createBuildPlan({ ...context(), asOf: '2027-01-01' }, planner).warnings.join(' '),
    ).toContain('Stale snapshot')
    expect(createBuildPlan({ ...context(), patch: 'future' }, planner).status).toBe('limited')
  })
  it('is deterministic, leaves inputs unchanged, and does not invent rank effects', () => {
    const ctx = context()
    const before = JSON.stringify({ ctx, planner })
    expect(createBuildPlan(ctx, planner)).toEqual(createBuildPlan(ctx, planner))
    expect(createBuildPlan({ ...ctx, rank: 'Immortal' }, planner)).toEqual(
      createBuildPlan(ctx, planner),
    )
    expect(JSON.stringify({ ctx, planner })).toBe(before)
    expect(
      analyzeLane(
        ctx,
        planner,
        planner.guides.find((g) => g.heroId === 2),
      ),
    ).toBeDefined()
  })
  it('has real references, complete local artwork, and no facet selections in normalized data', () => {
    for (const entry of [...planner.items, ...planner.abilities])
      expect(existsSync(new URL(`../public/${entry.icon}`, import.meta.url)), entry.icon).toBe(true)
    for (const threat of planner.threats)
      expect(
        planner.abilities.some((a) => a.id === threat.abilityId && a.heroId === threat.heroId),
      ).toBe(true)
    expect(JSON.stringify(planner.guides)).not.toContain('facet')
    for (const item of planner.items)
      expect(
        item.components.reduce(
          (sum, c) => sum + planner.items.find((i) => i.id === c.itemId)!.cost * c.quantity,
          item.recipeCost,
        ),
      ).toBe(item.cost)
  })
})
describe('reactive draft and planner integration', () => {
  beforeEach(() => setActivePinia(createPinia()))
  async function ready() {
    const store = useDraftStore()
    await store.load({ load: async () => dataset })
    store.setRank('Archon')
    store.setPosition(3)
    store.pickOwnHero(2)
    return store
  }
  it('recalculates the existing Axe demo and removes counter provenance when the enemy is removed', async () => {
    const store = await ready()
    store.setHero('enemies', 0, 5)
    expect(store.buildPlan!.progression.some((s) => s.influencedBy.includes(5))).toBe(true)
    store.setHero('enemies', 0, null)
    expect(store.buildPlan!.progression.every((s) => !s.influencedBy.length)).toBe(true)
  })
  it('validates unique optional enemy positions and clears assignments on removal/reset', async () => {
    const store = await ready()
    store.setHero('enemies', 0, 25)
    store.setHero('enemies', 1, 8)
    expect(store.setEnemyPosition(0, 1)).toBe(true)
    expect(store.setEnemyPosition(1, 1)).toBe(false)
    expect(store.setEnemyPosition(2, 5)).toBe(false)
    expect(store.setEnemyPosition(0, 6 as Position)).toBe(false)
    store.setHero('enemies', 0, null)
    expect(store.enemyPositions[0]).toBeNull()
    store.setEnemyPosition(1, 5)
    store.setStrategy('defensive')
    store.resetDraft()
    expect(store.enemyPositions).toEqual(Array(5).fill(null))
    expect(store.strategy).toBe('auto')
    expect(store.rank).toBe('Archon')
    expect(store.position).toBe(3)
    expect(store.buildPlan).toBeNull()
  })
  it('reacts to assignments, allies, strategy, rank, hero and position without leaking recommendations', async () => {
    const store = await ready()
    store.setPosition(1)
    store.pickOwnHero(8)
    store.setHero('enemies', 0, 25)
    store.setHero('enemies', 1, 82)
    expect(store.buildPlan!.lane.confidence).toBe('estimated')
    store.setEnemyPosition(0, 3)
    store.setEnemyPosition(1, 4)
    expect(store.buildPlan!.lane.strategy).toBe('defensive')
    store.setHero('allies', 4, 5)
    expect(store.buildPlan!.lane.allyIds).toEqual([5])
    store.setStrategy('aggressive')
    expect(store.buildPlan!.lane.strategy).toBe('aggressive')
    const gold = store.buildPlan!.starting!.totalCost
    store.setRank('Immortal')
    expect(store.buildPlan!.starting!.totalCost).toBe(gold)
    store.setHero('enemies', 0, null)
    store.setPosition(2)
    store.pickOwnHero(25)
    expect(store.strategy).toBe('auto')
    expect(store.buildPlan!.heroId).toBe(25)
    expect(
      store.buildPlan!.skills!.levels.every(
        (row) => !row.selection.abilityId?.startsWith('juggernaut_'),
      ),
    ).toBe(true)
    store.pickOwnHero(145)
    expect(store.buildPlan!.status).toBe('limited')
    expect(store.buildPlan!.finalInventory).toEqual([])
  })
})
