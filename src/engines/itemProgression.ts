import type {
  BuildContext,
  CounterDecision,
  FinalInventoryItem,
  GuideStep,
  HeroGuide,
  PlannedPurchase,
  PlannerDataset,
  StartingInventory,
} from '@/types/planner'
const stages = ['Laning phase', 'Early game', 'Midgame', 'Late game']
export function itemProgression(
  context: BuildContext,
  data: PlannerDataset,
  guide: HeroGuide,
  starting: StartingInventory,
  counters: CounterDecision[],
): { progression: PlannedPurchase[]; finalInventory: FinalInventoryItem[] } {
  const items = new Map(data.items.map((i) => [i.id, i]))
  const finals = [...guide.finalItems]
  let steps: (GuideStep & { influencedBy: number[]; abilityIds: string[] })[] = guide.steps.map(
    (step) => ({ ...step, influencedBy: [], abilityIds: [] }),
  )
  for (const counter of counters.filter((c) => c.selected)) {
    const existing = steps.find((step) => step.itemId === counter.item.id)
    if (existing) {
      existing.reason += ` ${counter.reason} ${counter.limitations}`
      existing.influencedBy = counter.influencedBy
      existing.abilityIds = counter.abilityIds
      if (stages.indexOf(existing.stage) > stages.indexOf(counter.stage))
        existing.stage = counter.stage
    } else {
      const targetIndex = counter.replaces ? finals.indexOf(counter.replaces) : -1
      if (!counter.item.consumable && targetIndex < 0)
        throw new Error('A counter branch has no valid final-slot replacement.')
      if (targetIndex >= 0) {
        finals[targetIndex] = counter.item.id
        steps = steps.filter((step) => step.itemId !== counter.replaces)
      }
      steps.push({
        itemId: counter.item.id,
        stage: counter.stage,
        reason: `${counter.reason} ${counter.limitations}`,
        importance: 'situational',
        replaces: counter.replaces ? [counter.replaces] : [],
        influencedBy: counter.influencedBy,
        abilityIds: counter.abilityIds,
      })
    }
  }
  // A baseline Manta already addresses ordinary removable silence; do not add a redundant BKB solely for it.
  const silenceIds = [
    ...new Set(
      data.threats
        .filter(
          (t) => context.draft.enemies.includes(t.heroId) && t.mechanic === 'dispellable-silence',
        )
        .map((t) => t.heroId),
    ),
  ]
  const manta = steps.find((step) => step.itemId === 'manta')
  if (manta && silenceIds.length) {
    manta.reason +=
      ' Its basic dispel addresses the selected removable silence; it does not remove mute or every disable.'
    manta.influencedBy = silenceIds
  }
  const boots = new Set(['boots', 'phase_boots', 'power_treads', 'arcane_boots', 'travel_boots'])
  steps.sort(
    (a, b) =>
      stages.indexOf(a.stage) - stages.indexOf(b.stage) ||
      Number(!boots.has(a.itemId) && !a.influencedBy.length) -
        Number(!boots.has(b.itemId) && !b.influencedBy.length),
  )
  if (finals.length !== data.rules.mainSlots || new Set(finals).size !== finals.length)
    throw new Error('Final inventory must contain six distinct main-slot items.')
  const descendants = (id: string, seen = new Set<string>()): Set<string> => {
    if (seen.has(id)) throw new Error('Cyclic recipe in the dataset.')
    const item = items.get(id)
    if (!item) throw new Error(`Missing item definition: ${id}.`)
    const result = new Set<string>()
    for (const component of item.components) {
      result.add(component.itemId)
      for (const child of descendants(component.itemId, new Set([...seen, id]))) result.add(child)
    }
    return result
  }
  for (const id of finals) {
    const item = items.get(id)
    if (!item || !item.purchasable || item.consumable || item.slot !== 'main')
      throw new Error('Final inventory contains an invalid or nonpermanent item.')
    if (finals.some((other) => other !== id && descendants(id).has(other)))
      throw new Error('Final inventory double-counts an item and its upgrade.')
  }
  const inventory = new Map(
    starting.purchases.filter((p) => !p.item.consumable).map((p) => [p.item.id, p.quantity]),
  )
  const progression: PlannedPurchase[] = []
  const increment = (entries: { itemId: string; quantity: number }[], id: string) => {
    const entry = entries.find((e) => e.itemId === id)
    if (entry) entry.quantity++
    else entries.push({ itemId: id, quantity: 1 })
  }
  for (const [index, step] of steps.entries()) {
    const item = items.get(step.itemId)
    if (!item?.purchasable || item.slot !== 'main')
      throw new Error('Progression includes an invalid purchase.')
    const uses: { itemId: string; quantity: number }[] = [],
      componentsToBuy: { itemId: string; quantity: number }[] = []
    const craft = (id: string, path = new Set<string>()): number => {
      if (path.has(id)) throw new Error('Cyclic item recipe.')
      const entry = items.get(id)
      if (!entry?.purchasable || entry.cost < 0 || entry.recipeCost < 0)
        throw new Error(`Invalid recipe component: ${id}.`)
      if ((inventory.get(id) ?? 0) > 0) {
        inventory.set(id, inventory.get(id)! - 1)
        if (!inventory.get(id)) inventory.delete(id)
        increment(uses, id)
        return 0
      }
      if (!entry.components.length) {
        increment(componentsToBuy, id)
        return entry.cost
      }
      const recipeTotal = entry.components.reduce(
        (sum, component) => sum + (items.get(component.itemId)?.cost ?? NaN) * component.quantity,
        entry.recipeCost,
      )
      if (recipeTotal !== entry.cost) throw new Error(`Recipe cost mismatch for ${entry.name}.`)
      let cost = entry.recipeCost
      for (const component of entry.components)
        for (let i = 0; i < component.quantity; i++)
          cost += craft(component.itemId, new Set([...path, id]))
      return cost
    }
    const additionalCost = craft(item.id)
    if (!item.consumable) inventory.set(item.id, (inventory.get(item.id) ?? 0) + 1)
    const sells: string[] = []
    while ([...inventory.values()].reduce((sum, n) => sum + n, 0) > data.rules.mainSlots) {
      const futureNeeds = new Set(
        steps.slice(index + 1).flatMap((step) => [...descendants(step.itemId)]),
      )
      const candidates = [...inventory.keys()]
        .filter((id) => !finals.includes(id) && !futureNeeds.has(id))
        .sort((a, b) => items.get(a)!.cost - items.get(b)!.cost || a.localeCompare(b))
      const sell = candidates[0]
      if (!sell)
        throw new Error('Progression exceeds inventory capacity without a legal replacement.')
      inventory.delete(sell)
      sells.push(sell)
    }
    progression.push({
      ...step,
      item,
      order: index + 1,
      additionalCost,
      uses,
      componentsToBuy,
      sells,
      consumes:
        index === 0
          ? starting.purchases.filter((p) => p.item.consumable).map((p) => p.item.id)
          : item.consumable
            ? [item.id]
            : [],
      inventoryAfter: [...inventory.entries()].flatMap(([id, count]) =>
        Array<string>(count).fill(id),
      ),
    })
  }
  const last = progression.at(-1)
  if (last) {
    for (const id of inventory.keys())
      if (!finals.includes(id)) {
        inventory.delete(id)
        last.sells.push(id)
      }
    last.inventoryAfter = [...inventory.keys()]
  }
  if (finals.some((id) => !inventory.has(id)) || inventory.size !== finals.length)
    throw new Error('The final inventory cannot be reached through this purchase path.')
  return {
    progression,
    finalInventory: finals.map((id) => {
      const step = progression.find((step) => step.itemId === id)!
      return {
        item: items.get(id)!,
        reason: step.reason,
        importance: step.importance,
        influencedBy: step.influencedBy,
      }
    }),
  }
}
