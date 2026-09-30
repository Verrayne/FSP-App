import { expect, test, type Page } from '@playwright/test'

const password = process.env.E2E_TENANT_PASSWORD
const tenantAAdmin = process.env.E2E_TENANT_A_ADMIN
const tenantAReviewer = process.env.E2E_TENANT_A_REVIEWER
const tenantBAdmin = process.env.E2E_TENANT_B_ADMIN
const tenantBReviewer = process.env.E2E_TENANT_B_REVIEWER
const multiTenant = process.env.E2E_MULTI_TENANT
const fspOnly = process.env.E2E_AUTH_EMAIL

async function signIn(page: Page, email: string) {
  await page.goto('/auth/login')
  await page.getByLabel('Email address').fill(email)
  await page.locator('#password').fill(password!)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/(app(?:\/dashboard)?|admin\/dashboard)$/)
}

test.describe('insurer portal', () => {
  test.skip(!password || !tenantAAdmin, 'Set the hosted tenant seed identities.')

  test('Tenant A administrator can use the operational workspace', async ({ page }) => {
    await signIn(page, tenantAAdmin!)
    await expect(page).toHaveURL(/\/admin\/dashboard$/)
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
    await expect(page.getByText('Cape Horizon Assurance', { exact: true })).toBeVisible()
    await expect(page.getByText('Current open period')).toBeVisible()

    await page.getByRole('link', { name: 'Settings' }).click()
    await expect(page).toHaveURL(/\/admin\/settings\/organisation$/)
    await expect(page.getByRole('heading', { name: 'Organisation' })).toBeVisible()
    await expect(page.getByLabel('Tenant code')).toBeDisabled()
    await expect(page.getByText('Active', { exact: true })).toBeVisible()

    await page.getByRole('link', { name: 'FSPs' }).click()
    await expect(page.getByRole('heading', { name: 'FSPs' })).toBeVisible()
    await expect(page.getByText('CHA-UM-002')).toBeVisible()
    await expect(page.getByText('UMO-UM-002')).not.toBeVisible()
    await page.getByPlaceholder('Search FSP name, number or reference').fill('53456')
    await page.getByPlaceholder('Search FSP name, number or reference').press('Enter')
    await expect(page.getByText('Ubuntu Meridian', { exact: true })).toBeVisible()

    await page.getByRole('link', { name: 'Submissions' }).click()
    await expect(page.getByRole('heading', { name: 'Submissions' })).toBeVisible()
    await page.getByLabel('Work queue').selectOption('ALL')
    await expect(page.getByRole('link', { name: 'Ubuntu Meridian' })).toBeVisible()
    await page.goto('/admin/submissions/be000000-0000-4000-8000-000000000002')
    await expect(page.getByRole('heading', { name: 'Submission' })).toBeVisible()
    await expect(page.getByText('Ubuntu Meridian', { exact: true })).toBeVisible()
    await expect(
      page.getByRole('definition').filter({ hasText: /^2026 Annual B-BBEE Submission$/ }),
    ).toBeVisible()
    await expect(page.getByText('Financial Information')).toBeVisible()
    await expect(
      page.getByRole('button', { name: /Approve|Reject|Request changes/i }),
    ).not.toBeVisible()
  })

  test('reviewer receives read access and wrong-tenant deep links do not disclose data', async ({
    page,
  }) => {
    test.skip(!tenantAReviewer, 'Set the Tenant A reviewer seed identity.')
    await signIn(page, tenantAReviewer!)
    await expect(page).toHaveURL(/\/admin\/dashboard$/)
    await expect(page.getByRole('link', { name: 'Settings' })).not.toBeVisible()
    await page.goto('/admin/settings/organisation')
    await expect(page).toHaveURL(/\/admin\/dashboard$/)
    await page.goto('/admin/submissions/be000000-0000-4000-8000-000000000002')
    await expect(page.getByRole('heading', { name: 'Submission' })).toBeVisible()
    await expect(page.getByText('Ubuntu Meridian', { exact: true })).toBeVisible()
    await page.goto('/admin/submissions/be000000-0000-4000-8000-000000000004')
    await expect(page.getByText('Submission could not be found or accessed')).toBeVisible()
    await expect(page.getByText('Umoya Mutual Insurance')).not.toBeVisible()
  })

  test('tenant history shows immutable content and a curated audit trail', async ({ page }) => {
    await signIn(page, tenantAAdmin!)
    await page.goto('/admin/submissions/be000000-0000-4000-8000-000000000001')
    await expect(page.getByLabel('Submission version')).toContainText('Original submission')
    await expect(page.getByRole('heading', { name: 'Financial Information' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Status history' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Audit trail' })).toBeVisible()
    await expect(page.getByText('Newest activity first.')).toBeVisible()
  })

  test('reviewer sees guarded human review decisions', async ({ page }) => {
    test.skip(!tenantBReviewer, 'Set the Tenant B reviewer seed identity.')
    await signIn(page, tenantBReviewer!)
    await page.goto('/admin/submissions/be000000-0000-4000-8000-000000000003')
    await expect(page.getByRole('heading', { name: 'Review decision' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Mark complete' })).toBeVisible()
    await page.getByRole('button', { name: 'Request changes' }).click()
    const dialog = page.getByRole('dialog', { name: 'Confirm review decision' })
    await expect(dialog.getByText('Changes requested', { exact: true })).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Confirm decision' })).toBeDisabled()
  })

  test('shared FSP exposes only the selected insurer relationship and submission', async ({
    browser,
  }) => {
    test.skip(!tenantBAdmin, 'Set the Tenant B administrator seed identity.')
    const contextA = await browser.newContext()
    const pageA = await contextA.newPage()
    await signIn(pageA, tenantAAdmin!)
    await pageA.goto('/admin/fsps')
    await expect(pageA.getByText('CHA-UM-002')).toBeVisible()
    await expect(pageA.getByText('UMO-UM-002')).not.toBeVisible()
    await contextA.close()
    const contextB = await browser.newContext()
    const pageB = await contextB.newPage()
    await signIn(pageB, tenantBAdmin!)
    await pageB.goto('/admin/fsps')
    await expect(pageB.getByText('UMO-UM-002')).toBeVisible()
    await expect(pageB.getByText('CHA-UM-002')).not.toBeVisible()
    await contextB.close()
  })

  test('FSP-only user is denied insurer data but keeps FSP workspace access', async ({ page }) => {
    test.skip(!fspOnly, 'Set the FSP-only administrator seed identity.')
    await signIn(page, fspOnly!)
    await expect(page).toHaveURL(/\/app\/dashboard$/)
    await page.goto('/admin/dashboard')
    await expect(page).toHaveURL(/\/forbidden$/)
    await page.goto('/app/dashboard')
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  })

  test('multi-insurer user switches tenant identity and cached portfolio data', async ({
    page,
  }) => {
    test.skip(!multiTenant, 'Set the multi-insurer seed identity.')
    await signIn(page, multiTenant!)
    await page.goto('/admin/fsps')
    await expect(page.getByText('CHA-UM-002')).toBeVisible()
    const switcher = page.getByLabel('Current insurer')
    await switcher.selectOption('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2')
    await expect(switcher).toHaveValue('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2')
    await expect(page.getByText('UMO-UM-002')).toBeVisible()
    await expect(page.getByText('CHA-UM-002')).not.toBeVisible()
  })
})
