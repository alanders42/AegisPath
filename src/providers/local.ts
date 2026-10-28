import type { DataProvider, GameDataset } from '@/types'
import type { PlannerDataset } from '@/types/planner'
export const localDataProvider: DataProvider = {
  async load(signal) {
    const [heroes, fixtures] = await Promise.all([
      fetch(`${import.meta.env.BASE_URL}data/heroes.json`, { signal }),
      fetch(`${import.meta.env.BASE_URL}data/demo.json`, { signal }),
    ])
    if (!heroes.ok || !fixtures.ok)
      throw new Error('The local dataset could not be loaded. Please retry.')
    const dataset = { heroes: await heroes.json(), fixtures: await fixtures.json() } as GameDataset
    if (
      !Array.isArray(dataset.heroes) ||
      !dataset.heroes.length ||
      !dataset.fixtures.metadata?.demonstration
    )
      throw new Error('The local dataset is incomplete. Please retry.')
    try {
      const [game, guides] = await Promise.all([
        fetch(`${import.meta.env.BASE_URL}data/planner-game.json`, { signal }),
        fetch(`${import.meta.env.BASE_URL}data/planner-guides.json`, { signal }),
      ])
      if (!game.ok || !guides.ok) throw new Error('Build planner data could not be loaded.')
      const planner = { ...(await game.json()), ...(await guides.json()) } as PlannerDataset
      if (
        !planner.rules?.id ||
        !Number.isInteger(planner.rules.startingGold) ||
        planner.rules.startingGold <= 0 ||
        !Array.isArray(planner.rules.talentLevels) ||
        !Array.isArray(planner.rules.talentReturnLevels) ||
        !Array.isArray(planner.rules.attributeLevels) ||
        ![
          planner.guides,
          planner.items,
          planner.abilities,
          planner.talents,
          planner.threats,
          planner.counterRules,
          planner.sources,
        ].every(Array.isArray)
      )
        throw new Error('Build planner data is incomplete.')
      dataset.planner = planner
    } catch (error) {
      dataset.plannerError =
        error instanceof Error ? error.message : 'Build planner data is unavailable.'
    }
    return dataset
  },
}
