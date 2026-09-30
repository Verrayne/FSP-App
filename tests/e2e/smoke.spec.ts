import { expect, test } from '@playwright/test'

test('primary public navigation and account actions are usable', async ({ page }) => {
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: /Making B-BBEE compliance simpler/i }),
  ).toBeVisible()

  await expect(page.getByRole('link', { name: 'Get Started' })).toHaveAttribute(
    'href',
    '/auth/register',
  )
  await page
    .getByRole('navigation', { name: 'Primary' })
    .getByRole('link', { name: 'About' })
    .click()
  await expect(
    page.getByRole('heading', { name: /clearer way to manage FSP compliance/i }),
  ).toBeVisible()

  await page.goto('/how-it-works')
  await expect(
    page.getByRole('heading', { name: /controlled process from registration/i }),
  ).toBeVisible()

  await page.goto('/app/dashboard')
  await expect(page).toHaveURL(/\/auth\/login$/)
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
})

test('mobile navigation works without horizontal overflow or console errors', async ({ page }) => {
  const consoleErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })

  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Open navigation menu' }).click()
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible()
  await page
    .getByRole('navigation', { name: 'Mobile navigation' })
    .getByRole('link', { name: 'Contact' })
    .click()
  await expect(page.getByRole('heading', { name: 'Need help?' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  expect(consoleErrors).toEqual([])
})

for (const viewport of [
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'large desktop', width: 1920, height: 1080 },
]) {
  test(`${viewport.name} homepage has no horizontal overflow`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await page.goto('/')
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
  })
}
