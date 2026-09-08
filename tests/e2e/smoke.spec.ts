import { expect, test } from '@playwright/test'

test('public and workspace shells render', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /trusted submission workspace/i })).toBeVisible()

  await page.goto('/app/dashboard')
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'FSP workspace navigation' })).toBeVisible()
})
