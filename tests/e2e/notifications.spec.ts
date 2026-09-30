import { expect, test, type Page } from '@playwright/test'

const fspEmail = process.env.E2E_AUTH_EMAIL
const fspPassword = process.env.E2E_AUTH_PASSWORD
const tenantEmail = process.env.E2E_TENANT_A_REVIEWER
const tenantPassword = process.env.E2E_TENANT_PASSWORD

async function signIn(page: Page, email: string, password: string) {
  await page.goto('/auth/login')
  await page.getByLabel('Email address').fill(email)
  await page.locator('#password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/(app(?:\/dashboard)?|admin\/dashboard)$/)
}

test('FSP user can open the notification centre and preferences', async ({ page }) => {
  test.skip(!fspEmail || !fspPassword, 'Set the hosted FSP seed identity.')
  await signIn(page, fspEmail!, fspPassword!)
  await expect(page.getByRole('button', { name: /^Notifications/ })).toBeVisible()
  await page.goto('/app/notifications')
  await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible()
  await expect(page.getByLabel('Unread only')).toBeVisible()
  await page.getByRole('link', { name: 'Preferences' }).click()
  await expect(page.getByRole('heading', { name: 'Notification preferences' })).toBeVisible()
  await expect(page.getByText('Email enabled (required)')).toBeVisible()
})

test('tenant reviewer can open the same user-level notification centre', async ({ page }) => {
  test.skip(!tenantEmail || !tenantPassword, 'Set the hosted tenant reviewer identity.')
  await signIn(page, tenantEmail!, tenantPassword!)
  await expect(page.getByRole('button', { name: /^Notifications/ })).toBeVisible()
  await page.goto('/admin/notifications')
  await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible()
})
