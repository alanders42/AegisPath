import type { Draft, Hero, Item, Position, Rank } from './index'
export const STRATEGIES = ['auto', 'aggressive', 'defensive', 'sustain'] as const
export type StrategyChoice = (typeof STRATEGIES)[number]
export type LaneStrategy = Exclude<StrategyChoice, 'auto'>
export const STRATEGY_LABELS: Record<StrategyChoice, string> = {
  auto: 'Auto',
  aggressive: 'Aggressive',
  defensive: 'Defensive',
  sustain: 'Sustain / Farming',
}
export type Capability =
  | 'magical-burst'
  | 'physical-damage'
  | 'sustained-damage'
  | 'disables'
  | 'silences'
  | 'initiation'
  | 'mobility'
  | 'invisibility'
  | 'illusions'
  | 'summons'
  | 'healing'
  | 'evasion'
  | 'high-armor'
  | 'spell-resistance'
  | 'spell-protection'
  | 'single-target-pickoff'
  | 'area-damage'
export type Mechanic =
  | 'magic-damage'
  | 'attacks'
  | 'non-piercing-disable'
  | 'piercing-disable'
  | 'dispellable-silence'
  | 'invisibility'
  | 'evasion'
  | 'healing'
  | 'illusions'
  | 'gap-close'
  | 'unit-target'
  | 'spell-block'
  | 'summons'
  | 'armor'
  | 'magic-resistance'
export interface SourceReference {
  label: string
  url: string
  kind: 'game-data' | 'rules' | 'curated' | 'statistics'
}
export interface PatchRules {
  id: string
  checkedAt: string
  startingGold: number
  mainSlots: number
  backpackSlots: number
  talentLevels: number[]
  talentReturnLevels: number[]
  attributeLevels: number[]
  attributeValue: number
  sources: SourceReference[]
}
export interface GameItem extends Item {
  cost: number
  components: { itemId: string; quantity: number }[]
  recipeCost: number
  chargesPerPurchase: number
  stackLimit: number | null
  slot: 'main' | 'tp' | 'neutral'
  consumable: boolean
  purchasable: boolean
  availableAfter: number
  mechanics: string[]
}
export interface GameAbility {
  id: string
  heroId: number
  name: string
  icon: string
  kind: 'basic' | 'ultimate' | 'innate' | 'item-granted' | 'reference'
  maxLevel: number
  requiredLevels: number[]
  summary: string
  grantedBy?: string
}
export interface TalentDefinition {
  id: string
  heroId: number
  name: string
  tier: number
  side: number
}
export interface PurchaseSetEntry {
  itemId: string
  quantity: number
  reason: string
}
export type ProgressionStage = 'Laning phase' | 'Early game' | 'Midgame' | 'Late game'
export interface GuideStep {
  itemId: string
  stage: ProgressionStage
  reason: string
  importance: 'essential' | 'situational' | 'luxury'
  replaces?: string[]
}
export interface SkillVariant {
  opening: { level: number; abilityId: string; reason: string }[]
  first: string
  priority: string[]
  explanation: string
  talentSides: number[]
  talentReasons: string[]
}
export interface HeroGuide {
  talentRules?: { tier: number; side: number; mechanic: Mechanic; reason: string }[]
  id: string
  heroId: number
  positions: Position[]
  patch: string
  title: string
  preferredStrategy: LaneStrategy
  laneStrength: number
  advantages: string[]
  starting: Record<LaneStrategy, { purchases: PurchaseSetEntry[]; explanation: string }>
  steps: GuideStep[]
  finalItems: string[]
  skills: Record<LaneStrategy, SkillVariant>
  attributeLevels: number[]
  compatibleCounters: string[]
  counterReplacement: string
  source: SourceReference
  note: string
}
export interface EnemyThreat {
  heroId: number
  abilityId: string
  capability: Capability
  mechanic: Mechanic
  severity: number
  explanation: string
  lanePressure: number
}
export interface CounterRule {
  id: string
  itemId: string
  roles: Position[]
  mechanics: Mechanic[]
  minimumSeverity: number
  priority: number
  reason: string
  limitations: string
  replaces: string | null
  stage: ProgressionStage
  coreOnly?: boolean
  excludesMechanics?: Mechanic[]
}
export interface PlannerDataset {
  rules: PatchRules
  items: GameItem[]
  abilities: GameAbility[]
  talents: TalentDefinition[]
  threats: EnemyThreat[]
  guides: HeroGuide[]
  counterRules: CounterRule[]
  sources: SourceReference[]
}
export interface BuildContext {
  hero: Hero
  position: Position
  rank: Rank | null
  draft: Draft
  enemyPositions: (Position | null)[]
  strategy: StrategyChoice
  patch: string
  asOf: string
}
export interface LaneAssessment {
  strategy: LaneStrategy
  automatic: LaneStrategy
  overridden: boolean
  confidence: 'assigned' | 'partial' | 'estimated'
  opponentIds: number[]
  allyIds: number[]
  threats: EnemyThreat[]
  assessment: string
  explanation: string
  advantages: string[]
  actions: string[]
}
export interface StartingPurchase {
  item: GameItem
  quantity: number
  charges: number
  slots: number
  unitCost: number
  totalCost: number
  reason: string
}
export interface StartingInventory {
  purchases: StartingPurchase[]
  totalCost: number
  remainingGold: number
  budget: number
  mainSlots: number
  explanation: string
  freeItems: string[]
}
export interface PlannedPurchase extends GuideStep {
  item: GameItem
  order: number
  additionalCost: number
  uses: { itemId: string; quantity: number }[]
  componentsToBuy: { itemId: string; quantity: number }[]
  sells: string[]
  consumes: string[]
  inventoryAfter: string[]
  influencedBy: number[]
  abilityIds: string[]
}
export interface CounterDecision {
  ruleId: string
  item: GameItem
  score: number
  reason: string
  limitations: string
  influencedBy: number[]
  abilityIds: string[]
  stage: ProgressionStage
  replaces: string | null
  selected: boolean
  covered: boolean
}
export interface SkillSelection {
  abilityId: string | null
  name: string
  icon: string | null
  rank: number
  kind: 'ability' | 'attributes' | 'complete'
  skillPoints: number
  explanation: string
}
export interface TalentSelection {
  talent: TalentDefinition
  talentPoints: number
  reason: string
}
export interface SkillLevel {
  level: number
  selection: SkillSelection
  talent: TalentSelection | null
}
export interface SkillPlan {
  levels: SkillLevel[]
  innates: GameAbility[]
  itemGranted: GameAbility[]
  explanation: string
  firstReason: string
  influencedBy: number[]
}
export interface FinalInventoryItem {
  item: GameItem
  reason: string
  importance: GuideStep['importance']
  influencedBy: number[]
}
export interface BuildPlan {
  status: 'ready' | 'limited'
  heroId: number
  position: Position
  title: string
  patch: string
  confidence: 'Curated guide' | 'Limited data'
  warnings: string[]
  lane: LaneAssessment
  starting: StartingInventory | null
  progression: PlannedPurchase[]
  finalInventory: FinalInventoryItem[]
  alternatives: CounterDecision[]
  skills: SkillPlan | null
  sources: SourceReference[]
}
