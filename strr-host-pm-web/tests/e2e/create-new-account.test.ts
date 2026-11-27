import { test, expect, type Locator, type Page } from '@playwright/test'
import { enI18n } from '~~/tests/mocks/i18n'

const i18nText = enI18n.global.messages.value['en-CA']
const DEBOUNCE_SETTLE_MS = 600
const SEARCH_RESPONSE_TIMEOUT_MS = 15000

async function waitForDebounceWindow (page: Page) {
  await page.evaluate(ms => new Promise(resolve => setTimeout(resolve, ms)), DEBOUNCE_SETTLE_MS)
}

async function searchAccountAndGetTotal (
  page: Page,
  input: Locator,
  name: string,
  { sequential = false } = {}
): Promise<number> {
  const responsePromise = page.waitForResponse(
    res => res.url().includes('/accounts/search') &&
      res.request().method() === 'GET' &&
      new URL(res.url()).searchParams.get('name') === name,
    { timeout: SEARCH_RESPONSE_TIMEOUT_MS }
  )
  if (sequential) {
    await input.fill('')
    await input.pressSequentially(name, { delay: 30 })
  } else {
    await input.fill(name)
  }
  const response = await responsePromise
  expect(response.status()).toBe(200)
  const body = await response.json()
  return body.total
}

test.describe('Create New Account - Account Name Search', () => {
  test.use({ storageState: 'tests/e2e/.auth/bcsc-user.json' })

  test('enforces min length, debounces typing, and validates account names', async ({ page }, testInfo) => {
    const existingAccountName = process.env.PLAYWRIGHT_TEST_BCSC_PREMIUM_ACCOUNT_NAME
    // Environment-specific fixture required to verify existing-account duplicate detection
    testInfo.skip(!existingAccountName, 'PLAYWRIGHT_TEST_BCSC_PREMIUM_ACCOUNT_NAME is required')

    const searchRequests: string[] = []
    page.on('request', (req) => {
      if (req.url().includes('/accounts/search')) {
        searchRequests.push(req.url())
      }
    })

    await page.goto('/en-CA/auth/account/create-new', { waitUntil: 'domcontentloaded' })

    const accountNameInput = page.getByPlaceholder(i18nText.label.accountName)
    await expect(accountNameInput).toBeVisible({ timeout: SEARCH_RESPONSE_TIMEOUT_MS })
    const existsError = page.getByText(i18nText.validation.accountName.exists)

    // 1. Fewer than 3 characters should not trigger /accounts/search
    await accountNameInput.fill('A')
    await waitForDebounceWindow(page)
    await accountNameInput.fill('AB')
    await waitForDebounceWindow(page)
    expect(searchRequests).toHaveLength(0)

    // 2. Rapid typing should debounce and avoid firing a request per keystroke
    const existingTotal = await searchAccountAndGetTotal(page, accountNameInput, existingAccountName!, {
      sequential: true
    })
    expect(existingTotal).toBeGreaterThan(0)
    expect(searchRequests.length).toBeLessThanOrEqual(2)
    await expect(existsError).toBeVisible()

    // Appending trailing whitespace should not trigger an extra /accounts/search request
    const countBeforeWhitespace = searchRequests.length
    await accountNameInput.fill(`${existingAccountName}   `)
    await waitForDebounceWindow(page)
    expect(searchRequests).toHaveLength(countBeforeWhitespace)

    // 3. Unique account name should clear the existing-account validation error
    const uniqueTotal = await searchAccountAndGetTotal(page, accountNameInput, `E2EUniqueAcct${Date.now()}`)
    expect(uniqueTotal).toBe(0)
    await expect(existsError).not.toBeVisible()

    // 4. Re-entering existing name then dropping below 3 chars clears error immediately without searching
    await searchAccountAndGetTotal(page, accountNameInput, existingAccountName!)
    await expect(existsError).toBeVisible()

    const countBeforeShort = searchRequests.length
    await accountNameInput.fill('XY')
    await waitForDebounceWindow(page)
    expect(searchRequests).toHaveLength(countBeforeShort)
    await expect(existsError).not.toBeVisible()
  })
})
