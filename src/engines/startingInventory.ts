import type { HeroGuide, LaneStrategy, PlannerDataset, StartingInventory } from '@/types/planner'
export function startingInventory(
  data: PlannerDataset,
  guide: HeroGuide,
  strategy: LaneStrategy,
): StartingInventory {
  const template = guide.starting[strategy]
  if (!template) throw new Error('No reviewed starting purchase for this strategy.')
  const seen = new Set<string>()
  const purchases = template.purchases.map((entry) => {
    const item = data.items.find((item) => item.id === entry.itemId)
    if (
      !item ||
      !item.purchasable ||
      item.cost <= 0 ||
      item.slot !== 'main' ||
      item.availableAfter > 0
    )
      throw new Error(`Invalid starting purchase: ${entry.itemId}.`)
    if (!Number.isInteger(entry.quantity) || entry.quantity < 1 || seen.has(item.id))
      throw new Error('Starting quantities must be positive, grouped purchase counts.')
    seen.add(item.id)
    const charges = item.chargesPerPurchase * entry.quantity
    return {
      item,
      quantity: entry.quantity,
      charges,
      slots: item.stackLimit === null ? 1 : Math.ceil(charges / item.stackLimit),
      unitCost: item.cost,
      totalCost: item.cost * entry.quantity,
      reason: entry.reason,
    }
  })
  const totalCost = purchases.reduce((sum, entry) => sum + entry.totalCost, 0)
  const mainSlots = purchases.reduce((sum, entry) => sum + entry.slots, 0)
  if (totalCost > data.rules.startingGold)
    throw new Error('The reviewed starting purchase exceeds this patch’s starting gold budget.')
  if (mainSlots > data.rules.mainSlots)
    throw new Error('The starting purchase exceeds main inventory capacity.')
  return {
    purchases,
    totalCost,
    mainSlots,
    budget: data.rules.startingGold,
    remainingGold: data.rules.startingGold - totalCost,
    explanation: template.explanation,
    freeItems: [
      'The freely granted Town Portal Scroll uses its dedicated slot and is excluded from this purchase.',
    ],
  }
}
