import { expect, test, type Page } from '@playwright/test'

const email = process.env.E2E_AUTH_EMAIL
const password = process.env.E2E_AUTH_PASSWORD
const certificateId = process.env.E2E_CERTIFICATE_SUBMISSION_ID
const affidavitId = process.env.E2E_AFFIDAVIT_SUBMISSION_ID
const draftId = process.env.E2E_DRAFT_SUBMISSION_ID

async function signIn(page: Page) {
  await page.goto('/auth/login')
  await page.getByLabel('Email address').fill(email!)
  await page.locator('#password').fill(password!)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/app\/dashboard$/)
}

async function completeRequiredQuestionnaire(page: Page, route: 'CERTIFICATE' | 'AFFIDAVIT') {
  await page.getByRole('button', { name: /Financial Information$/ }).click()
  await page
    .getByRole('radio', {
      name: route === 'CERTIFICATE' ? 'R10 million to R25 million' : 'Less than R10 million',
    })
    .click()
  await page.getByLabel(/financial year end/i).fill('2026-02-28')
  await page.getByLabel(/financial year end/i).blur()

  await page.getByRole('button', { name: /B-BBEE Information$/ }).click()
  await page.getByRole('radio', { name: 'No' }).click()

  await page.getByRole('button', { name: /Ownership Information$/ }).click()
  await page.getByLabel(/Black ownership percentage/i).fill('51.25')
  await page.getByLabel(/Black ownership percentage/i).blur()
  await page.getByLabel(/Black female ownership percentage/i).fill('30.5')
  await page.getByLabel(/Black female ownership percentage/i).blur()
  await expect(page.getByText('Saved')).toBeVisible()
  await page
    .getByRole('button', { name: route === 'CERTIFICATE' ? /Certificate$/ : /Declaration$/ })
    .click()
}

async function submitFromReview(page: Page) {
  await page.getByRole('button', { name: /Review$/ }).click()
  await page.getByRole('button', { name: 'Submit B-BBEE information' }).click()
  const dialog = page.getByRole('dialog', { name: 'Submit B-BBEE information' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Submit B-BBEE information' }).click()
  await expect(page).toHaveURL(/\/app\/dashboard$/)
  await expect(page.getByRole('heading', { name: 'Submitted' })).toBeVisible()
}

test('FSP submission history opens the latest immutable attempt', async ({ page }) => {
  test.skip(!email || !password, 'Set the hosted FSP seed identity.')
  await signIn(page)
  await page.goto('/app/submissions')
  await expect(page.getByRole('heading', { name: 'Submissions' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'View' }).first()).toBeVisible()
  await page.getByRole('link', { name: 'View' }).first().click()
  await expect(page.getByLabel('Submission version')).toBeVisible()
  await expect(page.getByLabel('Submission version')).toContainText('Original submission')
  await expect(page.getByRole('heading', { name: 'Financial Information' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Status history' })).toBeVisible()
})

test('dedicated certificate fixture completes and returns to a submitted dashboard', async ({
  page,
}) => {
  test.skip(
    !email || !password || !certificateId,
    'Set a resettable E2E_CERTIFICATE_SUBMISSION_ID fixture before running the destructive flow.',
  )
  await signIn(page)
  await page.goto(`/app/submissions/${certificateId}`)
  await expect(page.getByRole('heading', { name: 'B-BBEE Submission' })).toBeVisible()
  await completeRequiredQuestionnaire(page, 'CERTIFICATE')
  await page.locator('input[type="file"]').setInputFiles({
    name: 'certificate.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4\n%%EOF'),
  })
  await expect(page.getByText('certificate.pdf')).toBeVisible()
  await submitFromReview(page)
  await page.goto(`/app/submissions/${certificateId}`)
  await expect(page.getByText(/This submission is read-only/)).toBeVisible()
})

test('dedicated affidavit fixture requires explicit acknowledgement before final submission', async ({
  page,
}) => {
  test.skip(
    !email || !password || !affidavitId,
    'Set a resettable E2E_AFFIDAVIT_SUBMISSION_ID fixture before running the destructive flow.',
  )
  await signIn(page)
  await page.goto(`/app/submissions/${affidavitId}`)
  await completeRequiredQuestionnaire(page, 'AFFIDAVIT')
  await page.getByRole('checkbox', { name: /explicitly accept this declaration/i }).check()
  await expect(page.getByText(/^Accepted by/)).toBeVisible()
  await submitFromReview(page)
  await page.goto(`/app/submissions/${affidavitId}`)
  await expect(page.getByText(/This submission is read-only/)).toBeVisible()
})

test('draft answers resume and a stale hidden conditional answer is cleared', async ({ page }) => {
  test.skip(
    !email || !password || !draftId,
    'Set a resettable E2E_DRAFT_SUBMISSION_ID fixture for draft persistence coverage.',
  )
  await signIn(page)
  await page.goto(`/app/submissions/${draftId}`)
  await page.getByRole('button', { name: /B-BBEE Information$/ }).click()
  await page.getByRole('radio', { name: 'Yes' }).click()
  const details = page.getByLabel(/other certification details/i)
  await details.fill('Development certificate')
  await details.blur()
  await expect(page.getByText('Saved')).toBeVisible()
  await page.reload()
  await page.getByRole('button', { name: /B-BBEE Information$/ }).click()
  await expect(details).toHaveValue('Development certificate')
  await page.getByRole('radio', { name: 'No' }).click()
  await expect(details).toHaveCount(0)
  await expect(page.getByText('Saved')).toBeVisible()
  await page.reload()
  await page.getByRole('button', { name: /B-BBEE Information$/ }).click()
  await expect(page.getByLabel(/other certification details/i)).toHaveCount(0)
})
