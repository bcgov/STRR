import { test, expect } from '@playwright/test'

const DASHBOARD_URL = '/en-CA/dashboard'

test.describe('Examiner Dashboard', () => {
  test('load the page with tabs, table and its components', async ({ page }) => {
    await page.goto(DASHBOARD_URL)

    await expect(page.getByTestId('examiner-dashboard-page')).toBeVisible({ timeout: 30000 })
    await expect(page.getByTestId('application-and-registrations-tabs')).toBeVisible()
    await expect(page.getByTestId('applications-table-header')).toBeVisible()

    const table = page.getByTestId('applications-table')
    await expect(table.locator('tbody tr').first()).toBeVisible({ timeout: 15000 })
    await expect(table.locator('thead th')).toHaveCount(8)

    await expect(page.getByTestId('dashboard-search-input')).toBeVisible()
    await expect(page.getByTestId('clear-filters-button')).toBeVisible()
  })

  test('switching tab should update url and columns', async ({ page }) => {
    await page.goto(DASHBOARD_URL)
    await expect(page.getByTestId('examiner-dashboard-page')).toBeVisible({ timeout: 30000 })
    await expect(page.getByTestId('applications-table').locator('tbody tr').first()).toBeVisible({ timeout: 15000 })

    // switch to registrations tab and verify urls and columns
    await page.getByTestId('tab-registrations').click()

    await expect(page).toHaveURL(/tab=registrations/)
    const table = page.getByTestId('applications-table')
    await expect(table.locator('thead th')).toHaveCount(9, { timeout: 10000 })

    // reload with registrations tab and verify url and columns
    await page.goto(`${DASHBOARD_URL}?returnTab=registrations`)
    await expect(page.getByTestId('examiner-dashboard-page')).toBeVisible({ timeout: 30000 })
    await expect(table.locator('thead th')).toHaveCount(9, { timeout: 10000 })
    await expect(page).toHaveURL(/tab=registrations/)
    await expect(page).not.toHaveURL(/returnTab=/)
  })

  test('registration row click should navigate to registration page', async ({ page }) => {
    await page.goto(`${DASHBOARD_URL}?tab=registrations`)
    await expect(page.getByTestId('examiner-dashboard-page')).toBeVisible({ timeout: 30000 })

    const table = page.getByTestId('applications-table')
    // click first registration row and verify navigation to registration url
    await expect(table.locator('tbody tr').first()).toBeVisible({ timeout: 15000 })
    await table.locator('tbody tr').first().click()
    await expect(page).toHaveURL(/\/registration\/\d+/, { timeout: 15000 })
  })

  test('application row click should navigate to application page', async ({ page }) => {
    await page.goto(DASHBOARD_URL)
    await expect(page.getByTestId('examiner-dashboard-page')).toBeVisible({ timeout: 30000 })

    const table = page.getByTestId('applications-table')
    // click first application row and verify navigation to examine url
    await expect(table.locator('tbody tr').first()).toBeVisible({ timeout: 15000 })
    await table.locator('tbody tr').first().click()
    await expect(page).toHaveURL(/\/examine\//, { timeout: 15000 })
  })

  test('clear all filters button', async ({ page }) => {
    await page.goto(DASHBOARD_URL)
    await expect(page.getByTestId('examiner-dashboard-page')).toBeVisible({ timeout: 30000 })

    // type in search, then clear and verify
    const searchInput = page.getByTestId('dashboard-search-input')
    await searchInput.fill('abc')
    await expect(searchInput).toHaveValue('abc')
    await page.getByTestId('clear-filters-button').click()
    await expect(searchInput).toHaveValue('')
  })
})
