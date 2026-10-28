// Read-only verification. A successful check never updates the guide's review timestamp.
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
const root = new URL('../public/data/', import.meta.url)
const game = JSON.parse(await readFile(new URL('planner-game.json', root), 'utf8'))
const evidence = JSON.parse(await readFile(new URL('planner-sources.json', root), 'utf8'))
const canonical = (value) =>
  Array.isArray(value)
    ? value.map(canonical)
    : value && typeof value === 'object'
      ? Object.fromEntries(
          Object.keys(value)
            .sort()
            .map((key) => [key, canonical(value[key])]),
        )
      : value
const hash = (value) =>
  createHash('sha256')
    .update(JSON.stringify(canonical(value)))
    .digest('hex')
async function get(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) })
  if (!response.ok) throw new Error(`${response.status}: ${url}`)
  return response.json()
}
const latest = (await get('https://www.dota2.com/datafeed/patchnoteslist')).patches.at(
  -1,
)?.patch_number
if (latest !== evidence.patch || latest !== game.rules.id)
  throw new Error(
    `Patch changed: live ${latest}, snapshot ${game.rules.id}. Review rules and guides before updating.`,
  )
const liveItems = (await get('https://www.dota2.com/datafeed/itemlist?language=english')).result
  .data.itemabilities
const byId = new Map(liveItems.map((item) => [item.id, item.name.replace('item_', '')]))
const componentKey = (entries) =>
  JSON.stringify([...entries].sort(([a], [b]) => a.localeCompare(b)))
for (const item of game.items.filter((item) => item.components.length)) {
  const expected = componentKey(
    item.components.map((component) => [component.itemId, component.quantity]),
  )
  const recipe = liveItems.find((entry) => entry.name === `item_recipe_${item.id}`)
  const matches = recipe?.recipes.some((option) => {
    const counts = new Map()
    for (const id of option.items)
      if (byId.has(id)) counts.set(byId.get(id), (counts.get(byId.get(id)) ?? 0) + 1)
    return componentKey(counts) === expected
  })
  if (!matches)
    throw new Error(`Recipe changed: ${item.id}. Review component reuse and upgrade paths.`)
}
const jobs = Object.entries(evidence.itemDefinitions).map(([id, entry]) => async () => {
  const item = (
    await get(`https://www.dota2.com/datafeed/itemdata?item_id=${entry.id}&language=english`)
  ).result.data.items[0]
  if (
    !item ||
    hash(item) !== entry.sha256 ||
    item.item_cost !== game.items.find((item) => item.id === id)?.cost
  )
    throw new Error(`Item definition changed: ${id}. Review prices, recipes and mechanics.`)
})
for (const [id, entry] of Object.entries(evidence.heroDefinitions))
  jobs.push(async () => {
    const hero = (
      await get(`https://www.dota2.com/datafeed/herodata?hero_id=${id}&language=english`)
    ).result.data.heroes[0]
    if (
      !hero ||
      hash({ abilities: hero.abilities, talents: hero.talents, facets: hero.facets }) !==
        entry.sha256
    )
      throw new Error(
        `Hero definition changed: ${id}. Review effective leveling rules, abilities and talents.`,
      )
  })
let next = 0
const errors = []
await Promise.all(
  Array.from({ length: 4 }, async () => {
    while (next < jobs.length) {
      const job = jobs[next++]
      try {
        await job()
      } catch (error) {
        errors.push(error.message)
      }
    }
  }),
)
if (errors.length) {
  for (const error of errors) console.error(error)
  process.exitCode = 1
} else
  console.log(
    `Verified patch ${latest}, ${Object.keys(evidence.itemDefinitions).length} item definitions, recipe paths and ${Object.keys(evidence.heroDefinitions).length} hero kits. Curated guide quality still requires review; no files changed.`,
  )
