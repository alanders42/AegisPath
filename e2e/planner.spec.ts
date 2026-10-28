import { expect, test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
async function selectHero(page: Page, slot: string, name: string) {
  await page.getByRole('button', { name: slot, exact: true }).click()
  await page.getByRole('searchbox').fill(name)
  await page.getByRole('dialog').getByRole('button', { name, exact: true }).click()
}
async function prepare(page: Page, position = '1 Carry', hero = 'Juggernaut', index = 1) {
  await page.goto('/')
  await page.getByLabel('Rank bracket').selectOption('Archon')
  await page.getByRole('button', { name: position, exact: true }).click()
  await selectHero(page, `Select hero for allied position ${index}`, hero)
}
test('lane assignments, strategy overrides, starting costs, and separate skill/talent points', async ({
  page,
}) => {
  await prepare(page)
  await expect(page.locator('.strategy-summary')).toContainText('Estimated lane')
  await selectHero(page, 'Select hero for enemy slot 1', 'Lina')
  await selectHero(page, 'Select hero for enemy slot 2', 'Meepo')
  await expect(page.locator('.strategy-summary')).toContainText('Estimated lane')
  await page.getByLabel('Enemy 1 position', { exact: true }).selectOption('3')
  await page.getByLabel('Enemy 2 position', { exact: true }).selectOption('4')
  await expect(page.locator('.strategy-summary')).toContainText('Defensive')
  await expect(page.locator('.lane-opponents')).toHaveText('Assigned lane opponents: Lina, Meepo')
  const planner = page.locator('#build-planner')
  await expect(planner.locator('.purchase-budget')).toContainText('/ 600g')
  await expect(planner.locator('.starting-set')).toContainText('Healing Salve')
  await page.getByLabel('Laning strategy', { exact: true }).selectOption('aggressive')
  await expect(planner.locator('.starting-set')).toContainText('Orb of Venom')
  await expect(
    page.getByRole('button', { name: 'Change Juggernaut for allied position 1' }),
  ).toBeVisible()
  await expect(planner.locator('.final-six > details')).toHaveCount(6)
  await planner.getByRole('tab', { name: 'Skill Build', exact: true }).click()
  await expect(planner.locator('.skill-level')).toHaveCount(30)
  const ten = planner.getByRole('article', { name: 'Level 10', exact: true })
  await expect(ten).toContainText('1 skill point')
  await expect(ten).toContainText('1 TALENT POINT')
  await expect(
    planner.getByRole('heading', { name: 'Innate · acquired automatically' }),
  ).toBeVisible()
})
test('Meepo uses four hero-specific ultimate upgrades and unsupported heroes remain honest', async ({
  page,
}) => {
  await prepare(page, '2 Mid', 'Meepo', 2)
  const planner = page.locator('#build-planner')
  await planner.getByRole('tab', { name: 'Skill Build', exact: true }).click()
  await expect(planner.locator('.skill-level').filter({ hasText: 'Divided We Stand' })).toHaveCount(
    4,
  )
  for (const level of [3, 10, 17, 24])
    await expect(
      planner.getByRole('article', { name: `Level ${level}`, exact: true }),
    ).toContainText('Divided We Stand')
  await selectHero(page, 'Change Meepo for allied position 2', 'Invoker')
  await expect(planner).toContainText('No reviewed build for this hero and position')
  await expect(planner.locator('.skill-level')).toHaveCount(0)
  await expect(planner.locator('.final-six > details')).toHaveCount(0)
})
test('support item path, specific counters, accessible tabs and responsive planner', async ({
  page,
}) => {
  await prepare(page, '5 Hard Support', 'Crystal Maiden', 5)
  await selectHero(page, 'Select hero for enemy slot 1', 'Lina')
  const planner = page.locator('#build-planner')
  await expect(page.locator('.overview-counter')).toContainText('Glimmer Cape')
  await expect(planner.locator('.counter-branches')).toContainText('Lina')
  await expect(planner.locator('.final-six > details')).toHaveCount(6)
  let violations = (await new AxeBuilder({ page }).analyze()).violations
  expect(violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }))).toEqual([])
  await planner.getByRole('tab', { name: 'Skill Build', exact: true }).click()
  violations = (await new AxeBuilder({ page }).analyze()).violations
  expect(violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }))).toEqual([])
  for (const width of [320, 768, 1024, 1280]) {
    await page.setViewportSize({ width, height: 900 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await page.getByRole('button', { name: 'Remove Lina from enemy slot 1' }).click()
  await expect(page.locator('.overview-counter')).toHaveCount(0)
  await planner.getByRole('tab', { name: 'Item Build', exact: true }).click()
  await expect(planner.locator('.counter-branches')).toContainText('No reviewed item substitutions')
  await page.screenshot({
    path: `test-results/planner-${test.info().project.name}.png`,
    fullPage: true,
  })
})
test('unavailable planner data preserves the draft and offers a working reload', async ({
  page,
}) => {
  await page.route('**/data/planner-game.json', (route) =>
    route.fulfill({ status: 503, body: 'unavailable' }),
  )
  await prepare(page, '3 Offlane', 'Axe', 3)
  await expect(page.locator('#build-planner')).toContainText('planner dataset is unavailable')
  await expect(page.getByRole('button', { name: 'Change Axe for allied position 3' })).toBeVisible()
  await page.unroute('**/data/planner-game.json')
  await page.getByRole('button', { name: 'Reload planner data' }).click()
  await expect(page.locator('#build-planner .final-six > details')).toHaveCount(6)
})

test('stale snapshot is visible without opening source details', async ({ page }) => {
  await page.route('**/data/planner-game.json', async (route) => {
    const response = await route.fetch()
    const data = await response.json()
    data.rules.checkedAt = '2000-01-01'
    await route.fulfill({ response, json: data })
  })
  await prepare(page, '3 Offlane', 'Axe', 3)
  await expect(page.locator('.planner-stale')).toBeVisible()
  await expect(page.locator('.planner-stale')).toContainText('Stale snapshot')
  await expect(page.locator('#build-planner .final-six > details')).toHaveCount(6)
})
