import { test, expect, type Page } from '@playwright/test'

const DASHBOARD_URL = '/en-CA/dashboard'

async function navigateToFirstApplication (page: Page) {
  await page.goto(DASHBOARD_URL)
  const table = page.getByTestId('applications-table')
  await expect(table.locator('tbody tr').first()).toBeVisible({ timeout: 15000 })
  await table.locator('tbody tr').first().click()
  await expect(page).toHaveURL(/\/examine\//, { timeout: 15000 })
}

test.describe('Application Details Page', () => {
  test('load the page with all components visible', async ({ page }) => {
    await navigateToFirstApplication(page)

    // ApplicationInfoHeader
    await expect(page.getByTestId('application-number')).toBeVisible({ timeout: 30000 })
    await expect(page.getByTestId('application-name')).toBeVisible()
    await expect(page.getByTestId('application-status-badge')).toBeVisible()
    await expect(page.getByTestId('view-receipt-button')).toBeVisible()
    await expect(page.getByTestId('toggle-history-btn')).toBeVisible()

    // HostSubHeader
    await expect(page.getByTestId('host-sub-header')).toBeVisible()
    await expect(page.getByTestId('edit-rental-unit-button')).toBeVisible()

    // HostSupportingInfo
    await expect(page.getByTestId('business-lic-section')).toBeVisible()
    await expect(page.getByTestId('pr-req-section')).toBeVisible()

    // Applications always render ConnectButtonControl, not ActionButtons
    await expect(page.getByTestId('button-control')).toBeVisible()
  })

  test('toggle filing history shows and hides history table', async ({ page }) => {
    await navigateToFirstApplication(page)
    await expect(page.getByTestId('application-number')).toBeVisible({ timeout: 30000 })

    await page.getByTestId('toggle-history-btn').click()
    await expect(page.getByTestId('history-table')).toBeVisible({ timeout: 10000 })

    await page.getByTestId('toggle-history-btn').click()
    await expect(page.getByTestId('history-table')).not.toBeVisible()
  })

  test('action buttons are rendered in the button control', async ({ page }) => {
    await navigateToFirstApplication(page)
    await expect(page.getByTestId('application-number')).toBeVisible({ timeout: 30000 })

    // Applications always render ConnectButtonControl, not ActionButtons
    await expect(page.getByTestId('button-control')).toBeVisible()
    await expect(page.getByTestId('main-action-button')).not.toBeVisible()
    const assignBtn = page.getByTestId('action-button-assign')
    const unassignBtn = page.getByTestId('action-button-unassign')
    await expect(assignBtn.or(unassignBtn)).not.toBeVisible()
  })

  test('error state shown for non-existent application ID', async ({ page }) => {
    await page.goto('/en-CA/examine/0000000000000000')

    await expect(page.getByTestId('examiner-error-state')).toBeVisible({ timeout: 30000 })
    await expect(page.getByTestId('application-number')).not.toBeVisible()
  })
})
