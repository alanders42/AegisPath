import type {
  BuildContext,
  CounterDecision,
  EnemyThreat,
  HeroGuide,
  PlannerDataset,
} from '@/types/planner'
export function counterDecisions(
  context: BuildContext,
  data: PlannerDataset,
  guide: HeroGuide,
  threats: EnemyThreat[],
): CounterDecision[] {
  const existing = new Set(guide.steps.map((step) => step.itemId))
  const severe = threats.filter((t) => t.severity >= 3).map((t) => t.mechanic)
  const decisions: CounterDecision[] = []
  for (const rule of data.counterRules) {
    if (!rule.roles.includes(context.position) || !guide.compatibleCounters.includes(rule.itemId))
      continue
    if (rule.excludesMechanics?.some((mechanic) => severe.includes(mechanic))) continue
    if (
      rule.id === 'team-pipe' &&
      !context.draft.allies.some((id) => id !== null && id !== context.hero.id)
    )
      continue
    const affected = threats.filter(
      (t) =>
        rule.mechanics.includes(t.mechanic) &&
        t.severity >= rule.minimumSeverity &&
        !(
          rule.itemId === 'black_king_bar' &&
          t.mechanic === 'dispellable-silence' &&
          existing.has('manta')
        ),
    )
    if (!affected.length) continue
    const item = data.items.find((i) => i.id === rule.itemId)
    if (!item?.purchasable) continue
    const heroIds = [...new Set(affected.map((t) => t.heroId))]
    const severity = heroIds.reduce(
      (sum, id) =>
        sum + Math.max(...affected.filter((t) => t.heroId === id).map((t) => t.severity)),
      0,
    )
    decisions.push({
      ruleId: rule.id,
      item,
      score: rule.priority + severity * 5,
      reason: rule.reason,
      limitations: rule.limitations,
      influencedBy: heroIds,
      abilityIds: [...new Set(affected.map((t) => t.abilityId))],
      stage: rule.stage,
      replaces: item.consumable ? null : guide.counterReplacement,
      selected: existing.has(item.id),
      covered: existing.has(item.id),
    })
  }
  decisions.sort((a, b) => b.score - a.score || a.ruleId.localeCompare(b.ruleId))
  // One coherent primary branch, not a shopping list of all possible counters.
  const permanent = decisions.find((d) => !d.covered && !d.item.consumable)
  if (permanent) {
    permanent.selected = true
    for (const decision of decisions)
      if (!decision.selected && !decision.item.consumable && decision !== permanent)
        decision.replaces = permanent.item.id
  }
  for (const decision of decisions) if (decision.item.consumable) decision.selected = true
  return decisions
    .filter((d) => d.selected)
    .concat(decisions.filter((d) => !d.selected).slice(0, 3))
}
