import { expect, test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
async function configure(page: Page) {
  await page.goto('/')
  await page.getByLabel('Rank bracket').selectOption('Archon')
  await page.getByRole('button', { name: '3 Offlane', exact: true }).click()
}
async function pick(page: Page, slot: string, name: string) {
  await page.getByRole('button', { name: slot, exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('searchbox').fill(name)
  await dialog.getByRole('button', { name, exact: true }).click()
  await expect(dialog).not.toBeVisible()
}
test('complete draft flow, position swap, duplicates, removal, and reset', async ({ page }) => {
  await configure(page)
  await expect(page.locator('.meta-card')).toHaveCount(5)
  await pick(page, 'Select hero for allied position 3', 'Axe')
  await expect(page.getByRole('button', { name: 'Change Axe for allied position 3' })).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Starting items', exact: false }).first(),
  ).toBeVisible()
  await pick(page, 'Select hero for allied position 1', 'Juggernaut')
  await page.getByRole('button', { name: '1 Carry', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Change Axe for allied position 1' })).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Change Juggernaut for allied position 3' }),
  ).toBeVisible()
  await page.getByRole('button', { name: '3 Offlane', exact: true }).click()
  await page.getByRole('button', { name: 'Select hero for enemy slot 1', exact: true }).click()
  await page.getByRole('searchbox').fill('Axe')
  await expect(page.getByRole('button', { name: /^Axe.*Drafted$/ })).toBeDisabled()
  await page.keyboard.press('Escape')
  await pick(page, 'Select hero for enemy slot 1', 'Crystal Maiden')
  await expect(page.getByText('Against Crystal Maiden', { exact: true }).first()).toBeVisible()
  await page.getByRole('button', { name: 'Remove Crystal Maiden from enemy slot 1' }).click()
  await page.getByRole('button', { name: 'Reset draft', exact: true }).click()
  await expect(page.getByLabel('Rank bracket')).toHaveValue('Archon')
  await expect(page.getByRole('button', { name: '3 Offlane', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(page.locator('.draft-footnote')).toContainText('0 of 10 heroes selected')
})
test('keyboard selection, focus trap, escape, and focus restoration', async ({ page }) => {
  await configure(page)
  const trigger = page.getByRole('button', {
    name: 'Select hero for allied position 3',
    exact: true,
  })
  await trigger.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('searchbox')).toBeFocused()
  await page.getByRole('searchbox').fill('Axe')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: 'Close hero selector' }).focus()
  await page.keyboard.press('Shift+Tab')
  expect(
    await page.getByRole('dialog').evaluate((element) => element.contains(document.activeElement)),
  ).toBe(true)
  await page.keyboard.press('Escape')
  await expect(trigger).toBeFocused()
  await trigger.press('Enter')
  await page.getByRole('searchbox').fill('Axe')
  await page.getByRole('button', { name: 'Axe', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: 'Change Axe for allied position 3' })).toBeVisible()
})
test('no horizontal overflow, missing images, or browser errors in a populated draft', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await configure(page)
  await pick(page, 'Select hero for allied position 3', 'Axe')
  await pick(page, 'Select hero for enemy slot 1', 'Crystal Maiden')
  await page.getByRole('heading', { name: 'Build for the game' }).scrollIntoViewIfNeeded()
  await page.waitForFunction(() =>
    [...document.images]
      .filter(
        (img) =>
          img.getBoundingClientRect().top < innerHeight && img.getBoundingClientRect().bottom > 0,
      )
      .every((img) => img.complete),
  )
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(
    await page.locator('img').evaluateAll((imgs) =>
      imgs
        .filter((img): img is HTMLImageElement => img instanceof HTMLImageElement)
        .filter((img) => img.complete && img.naturalWidth === 0)
        .map((img) => img.src),
    ),
  ).toEqual([])
  expect(errors).toEqual([])
  await page.screenshot({
    path: `test-results/draft-${test.info().project.name}.png`,
    fullPage: true,
  })
})
test('accessible initial, populated, and hero selector states', async ({ page }) => {
  await configure(page)
  expect(
    (await new AxeBuilder({ page }).analyze()).violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
    })),
  ).toEqual([])
  await pick(page, 'Select hero for allied position 3', 'Axe')
  expect(
    (await new AxeBuilder({ page }).analyze()).violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
    })),
  ).toEqual([])
  await page.getByRole('button', { name: 'Select hero for enemy slot 1', exact: true }).click()
  expect(
    (await new AxeBuilder({ page }).analyze()).violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
    })),
  ).toEqual([])
})
test('dataset errors can be retried and empty search explains the result', async ({ page }) => {
  await page.route('**/data/demo.json', (route) =>
    route.fulfill({ status: 503, body: 'unavailable' }),
  )
  await page.goto('/')
  await expect(page.getByRole('alert')).toContainText('couldn’t load')
  await page.unroute('**/data/demo.json')
  await page.getByRole('button', { name: 'Retry loading' }).click()
  await expect(page.getByLabel('Rank bracket')).toBeVisible()
  await page.getByRole('button', { name: 'Select hero for enemy slot 1', exact: true }).click()
  await page.getByRole('searchbox').fill('no-such-hero')
  await expect(page.getByRole('heading', { name: 'No heroes found' })).toBeVisible()
  await page.getByRole('button', { name: 'Clear search' }).click()
  await expect(page.getByText(/127 heroes/)).toBeVisible()
})

test('recommendation cards pick heroes and smaller screens stay within the viewport', async ({
  page,
}) => {
  await configure(page)
  await page.locator('.meta-card').filter({ hasText: 'Axe' }).click()
  await expect(page.getByRole('button', { name: 'Change Axe for allied position 3' })).toBeVisible()
  await page.locator('.synergy-group').first().getByRole('button').first().click()
  await expect(page.locator('.draft-footnote')).toContainText('2 of 10 heroes selected')
  await expect(page.locator('.synergy-group')).toHaveCount(3)
  for (const width of [320, 768, 1024]) {
    await page.setViewportSize({ width, height: 900 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
})
