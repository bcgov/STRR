import { test, expect } from '@playwright/test'

test('Check for newly added host app', async ({ page }) => {
  await page.goto('/en-CA/dashboard')

  // verify we landed on the examiner dashboard page (allow time for auth redirect + data load)
  await expect(page.getByTestId('examiner-dashboard-page')).toBeVisible({ timeout: 30000 })
  await expect(page.getByTestId('applications-table')).toBeVisible({ timeout: 30000 })

  // verify the test registration is present in the table
  await expect(page.getByTestId('applications-table').locator('tbody')).toContainText('31333398143962')
})
