import { expect, test } from '@playwright/test'

test('anonymous users are redirected away from app and admin routes', async ({ page }) => {
  await page.goto('/app/submissions?year=2026')
  await expect(page).toHaveURL(/\/auth\/login$/)
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()

  await page.goto('/admin/dashboard')
  await expect(page).toHaveURL(/\/auth\/login$/)
})

test('registration and recovery routes expose focused accessible forms', async ({ page }) => {
  await page.goto('/auth/register')
  await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible()
  await expect(page.getByLabel('First name')).toBeVisible()
  await expect(page.getByLabel('Last name')).toBeVisible()
  await expect(page.getByLabel('Contact number (optional)')).toBeVisible()
  await expect(page.getByText('Use at least 8 characters.')).toBeVisible()
  await expect(page.getByLabel(/FSP number/i)).toHaveCount(0)

  await page.goto('/auth/forgot-password')
  await expect(page.getByRole('heading', { name: 'Reset your password' })).toBeVisible()

  await page.goto('/auth/reset-password')
  await expect(page.getByRole('heading', { name: 'Recovery link unavailable' })).toBeVisible()
})

test('configured Supabase user can sign in, restore the session and sign out', async ({ page }) => {
  const email = process.env.E2E_AUTH_EMAIL
  const password = process.env.E2E_AUTH_PASSWORD
  test.skip(
    !email || !password,
    'Set E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD for hosted Auth coverage.',
  )

  await page.goto('/auth/login')
  await page.getByLabel('Email address').fill(email!)
  await page.locator('#password').fill(password!)
  await page.getByRole('button', { name: 'Sign in' }).click()

  await expect(page).toHaveURL(/\/app\/dashboard$/)
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

  await page.reload()
  await expect(page).toHaveURL(/\/app\/dashboard$/)
  await page.getByRole('button', { name: 'Account menu' }).click()
  await expect(page.getByText(email!)).toBeVisible()
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/\/auth\/login$/)
})
