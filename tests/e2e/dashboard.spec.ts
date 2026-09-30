import { expect, test, type Page } from '@playwright/test'

const adminEmail = process.env.E2E_AUTH_EMAIL
const adminPassword = process.env.E2E_AUTH_PASSWORD
const multiFspEmail = process.env.E2E_MULTI_FSP_EMAIL
const multiFspPassword = process.env.E2E_MULTI_FSP_PASSWORD
const submissionStatus =
  /Not started|In progress|Submitted|Under review|Changes requested|Completed|Rejected/

async function signIn(page: Page, email: string, password: string) {
  await page.goto('/auth/login')
  await page.getByLabel('Email address').fill(email)
  await page.locator('#password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/app\/dashboard$/)
}

test('FSP administrator sees the current submission and an appropriate action', async ({
  page,
}) => {
  test.skip(!adminEmail || !adminPassword, 'Set the hosted FSP administrator seed identity.')

  await signIn(page, adminEmail!, adminPassword!)
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  await expect(page.getByTestId('dashboard-skeleton')).toBeVisible()
  await expect(page.getByRole('heading', { name: submissionStatus })).toBeVisible()
  await expect(page.getByText('31 October 2026', { exact: true })).toBeVisible()
  await expect(
    page.getByRole('link', { name: /Start submission|Continue submission|View submission/ }),
  ).toBeVisible()
})

test('multi-FSP viewer switches without displaying the previous FSP submission state', async ({
  page,
}) => {
  test.skip(!multiFspEmail || !multiFspPassword, 'Set the hosted multi-FSP seed identity.')

  await signIn(page, multiFspEmail!, multiFspPassword!)
  const switcher = page.getByLabel('Current FSP')
  await switcher.selectOption('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001')
  await expect(page.getByText('Cape Horizon Assurance')).toBeVisible()

  // Reload with FSP A persisted so the next context is not already in the query cache.
  await page.reload()
  await expect(page.getByText('Cape Horizon Assurance')).toBeVisible()
  await switcher.selectOption('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb002')
  await expect(page.getByTestId('dashboard-skeleton')).toBeVisible()
  await expect(page.getByText('Cape Horizon Assurance')).not.toBeVisible()
  await expect(page.getByText('Umoya Mutual')).toBeVisible()
  await expect(page.getByRole('heading', { name: submissionStatus })).toBeVisible()
  await expect(page.getByRole('link', { name: 'View submission' })).toBeVisible()
  await expect(page.getByText('Your access is read-only.')).toBeVisible()
})

test('dashboard remains responsive at a mobile width', async ({ page }) => {
  test.skip(!adminEmail || !adminPassword, 'Set the hosted FSP administrator seed identity.')

  await page.setViewportSize({ width: 375, height: 812 })
  await signIn(page, adminEmail!, adminPassword!)
  await expect(page.getByRole('heading', { name: submissionStatus })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
})
