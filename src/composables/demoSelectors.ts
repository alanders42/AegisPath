// Phase-one presentation selectors over curated fixtures, not production recommendation engines.
import type { Draft, GameDataset, HeroRecommendation, Position } from '@/types'
import { POSITIONS, RANKS } from '@/types'
export function selectedIds(draft: Draft): Set<number> {
  return new Set([...draft.allies, ...draft.enemies].filter((id): id is number => id !== null))
}
export function metaPreview(data: GameDataset, draft: Draft): HeroRecommendation[] {
  if (!draft.rank || !draft.position) return []
  const position = draft.position
  const pool = data.fixtures.metaByPosition[position] ?? []
  // Synthetic rank offsets exercise the UI. They are never presented as measured rank statistics.
  const available = pool.filter((id) => !selectedIds(draft).has(id))
  const offset = available.length ? (RANKS.indexOf(draft.rank) % 3) % available.length : 0
  const ordered = [...available.slice(offset), ...available.slice(0, offset)]
  return ordered.slice(0, 5).map((heroId, index) => ({
    heroId,
    position,
    score: 94 - index * 3,
    explanation: data.fixtures.profiles[heroId]?.explanation ?? 'Curated role example.',
    strengths: data.fixtures.profiles[heroId]?.strengths ?? [],
  }))
}
export function synergyPreview(
  data: GameDataset,
  draft: Draft,
): { position: Position; recommendations: HeroRecommendation[] }[] {
  if (!draft.position || !draft.allies[draft.position - 1]) return []
  const selected = selectedIds(draft)
  const allies = draft.allies.filter((id): id is number => id !== null)
  const strengths = new Set(allies.flatMap((id) => data.fixtures.profiles[id]?.strengths ?? []))
  const enemies = draft.enemies.filter((id): id is number => id !== null)
  const threats = enemies.flatMap((id) => data.fixtures.profiles[id]?.threats ?? [])
  return POSITIONS.filter((position) => draft.allies[position - 1] === null).map((position) => {
    const pool = (data.fixtures.synergyByPosition[position] ?? []).filter((id) => !selected.has(id))
    // Pick a fixture matching one missing team quality. No win-probability model is implied.
    const desired = threats.includes('physical')
      ? 'Protection'
      : strengths.has('Initiation')
        ? 'Spell damage'
        : 'Initiation'
    const preferred = pool.find((id) => data.fixtures.profiles[id]?.strengths.includes(desired))
    const ordered = preferred ? [preferred, ...pool.filter((id) => id !== preferred)] : pool
    return {
      position,
      recommendations: ordered.slice(0, 3).map((heroId, index) => {
        const profile = data.fixtures.profiles[heroId]
        const adds = profile?.strengths.filter((strength) => !strengths.has(strength)) ?? []
        return {
          heroId,
          position,
          score: 91 - index * 4,
          explanation: `${profile?.explanation ?? 'Curated role example.'}${adds.length ? ` Adds ${adds.join(' and ').toLowerCase()} to your selected team.` : ' Offers another example of the team’s existing strengths.'}`,
          strengths: profile?.strengths ?? [],
        }
      }),
    }
  })
}
