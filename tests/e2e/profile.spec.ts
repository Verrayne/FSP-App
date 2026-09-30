import { expect, test, type Page } from '@playwright/test'

const adminEmail = process.env.E2E_AUTH_EMAIL
const adminPassword = process.env.E2E_AUTH_PASSWORD
const multiFspEmail = process.env.E2E_MULTI_FSP_EMAIL
const multiFspPassword = process.env.E2E_MULTI_FSP_PASSWORD

async function signIn(page: Page, email: string, password: string) {
  await page.goto('/auth/login')
  await page.getByLabel('Email address').fill(email)
  await page.locator('#password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/app\/dashboard$/)
}

test('FSP administrator can update and restore organisation information', async ({ page }) => {
  test.skip(!adminEmail || !adminPassword, 'Set the hosted FSP administrator seed identity.')
  await signIn(page, adminEmail!, adminPassword!)
  await page.getByRole('link', { name: 'FSP Profile' }).click()
  await expect(page.getByRole('heading', { name: 'FSP Profile' })).toBeVisible()
  await expect(page.getByText('51234', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  const tradeName = page.getByLabel('Trading name')
  const original = await tradeName.inputValue()
  await tradeName.fill(`${original} E2E`)
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByText('Organisation information updated.')).toBeVisible()
  await expect(page.getByRole('heading', { name: `${original} E2E` })).toBeVisible()

  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  await tradeName.fill(original)
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByText('Organisation information updated.')).toBeVisible()
  await expect(page.getByRole('heading', { name: original })).toBeVisible()
})

test('FSP administrator can add and soft-remove an address', async ({ page }) => {
  test.skip(!adminEmail || !adminPassword, 'Set the hosted FSP administrator seed identity.')
  const line = `90 Profile Test Road ${Date.now()}`
  await signIn(page, adminEmail!, adminPassword!)
  await page.goto('/app/profile')
  await page.getByRole('button', { name: 'Add address' }).click()
  await page.getByLabel('Address type').selectOption('POSTAL')
  await page.getByLabel('Address line 1').fill(line)
  await page.getByLabel('City or town').fill('Cape Town')
  await page.getByLabel('Province').selectOption('Western Cape')
  await page.getByLabel('Postal code').fill('8001')
  await page.getByRole('button', { name: 'Save address' }).click()
  await expect(page.getByText(line, { exact: true })).toBeVisible()
  await page.getByRole('button', { name: `Remove address ${line}` }).click()
  await page.getByRole('button', { name: 'Remove address', exact: true }).click()
  await expect(page.getByText(line, { exact: true })).not.toBeVisible()
})

test('FSP administrator can add and soft-remove a contact without changing access', async ({
  page,
}) => {
  test.skip(!adminEmail || !adminPassword, 'Set the hosted FSP administrator seed identity.')
  const lastName = `Contact-${Date.now()}`
  await signIn(page, adminEmail!, adminPassword!)
  await page.goto('/app/profile')
  await page.getByRole('button', { name: 'Add contact' }).click()
  await page.getByLabel('First name').fill('E2E')
  await page.getByLabel('Last name').fill(lastName)
  await page.getByLabel('Email address').fill(`e2e.${Date.now()}@example.test`)
  await page.getByRole('button', { name: 'Save contact' }).click()
  await expect(page.getByText(`E2E ${lastName}`)).toBeVisible()
  await expect(page.getByText('Platform access was not changed.')).toBeVisible()
  await page.getByRole('button', { name: `Remove E2E ${lastName}` }).click()
  await page.getByRole('button', { name: 'Remove contact', exact: true }).click()
  await expect(page.getByText(`E2E ${lastName}`, { exact: true })).not.toBeVisible()
})

test('multi-FSP viewer can switch profiles without receiving edit actions or cached data', async ({
  page,
}) => {
  test.skip(!multiFspEmail || !multiFspPassword, 'Set the hosted multi-FSP seed identity.')
  await signIn(page, multiFspEmail!, multiFspPassword!)
  await page.goto('/app/profile')
  const switcher = page.getByLabel('Current FSP')
  await switcher.selectOption('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001')
  await expect(
    page.getByText('Karoo Oak Financial Services (Pty) Ltd', { exact: true }),
  ).toBeVisible()
  await switcher.selectOption('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb002')
  await expect(
    page.getByText('Karoo Oak Financial Services (Pty) Ltd', { exact: true }),
  ).not.toBeVisible()
  await expect(page.getByText('Highveld Compass Brokers (Pty) Ltd', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Add address' })).not.toBeVisible()
  await expect(page.getByRole('button', { name: 'Add contact' })).not.toBeVisible()
  await expect(page.getByRole('button', { name: 'Edit', exact: true })).not.toBeVisible()
})

test('FSP profile fits a mobile viewport', async ({ page }) => {
  test.skip(!adminEmail || !adminPassword, 'Set the hosted FSP administrator seed identity.')
  await page.setViewportSize({ width: 375, height: 812 })
  await signIn(page, adminEmail!, adminPassword!)
  await page.goto('/app/profile')
  await expect(page.getByRole('heading', { name: 'FSP Profile' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
})
