# Data sources and artwork

The application loads its bundled hero roster, demonstration hero recommendations, and reviewed planner datasets through the replaceable `DataProvider.load()` interface. Browsing and drafting require no external API requests after the site loads.

## Hero identity snapshot

The 127-hero roster is from [OpenDota dotaconstants](https://github.com/odota/dotaconstants/tree/5c0242df9057848fa2036ca3fafe9f2bd4508163), commit `5c0242df9057848fa2036ca3fafe9f2bd4508163`, bundled on 2026-10-28. Every hero in that source is selectable; this is not a guarantee of future game completeness. Attributes and role labels are from the same snapshot and are not position-specific performance statistics.

`public/data/demo.json` contains only the remaining synthetic meta and synergy fixtures. Scores and rank-dependent hero ordering are examples, with no measured win-rate or live-meta claims. The previous generic item fixture engine has been removed.

## Reviewed match plans

See [planner coverage, rules, verification, and limitations](PLANNER.md) for the separate item/skill datasets, six reviewed heroes, patch 7.41f provenance, and maintenance process. Game data and curated recommendations remain distinct from statistical claims. No runtime API credentials or secrets are used.

## Artwork and licensing

Hero, item, and ability images are local copies from Valve's artwork host:

- `https://cdn.akamai.steamstatic.com/apps/dota2/images/dota_react/heroes/<slug>.png`
- `https://cdn.akamai.steamstatic.com/apps/dota2/images/dota_react/items/<item-id>.png`
- `https://cdn.akamai.steamstatic.com/apps/dota2/images/dota_react/abilities/<ability-id>.png`

Dota 2, hero identities, and artwork belong to Valve Corporation. Repository licensing does not grant ownership of Valve artwork. AegisPath is independent and is not affiliated with or endorsed by Valve. OpenDota constants use their upstream MIT licence, included in `public/data/LICENSE.opendota.txt`.

`node scripts/import-hero-snapshot.mjs` restores missing hero portraits and the pinned identity snapshot. It does not update planner data, recommendations, source review dates, or statistics. The planner uses hero portraits where four new innate icons are unavailable; it does not invent replacement ability artwork.
