import type { BuildContext, BuildPlan, PlannerDataset } from '@/types/planner'
import { analyzeLane, lineupThreats } from './strategy'
import { startingInventory } from './startingInventory'
import { counterDecisions } from './counters'
import { itemProgression } from './itemProgression'
import { skillPlan } from './skills'
export function createBuildPlan(context: BuildContext, data?: PlannerDataset): BuildPlan {
  const guide = data?.guides.find(
    (guide) => guide.heroId === context.hero.id && guide.positions.includes(context.position),
  )
  const emptyData: PlannerDataset = {
    rules: {
      id: context.patch,
      checkedAt: '',
      startingGold: 0,
      mainSlots: 6,
      backpackSlots: 3,
      talentLevels: [],
      talentReturnLevels: [],
      attributeLevels: [],
      attributeValue: 0,
      sources: [],
    },
    items: [],
    abilities: [],
    talents: [],
    threats: [],
    guides: [],
    counterRules: [],
    sources: [],
  }
  const plan: BuildPlan = {
    status: 'limited',
    heroId: context.hero.id,
    position: context.position,
    title: guide?.title ?? `${context.hero.name} · Limited coverage`,
    patch: data?.rules.id ?? 'Unavailable',
    confidence: 'Limited data',
    warnings: [],
    lane: analyzeLane(context, data ?? emptyData, guide),
    starting: null,
    progression: [],
    finalInventory: [],
    alternatives: [],
    skills: null,
    sources: data ? [...data.sources, ...data.rules.sources, ...(guide ? [guide.source] : [])] : [],
  }
  if (!data) {
    plan.warnings.push(
      'The planner dataset is unavailable. Drafting and demo hero suggestions still work; reload to retry.',
    )
    return plan
  }
  if (!guide) {
    plan.warnings.push(
      'No reviewed build for this hero and position. No generic six-slot inventory or skill order is invented. Try Juggernaut (1), Lina or Meepo (2), Axe (3), Rubick (4/5), or Crystal Maiden (4/5).',
    )
    return plan
  }
  if (context.patch !== data.rules.id || guide.patch !== data.rules.id) {
    plan.warnings.push(
      'Patch mismatch: this guide cannot be validated against the selected game rules.',
    )
    return plan
  }
  const age = (Date.parse(context.asOf) - Date.parse(data.rules.checkedAt)) / 86400000
  if (!Number.isFinite(age) || age > 30)
    plan.warnings.push(
      `Stale snapshot: last verified ${data.rules.checkedAt}. The currently running game may have changed; check the patch before following this guide.`,
    )
  const unknown = context.draft.enemies.filter(
    (id): id is number => id !== null && !data.threats.some((threat) => threat.heroId === id),
  )
  if (unknown.length)
    plan.warnings.push(
      `Threat coverage is incomplete for ${unknown.length} selected opponent(s). No absence of danger is implied.`,
    )
  plan.warnings.push(
    'Curated guidance, not a measured optimal build. Rank-specific builds and reliable item timings are not available; the selected rank does not alter this guide.',
  )
  try {
    plan.starting = startingInventory(data, guide, plan.lane.strategy)
    plan.alternatives = counterDecisions(context, data, guide, lineupThreats(context, data))
    const items = itemProgression(context, data, guide, plan.starting, plan.alternatives)
    plan.progression = items.progression
    plan.finalInventory = items.finalInventory
    plan.skills = skillPlan(context, data, guide, plan.lane)
    plan.status = 'ready'
    plan.confidence = 'Curated guide'
    plan.warnings.push(guide.note)
  } catch (error) {
    plan.starting = null
    plan.progression = []
    plan.finalInventory = []
    plan.alternatives = []
    plan.skills = null
    plan.warnings.push(
      `Guide validation failed: ${error instanceof Error ? error.message : 'Invalid guide data.'}`,
    )
  }
  return plan
}
