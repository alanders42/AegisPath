# Phase 2: matchup-adaptive match planner

The original draft board, hero picker, rank controls, and hero recommendation sections remain in place. The former generic item preview has been replaced with a unified planner. The right panel is a quick reference; the full-width section below the workspace contains Item Build and Skill Build tabs.

## Reviewed coverage

| Hero           | Positions | Guide focus                                                   |
| -------------- | --------- | ------------------------------------------------------------- |
| Juggernaut     | 1         | Farming carry, early lane sustain, physical scaling           |
| Lina           | 2         | Spell-oriented mid; not an interchangeable attack-build guide |
| Axe            | 3         | Frontline initiation and durability                           |
| Rubick         | 4, 5      | Affordable control, positioning, and team utility             |
| Crystal Maiden | 4, 5      | Lane control, mana utility, and team protection               |
| Meepo          | 2         | Clone farming, control, and hero-specific ultimate leveling   |

All 127 bundled heroes remain selectable. Other hero/position combinations display limited coverage, with no invented six-slot or skill builds. These are curated guides, not claims about optimal statistical performance.

## Data and patch rules

Snapshot reviewed on **2026-10-28**, patch **7.41f**, identified from [Valve's patch list](https://www.dota2.com/datafeed/patchnoteslist). The app consumes local files and does not call Valve or OpenDota while drafting.

- `planner-game.json` holds 100 priced item/component definitions, recipes, shop availability, stacking/charge metadata, abilities, talents, reviewed enemy threats, patch rules, and sources.
- `planner-guides.json` holds six extensible hero guides, supported positions, strategy-specific starting sets, ordered item paths, explicit early skill openings, later skill priorities, talent choices, ability-specific talent conditions, and counter rules.
- `planner-sources.json` records the source commits and hashes of the live item and hero definitions used during verification. It is maintenance evidence, not a runtime dependency.

Item costs and initial charges were cross-checked against Valve's `itemdata` endpoint for every included item. Recipe component relationships come from the pinned [OpenDota constants snapshot](https://github.com/odota/dotaconstants/tree/5c0242df9057848fa2036ca3fafe9f2bd4508163). Shop/stacking flags and attribute rules were inspected in the [Valve game-script snapshot](https://github.com/SteamDatabase/GameTracking-Dota2/tree/23bc9a26a701a29fe357025d4ca27fc3697ac5eb/game/dota/pak01_dir/scripts/npc). Recipe arithmetic is checked before a purchase plan is accepted.

The standard starting budget is a versioned rule, **600 gold**, sourced to [Valve's 7.09 change](https://www.dota2.com/patches/7.09); it is not embedded in the starting-item engine. Special game modes and starting-gold modifiers are outside this slice. Freely granted TP scrolls are not purchases and use their dedicated slot. Free Observer Ward coordination is mentioned separately rather than assuming team stock is guaranteed.

[Valve 7.40](https://www.dota2.com/patches/7.40) establishes separate talent points and the eight talent unlock levels. The planner can select a skill and a talent on the same level, fills the normal seven attribute bonuses, and selects the remaining side of each talent row at 27–30. [Valve 7.41](https://www.dota2.com/patches/7.41) removes facets and changes innate handling. No facet selections enter the normalized models or UI.

Meepo demonstrates why API summary fields cannot always be used alone: `max_level` in the hero response is 3, but the effective `max_level` special value is 4, with a required level of 3 and an interval of 7. The snapshot uses **3/10/17/24**, consistent with the explicit values and 7.41 notes. Other reviewed ultimates use 6/12/18. Innates and item-granted abilities are listed separately from point allocation. Four new innate images are unavailable at the artwork host; their hero portraits provide an explicit image fallback.

Shop unlock timestamps come from item stock rules, not predicted farming timings. For example, the snapshot's Shard stock delay is represented from the source value; the UI distinguishes it from an estimated purchase minute.

## Engines and behavior

`createBuildPlan(context, dataset)` is the only planner boundary used by Pinia. Its pure TypeScript modules handle lane strategy, starting purchases, counter decisions, item progression, and legal skills. Identical context and data produce identical output, and inputs are not mutated. Rank is accepted as context but does not change curated guides without supporting evidence.

Enemy slot order does **not** imply position. The optional position selectors enforce unique assignments. Positions 1/5 evaluate assigned enemy 3/4; positions 3/4 evaluate assigned enemy 1/5; mid evaluates assigned enemy 2. Partial assignments and unknown threat coverage remain visible. Allied lane partners contribute only in the paired lane slot. The complete enemy team informs later item decisions independently of lane assignments.

Auto uses a small, disclosed curated pressure model, not a win-probability estimate. Manual strategy selection controls starting purchases and early skill priorities. Draft changes preserve the override; changing the player's hero or position returns to Auto. Reset clears picks, assignments, and the override while retaining rank and player position.

Starting purchases group quantities, charge counts, individual costs, total cost, remaining gold, and main-slot usage. Some strategic variants deliberately retain the same purchase when substitutions are not justified. Opening skills retain essential utility by level 4 instead of blindly maximizing one ability and leaving control or sustain unlearned.

The primary item progression reuses owned components, shows new component purchases and incremental completion cost, and explains retiring early items. Its final target contains exactly six distinct permanent main-slot items that the progression actually acquires. A component and its upgrade cannot both occupy final slots. TP, neutrals, consumables, and consumed Shards are excluded. Listed inventories represent completed main items; courier/stash delivery and every intermediate backpack arrangement are not simulated. Selling early items makes room but is not treated as a full-match gold forecast.

Counter rules require reviewed enemy abilities, appropriate mechanics, role eligibility, hero-guide compatibility, and severity. An existing solution can be prioritized rather than duplicated. One additional permanent counter branch is selected at a time, with at most three conditional alternatives; detection remains a recurring consumable. Alternatives replace an item in the primary path rather than creating a seventh final slot.

Examples include support Glimmer against Lina's spell damage, Dust against Riki's actual invisibility, core accuracy against Phantom Assassin's evasion, existing cleave against Phantom Lancer's illusions, and health-restoration reduction against reviewed sustain. BKB is not offered as an answer to Axe's piercing taunt; a basic dispel is not presented as removing Riki's ground smoke. Ghost is excluded into reviewed severe magic damage. Meepo can choose Earthbind True Strike against evasion and then take the other talent at its later unlock.

Support guides prioritize low-cost saves; Scepter, cooldown items, and an eventual six-slot target are explicitly luxury goals. Teammate vision and detection responsibilities take priority over completing that hypothetical final inventory.

## Maintenance and limitations

Run `npm run data:verify` to compare the bundled patch and source hashes with Valve's live definitions. This command is read-only and does not silently refresh dates, prices, or guides. Any drift requires checking the relevant rules and recommendations, updating the normalized snapshot and provenance, and running the regression suite before changing `checkedAt`. A snapshot older than 30 days is visibly flagged. No scheduled refresh or claim of continuing live patch validation is made.

Reviewed threats cover 15 enemy heroes and selected abilities, not every spell those heroes can acquire. All capability categories are represented in the model, but unreviewed summons, immunity interactions, spell theft, item timings, and matchup combinations are not fabricated. A current source hash verifies source consistency, not strategic optimality. The API's generic hero descriptions can contain unresolved display-value placeholders; normalized summaries remove these placeholders and avoid asserting missing numerical values.

The [OpenDota API reference](https://opendota.apidocumentation.com/) and [route implementation](https://github.com/odota/core/blob/master/svc/api/spec.ts) document `heroes/{id}/itemPopularity` buckets. The [match response schema](https://github.com/odota/core/blob/master/svc/api/responses/MatchResponse.ts) includes purchase logs and ability-upgrade arrays, subject to match availability and parsing. Popularity buckets are unordered counts, not complete matchup-specific shopping lists. Live OpenDota requests returned HTTP 403 from this environment, so no statistical evidence or item-minute forecasts were bundled. Rank × position × patch statistics and match-level skill-history aggregation remain future work. Meta and synergy hero cards remain explicitly labelled demonstrations.

Planner dataset failures preserve drafting and expose a retry action. Missing guides, invalid recipes/skills, and patch mismatches fail closed instead of displaying an invented build. Additional guides are added to JSON without changing UI or engine code, provided the necessary reviewed mechanics are also supplied.
