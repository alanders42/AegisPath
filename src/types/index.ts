export const RANKS = [
  'Herald',
  'Guardian',
  'Crusader',
  'Archon',
  'Legend',
  'Ancient',
  'Divine',
  'Immortal',
] as const
export type Rank = (typeof RANKS)[number]
export const POSITIONS = [1, 2, 3, 4, 5] as const
export type Position = (typeof POSITIONS)[number]
export const POSITION_NAMES: Record<Position, string> = {
  1: 'Carry',
  2: 'Mid',
  3: 'Offlane',
  4: 'Soft Support',
  5: 'Hard Support',
}
export type Team = 'allies' | 'enemies'
export type Threat =
  | 'magic'
  | 'physical'
  | 'control'
  | 'invisibility'
  | 'healing'
  | 'mobility'
  | 'illusions'
  | 'silence'
export interface Hero {
  id: number
  name: string
  slug: string
  portrait: string
  attribute: string
  attackType: string
  roles: string[]
}
export interface HeroProfile {
  positions: Position[]
  strengths: string[]
  threats: Threat[]
  explanation: string
}
export interface Draft {
  rank: Rank | null
  position: Position | null
  allies: (number | null)[]
  enemies: (number | null)[]
}
export interface DatasetMetadata {
  source: string
  sourceUrl: string
  sourceCommit: string
  updatedAt: string
  patch: string
  limitations: string[]
  demonstration: boolean
}
export interface HeroRecommendation {
  heroId: number
  position: Position
  score: number
  explanation: string
  strengths: string[]
}
export interface Item {
  id: string
  name: string
  icon: string
}
export interface DemoFixtures {
  metadata: DatasetMetadata
  profiles: Record<string, HeroProfile>
  metaByPosition: Record<string, number[]>
  synergyByPosition: Record<string, number[]>
}
export interface GameDataset {
  heroes: Hero[]
  fixtures: DemoFixtures
  planner?: import('./planner').PlannerDataset
  plannerError?: string
}
export interface DataProvider {
  load(signal?: AbortSignal): Promise<GameDataset>
}
