import type {
  BuildContext,
  HeroGuide,
  LaneAssessment,
  PlannerDataset,
  SkillLevel,
  SkillPlan,
  SkillSelection,
} from '@/types/planner'
export function skillPlan(
  context: BuildContext,
  data: PlannerDataset,
  guide: HeroGuide,
  lane: LaneAssessment,
): SkillPlan {
  const variant = guide.skills[lane.strategy]
  const own = data.abilities.filter((a) => a.heroId === context.hero.id)
  const trainable = own.filter((a) => a.kind === 'basic' || a.kind === 'ultimate')
  const byId = new Map(trainable.map((a) => [a.id, a]))
  if (
    !variant ||
    !byId.has(variant.first) ||
    variant.priority.some((id) => !byId.has(id)) ||
    variant.opening.some(
      (entry) =>
        !byId.has(entry.abilityId) ||
        !Number.isInteger(entry.level) ||
        entry.level < 1 ||
        entry.level > 30,
    ) ||
    new Set(variant.opening.map((entry) => entry.level)).size !== variant.opening.length ||
    new Set(variant.priority).size !== trainable.length
  )
    throw new Error('Skill variant does not reference exactly this hero’s trainable abilities.')
  for (const ability of trainable)
    if (ability.requiredLevels.length !== ability.maxLevel)
      throw new Error(`Missing rank requirements for ${ability.name}.`)
  const ranks = new Map<string, number>()
  let attributes = 0
  const levels: SkillLevel[] = []
  const selectedTalentSides = new Map<number, number>()
  const talentInfluence = new Set<number>()
  const enemyThreats = data.threats.filter((threat) =>
    context.draft.enemies.includes(threat.heroId),
  )
  for (let level = 1; level <= 30; level++) {
    const available = trainable.filter(
      (a) => (a.requiredLevels[ranks.get(a.id) ?? 0] ?? Infinity) <= level,
    )
    const opening = variant.opening.find((entry) => entry.level === level)
    if (opening && !available.some((ability) => ability.id === opening.abilityId))
      throw new Error('The reviewed opening includes an illegal ability upgrade.')
    const preferred =
      available.find((a) => a.kind === 'ultimate') ??
      (opening
        ? byId.get(opening.abilityId)
        : variant.priority.map((id) => byId.get(id)!).find((a) => available.includes(a)))
    let selection: SkillSelection
    if (preferred && available.includes(preferred)) {
      const rank = (ranks.get(preferred.id) ?? 0) + 1
      ranks.set(preferred.id, rank)
      selection = {
        abilityId: preferred.id,
        name: preferred.name,
        icon: preferred.icon,
        rank,
        kind: 'ability',
        skillPoints: 1,
        explanation:
          level === 1
            ? variant.explanation
            : preferred.kind === 'ultimate'
              ? 'Take the next ultimate rank at its hero-specific unlock level.'
              : (opening?.reason ??
                'Prioritize the reviewed variant while respecting this ability’s rank requirements.'),
      }
    } else if ((guide.attributeLevels[attributes] ?? Infinity) <= level) {
      attributes++
      selection = {
        abilityId: null,
        name: `+${data.rules.attributeValue} All Attributes`,
        icon: null,
        rank: attributes,
        kind: 'attributes',
        skillPoints: 1,
        explanation:
          'All currently available spell ranks are filled; allocate the next legal attribute bonus.',
      }
    } else
      selection = {
        abilityId: null,
        name: 'No further upgrade',
        icon: null,
        rank: 0,
        kind: 'complete',
        skillPoints: 0,
        explanation: available.length
          ? 'No reviewed choice for this level.'
          : 'No trainable rank is available at this level. Later ultimate or talent unlocks are shown separately.',
      }
    const tierIndex = data.rules.talentLevels.indexOf(level)
    const returnIndex = data.rules.talentReturnLevels.indexOf(level)
    const index = tierIndex >= 0 ? tierIndex : returnIndex
    let talent: SkillLevel['talent'] = null
    if (index >= 0) {
      const tier = data.rules.talentLevels[index]!
      const override = guide.talentRules?.find(
        (rule) =>
          rule.tier === tier && enemyThreats.some((threat) => threat.mechanic === rule.mechanic),
      )
      const selectedSide =
        tierIndex >= 0
          ? (override?.side ?? variant.talentSides[index])
          : selectedTalentSides.get(tier)
      if (tierIndex >= 0 && selectedSide !== undefined) selectedTalentSides.set(tier, selectedSide)
      if (override)
        for (const threat of enemyThreats.filter((t) => t.mechanic === override.mechanic))
          talentInfluence.add(threat.heroId)
      if (selectedSide !== 0 && selectedSide !== 1) throw new Error('Missing talent choice.')
      const side = tierIndex >= 0 ? selectedSide : 1 - selectedSide
      const definition = data.talents.find(
        (t) => t.heroId === context.hero.id && t.tier === tier && t.side === side,
      )
      if (!definition) throw new Error('A talent choice is missing from this patch’s hero data.')
      talent = {
        talent: definition,
        talentPoints: 1,
        reason:
          tierIndex >= 0
            ? (override?.reason ?? variant.talentReasons[index] ?? 'Reviewed talent choice.')
            : `Take the remaining level-${tier} talent using its separate talent point.`,
      }
    }
    levels.push({ level, selection, talent })
  }
  for (const ability of trainable)
    if (ranks.get(ability.id) !== ability.maxLevel)
      throw new Error(`The skill plan cannot complete ${ability.name} by level 30.`)
  return {
    levels,
    innates: own.filter((a) => a.kind === 'innate'),
    itemGranted: own.filter((a) => a.kind === 'item-granted'),
    explanation: variant.explanation,
    firstReason: `Start with ${byId.get(variant.first)!.name}. ${variant.explanation} The priority is ${variant.priority
      .filter((id) => byId.get(id)?.kind !== 'ultimate')
      .map((id) => byId.get(id)!.name)
      .join(' → ')}; take ultimate ranks at their own unlock levels.`,
    influencedBy: [...new Set([...lane.opponentIds, ...talentInfluence])],
  }
}
