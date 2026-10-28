// Optional manual identity/artwork import. Does not fetch statistics or recommendation data.
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
const root = new URL('../', import.meta.url)
const demo = JSON.parse(await readFile(new URL('public/data/demo.json', root), 'utf8'))
const commit = demo.metadata.sourceCommit
if (!/^[a-f0-9]{40}$/.test(commit)) throw new Error('Expected a pinned constants commit')
const response = await fetch(
  `https://raw.githubusercontent.com/odota/dotaconstants/${commit}/build/heroes.json`,
)
if (!response.ok) throw new Error(`Constants download failed: ${response.status}`)
const source = await response.json()
const heroes = Object.values(source)
  .map((hero) => {
    if (
      !Number.isInteger(hero.id) ||
      !hero.localized_name ||
      !/^npc_dota_hero_[a-z0-9_]+$/.test(hero.name)
    )
      throw new Error('Unexpected hero record')
    const slug = hero.name.replace('npc_dota_hero_', '')
    return {
      id: hero.id,
      name: hero.localized_name,
      slug,
      portrait: `images/heroes/${slug}.png`,
      attribute: hero.primary_attr,
      attackType: hero.attack_type,
      roles: hero.roles,
    }
  })
  .sort((a, b) => a.name.localeCompare(b.name, 'en'))
const assets = [
  ...heroes.map((hero) => ({ source: `heroes/${hero.slug}`, destination: hero.portrait })),
  ...JSON.parse(await readFile(new URL('public/data/planner-game.json', root), 'utf8')).items.map(
    (item) => ({ source: `items/${item.id}`, destination: item.icon }),
  ),
]
for (const directory of ['public/images/heroes/', 'public/images/items/'])
  await mkdir(new URL(directory, root), { recursive: true })
// Sequential requests avoid flooding the artwork host. Rerunning reuses bundled files.
for (const asset of assets) {
  const destination = new URL(`public/${asset.destination}`, root)
  try {
    await readFile(destination)
    continue
  } catch {
    /* download missing assets */
  }
  const image = await fetch(
    `https://cdn.akamai.steamstatic.com/apps/dota2/images/dota_react/${asset.source}.png`,
  )
  if (!image.ok) throw new Error(`Image download failed: ${asset.source} (${image.status})`)
  const bytes = Buffer.from(await image.arrayBuffer())
  if (!bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
    throw new Error(`Expected PNG: ${asset.source}`)
  await writeFile(destination, bytes)
}
await writeFile(new URL('public/data/heroes.json', root), `${JSON.stringify(heroes, null, 2)}\n`)
console.log(
  `Imported ${heroes.length} hero identities from ${commit} into ${fileURLToPath(root)}. Demo recommendations unchanged.`,
)
