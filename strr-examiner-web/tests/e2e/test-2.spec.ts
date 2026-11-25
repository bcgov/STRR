import { test, expect, type Page } from '@playwright/test'

const DASHBOARD_URL = '/en-CA/dashboard'
const LONG_UNBROKEN_NAME = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' +
  '!@#$%^&*()_+-=[]{}|;:,.<>?`~" ' +
  'ᐃᐅᐊᐱᐳᐸᑎᑑᑕᑭᑲᑯᒋᒍᒐᒥᒧᒪᓂᓄᓇᓯᓱᓴᔂᔅᔈᔑᔓᔕᔦᔨᔪᕂᕆᕋᕐᕕᕙᕞᕽᖀᖄᖅᖋᖏᖓᖖᖠᖤᖨᖬᖯᖳᖷᖻᖾᗂᗅᗈᗌᗐᗔᗘᗜᗠᗤᗨᗬᗰᗴᗸᗼᘀᘄᘈᘌᘐᘔᘘᘜᘠᘤᘨᘬᘰᘴᘸᘼᙀᙄᙈᙌᙐᙔᙘᙜᙠᙤᙨᙬᙰᙴᙸᙼ ' +
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit.'

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

    // HostSupportingInfo
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

  test('long unbroken name wraps cleanly in header, subheader, and expansion panel', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })

    await page.route('**/applications/*', async (route) => {
      const response = await route.fetch()
      if (response.headers()['content-type']?.includes('application/json')) {
        const json = await response.json()
        if (json.registration?.registrationType === 'HOST') {
          json.registration.primaryContact = {
            ...json.registration.primaryContact,
            firstName: LONG_UNBROKEN_NAME,
            lastName: ''
          }
          json.registration.unitAddress = {
            ...json.registration.unitAddress,
            nickname: LONG_UNBROKEN_NAME
          }
        } else if (json.registration?.businessDetails) {
          json.registration.businessDetails.legalName = LONG_UNBROKEN_NAME
        }
        await route.fulfill({ response, json })
      } else {
        await route.continue()
      }
    })

    await navigateToFirstApplication(page)
    await expect(page.getByTestId('application-number')).toBeVisible({ timeout: 30000 })

    // Header actions remain visible within the viewport
    const receiptBtn = page.getByTestId('view-receipt-button')
    await expect(receiptBtn).toBeVisible()
    const receiptBox = await receiptBtn.boundingBox()
    expect((receiptBox?.x ?? 0) + (receiptBox?.width ?? 0)).toBeLessThanOrEqual(1440)

    // No page-level horizontal overflow
    const hasDocOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })
    expect(hasDocOverflow).toBe(false)

    // Subheader name button clamps and opens expansion panel without overflow
    const hostSubHeader = page.getByTestId('host-sub-header')
    const strataSubHeader = page.getByTestId('strata-sub-header')
    if (await hostSubHeader.isVisible()) {
      const nameBtn = hostSubHeader.locator('#host-details button span.line-clamp-3')
      await expect(nameBtn).toBeVisible()
      await nameBtn.click()
      await expect(page.getByTestId('no-cra-tax-numner').or(page.locator('table'))).toBeVisible({ timeout: 10000 })
    } else if (await strataSubHeader.isVisible()) {
      const bizBtn = strataSubHeader.getByTestId('strata-business').locator('button span.line-clamp-3')
      await expect(bizBtn).toBeVisible()
      await bizBtn.click()
    }

    const hasExpandedOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })
    expect(hasExpandedOverflow).toBe(false)
  })
})
