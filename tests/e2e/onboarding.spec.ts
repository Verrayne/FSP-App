import { expect, test } from '@playwright/test'

const onboardingEmail = process.env.E2E_ONBOARDING_EMAIL
const onboardingPassword = process.env.E2E_ONBOARDING_PASSWORD
const multiFspEmail = process.env.E2E_MULTI_FSP_EMAIL
const multiFspPassword = process.env.E2E_MULTI_FSP_PASSWORD

test('authenticated user without an FSP can search and review a registry record', async ({
  page,
}) => {
  test.skip(
    !onboardingEmail || !onboardingPassword,
    'Set the hosted no-FSP seed identity for onboarding browser coverage.',
  )

  await page.goto('/auth/login')
  await page.getByLabel('Email address').fill(onboardingEmail!)
  await page.locator('#password').fill(onboardingPassword!)
  await page.getByRole('button', { name: 'Sign in' }).click()

  await expect(page).toHaveURL(/\/app\/onboarding$/)
  await expect(
    page.getByRole('heading', { name: /Link your FSP|access request was not approved/ }),
  ).toBeVisible()
  await page.getByRole('link', { name: 'Find my FSP' }).click()
  await page.getByLabel('FSP number or name').fill('Ubuntu Meridian')
  await expect(page.getByText('Ubuntu Meridian Advisory (Pty) Ltd')).toBeVisible()
  await page.getByRole('link', { name: /Select FSP 53456/ }).click()

  await expect(page).toHaveURL(/\/app\/onboarding\/fsp\/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb003$/)
  await expect(page.getByRole('heading', { name: 'Is this the correct FSP?' })).toBeVisible()
  await expect(page.getByText(/7 Meridian Road/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Confirm and request access' })).toBeEnabled()
})

test('multi-FSP user can switch only among active permitted contexts', async ({ page }) => {
  test.skip(
    !multiFspEmail || !multiFspPassword,
    'Set the hosted multi-FSP seed identity for context-switcher coverage.',
  )

  await page.goto('/auth/login')
  await page.getByLabel('Email address').fill(multiFspEmail!)
  await page.locator('#password').fill(multiFspPassword!)
  await page.getByRole('button', { name: 'Sign in' }).click()

  await expect(page).toHaveURL(/\/app\/dashboard$/)
  const switcher = page.getByLabel('Current FSP')
  await expect(switcher).toBeVisible()
  await expect(switcher.locator('option')).toHaveCount(2)
  await switcher.selectOption('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb002')
  await expect(switcher).toHaveValue('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb002')
})
