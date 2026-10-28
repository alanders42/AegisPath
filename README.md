# AegisPath

An open-source Dota 2 draft assistant providing meta-based hero recommendations, team synergy analysis, counter-picks, and adaptive item builds.

## Draft and match planner

Vue 3, strict TypeScript, Vite, Tailwind, shadcn-vue-style Reka primitives, Pinia, and Lucide power a responsive dark workspace. Browse the local 127-hero roster, edit ten draft slots, assign optional enemy positions, and open a unified item and skill plan below the board.

Phase two includes reviewed guides for **Juggernaut (1), Lina (2), Axe (3), Rubick (4/5), Crystal Maiden (4/5), and Meepo (2)**. It provides lane analysis and overrides, budgeted starting purchases, ordered item progression, counter branches, a reachable final six-slot target, and legal level 1–30 skill/talent progression. Other hero/position combinations show a limited-data state. Meta and synergy hero cards remain labelled demonstrations.

### Run locally

Requires Node.js 22.13 or newer and npm. Prefer a supported Node LTS release.

```sh
npm ci
npm run dev
```

Choose a position and hero. Add only the draft information you know; enemy slot order never implies lane position. Assign positions explicitly to refine lane analysis. Use the right-side strategy selector for Auto, Aggressive, Defensive, or Sustain/Farming. The full planner's tabs show items and skills from the same match context.

Heroes cannot be duplicated. Changing your position swaps your hero with an occupied teammate. With no player hero picked, selecting a position adopts any existing hero in that slot. Reset clears picks, enemy position assignments, and the strategy override, preserving rank and player position. Changing the player's hero or position also returns strategy to Auto. State stays in memory; refresh starts a new draft.

The repository's `.npmrc` disables executable symlinks for WSL-mounted Windows drives that reject them with `EPERM`. Project scripts invoke installed Node entrypoints directly, without `node_modules/.bin` wrappers. Use these npm scripts for bundled tools rather than invoking their names through `npx`. No administrator privileges or global npm changes are required.

### Validate

```sh
npm run check          # lint, unit tests, strict type checking, production build
npm run format:check
npm run browsers:install
npm run test:e2e       # desktop/mobile flows, keyboard and accessibility checks
npm run data:verify    # optional live, read-only Valve snapshot/recipe verification
npm run preview       # serve dist locally after building
```

On a fresh Linux host, Playwright may require `npm run browsers:install -- --with-deps`. Browser traces and screenshots are saved under ignored `test-results/`.

### Architecture and data

- `src/stores/draft.ts` owns draft settings, guarded pick/position mutations, strategy overrides, and a computed unified build plan. The player hero is derived from the allied slot.
- `src/engines` contains pure strategy, starting-inventory, counter, item-path, and skill modules behind `createBuildPlan`. No Vue component contains recommendation calculations.
- `src/components/planner` contains the compact summary, shared grouped starting purchase, and full-width Item Build / Skill Build tabs. The original draft components and demo hero selectors are reused.
- `src/types` and `src/providers` define the typed dataset boundary. Local JSON keeps verified game definitions separate from curated guides and synthetic hero recommendations.
- `public/data` and `public/images` contain versioned datasets and local artwork. Tests cover guide legality, recipes, budget/slot constraints, reactivity, draft regressions, missing data, and browser interactions.

Read [planner architecture, coverage, source verification, and limitations](docs/PLANNER.md) and [data/artwork attribution](docs/DATA.md). Guide confidence is curated, not a measured win probability. The bundled game snapshot targets **7.41f**, checked **2026-10-28**; future patch validation requires a fresh source review. Stale snapshots are flagged, and invalid guides fail closed. `data:verify` detects source changes without rewriting data or review dates.

### Static hosting and remaining work

`npm run build` creates `dist/`. Publish that directory to GitHub Pages or another static host. Relative assets and dataset URLs support repository subpaths such as `/AegisPath/`; no route rewrites or backend are required. Deployment is not enabled automatically.

Remaining work includes more reviewed hero/position guides and enemy mechanics, measured meta/synergy models, rank-aware evidence, reliable item timings, match-level aggregation, and scheduled source reviews. OpenDota popularity counts are not treated as ordered builds, and no live statistical claims are made. See the [phase-one brief](docs/prompts/phase1.txt) and [phase-two brief](docs/prompts/phase2.txt).
