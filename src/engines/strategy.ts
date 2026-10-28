import type {
  BuildContext,
  EnemyThreat,
  HeroGuide,
  LaneAssessment,
  LaneStrategy,
  PlannerDataset,
} from '@/types/planner'
import type { Position } from '@/types'
export function analyzeLane(
  context: BuildContext,
  data: PlannerDataset,
  guide?: HeroGuide,
): LaneAssessment {
  const expected: Position[] =
    context.position === 2 ? [2] : [1, 5].includes(context.position) ? [3, 4] : [1, 5]
  const assigned = expected.filter((position) =>
    context.enemyPositions.some(
      (p, index) => p === position && context.draft.enemies[index] !== null,
    ),
  )
  const opponentIds = context.draft.enemies.filter(
    (id, index): id is number =>
      id !== null && expected.includes(context.enemyPositions[index] as Position),
  )
  const partner: Position | null = ({ 1: 5, 2: null, 3: 4, 4: 3, 5: 1 } as const)[context.position]
  const allyIds =
    partner && context.draft.allies[partner - 1] ? [context.draft.allies[partner - 1]!] : []
  const threats = data.threats.filter((threat) => opponentIds.includes(threat.heroId))
  const pressure = opponentIds.reduce(
    (sum, id) =>
      sum + Math.max(0, ...threats.filter((t) => t.heroId === id).map((t) => t.lanePressure)),
    0,
  )
  const strength =
    (guide?.laneStrength ?? 0) +
    (allyIds.some((id) => data.guides.some((g) => g.heroId === id)) ? 1 : 0)
  const unreviewed = opponentIds.filter((id) => !data.threats.some((t) => t.heroId === id))
  const confidence = !assigned.length
    ? 'estimated'
    : assigned.length === expected.length && !unreviewed.length
      ? 'assigned'
      : 'partial'
  let automatic: LaneStrategy = guide?.preferredStrategy ?? 'sustain'
  if (opponentIds.length && !unreviewed.length)
    automatic =
      pressure > strength ? 'defensive' : strength >= pressure + 2 ? 'aggressive' : 'sustain'
  const strategy = context.strategy === 'auto' ? automatic : context.strategy
  const actions: Record<LaneStrategy, string[]> = {
    aggressive: [
      'Trade around a ready control spell and your lane partner’s position.',
      'Keep regeneration available; secure the wave before chasing a kill.',
      'Use vision and creep positioning to avoid a counter-initiation.',
    ],
    defensive: [
      'Stay in experience range and avoid prolonged unfavorable trades.',
      'Use regeneration from safety; ask your lane partner to secure pulls or cover retreats.',
      'Take safe last hits and rebuild resources before contesting the next wave.',
    ],
    sustain: [
      'Prioritize stable last hits and experience over uncertain kill attempts.',
      'Maintain lane equilibrium and coordinate pulls or rune access.',
      'Use spells efficiently and keep enough resources for a safe retreat.',
    ],
  }
  return {
    strategy,
    automatic,
    overridden: context.strategy !== 'auto',
    confidence,
    opponentIds,
    allyIds,
    threats,
    assessment:
      confidence === 'estimated'
        ? 'Estimated lane: enemy positions are unknown.'
        : confidence === 'partial'
          ? 'Partial lane information; missing assignments or threat coverage limit the assessment.'
          : 'Lane opponents follow the positions you assigned, not an inferred draft order.',
    explanation: `${context.strategy !== 'auto' ? 'Your override controls the starting purchase and skill variant. ' : ''}${unreviewed.length ? 'Some assigned opponents lack reviewed threats; retain the baseline rather than assume they are safe.' : opponentIds.length ? `Reviewed lane pressure is ${pressure > strength ? 'higher than' : 'manageable relative to'} this guide’s trading tools. ${confidence === 'partial' ? 'Missing enemy assignments still limit this assessment.' : 'Review actual lane swaps before committing to the plan.'}` : 'Using the hero-and-position baseline until lane opponents are assigned; full-team threats still inform later items.'}`,
    advantages: guide?.advantages ?? ['No reviewed lane advantages for this hero and position.'],
    actions: actions[strategy],
  }
}
export function lineupThreats(context: BuildContext, data: PlannerDataset): EnemyThreat[] {
  return data.threats.filter((threat) => context.draft.enemies.includes(threat.heroId))
}
