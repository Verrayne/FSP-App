import { expect, test, type Page } from '@playwright/test'

const adminEmail = process.env.E2E_AUTH_EMAIL
const adminPassword = process.env.E2E_AUTH_PASSWORD

async function signIn(page: Page) {
  await page.goto('/auth/login')
  await page.getByLabel('Email address').fill(adminEmail!)
  await page.locator('#password').fill(adminPassword!)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/app\/dashboard$/)
}

test('FSP administrator can view and search the current FSP team', async ({ page }) => {
  test.skip(!adminEmail || !adminPassword, 'Set the hosted FSP administrator seed identity.')
  await signIn(page)
  await page.getByRole('link', { name: 'Users' }).click()
  await expect(page).toHaveURL(/\/app\/users$/)
  await expect(page.getByRole('heading', { name: 'Users & permissions' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Invite user' })).toBeVisible()
  await expect(page.getByText('fsp.submitter@example.test')).toBeVisible()
  await page.getByPlaceholder('Search by name, email or role').fill('Pieter')
  await expect(page.getByText('fsp.submitter@example.test')).toBeVisible()
  await expect(page.getByText('fsp.multi@example.test')).not.toBeVisible()
})

test('users page fits a mobile viewport', async ({ page }) => {
  test.skip(!adminEmail || !adminPassword, 'Set the hosted FSP administrator seed identity.')
  await page.setViewportSize({ width: 375, height: 812 })
  await signIn(page)
  await page.goto('/app/users')
  await expect(page.getByRole('heading', { name: 'Users & permissions' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
})
