import { test, expect } from '@playwright/test'

// The test block defines a single test case
test('Check for newly added host app', async ({ page }) => {
  await page.goto('/') // The '/' is relative to the `baseURL` specified in the PW config

  // login
  await page.getByRole('button', { name: 'Continue with IDIR' }).click()
  await page.locator('#user').fill(process.env.PLAYWRIGHT_TEST_USERNAME!)
  await page.getByRole('textbox', { name: 'Password' }).fill(process.env.PLAYWRIGHT_TEST_PASSWORD!)
  await page.getByRole('button', { name: 'Continue' }).click()

  // check examiner dashboard has our test registration
  await expect(page.getByRole('heading')).toContainText('Search')
  await expect(page.getByRole('textbox', { name: 'Find in application...' })).toBeVisible()
  await expect(page.locator('tbody')).toContainText('31333398143962')
})
