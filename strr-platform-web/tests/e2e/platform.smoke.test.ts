import { test, expect, type Page } from '@playwright/test'

test.describe('STRR Platform Smoke Test', () => {
  let page: Page

  // this is required to use saved user auth state
  // do not use this in tests where user should be logged out
  test.use({ storageState: 'tests/e2e/.auth/user.json' })

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()
    await page.goto('./en-CA/platform/application/') // uses base url set in playwright config
  })

  // pw recommends using getters for common locators
  // if locator changes, only need to update getter fn instead of every line
  // using .first not recommended but this might fail if there's more than 1 element found
  const getH2 = () => page.getByTestId('h2').first()
  const getForm = () => page.locator('form').first()
  const getCountryCode = () => page.getByTestId('phone-countryCode')
  const getPhoneNum = () => page.getByTestId('phone-number')
  const getPhoneExt = () => page.getByTestId('phone-extension')
  const getNextBtn = () => page.getByRole('button', { name: 'Next' })
  const getBackBtn = () => page.getByRole('button', { name: 'Back' })
  const getRadioGroup = (name: string) => page.getByRole('group', { name })
  const getEmail = () => page.getByPlaceholder('Email Address')

  test('smoke test - Step 1', async () => {
    // check for step 1 content
    await expect(page.getByTestId('h1')).toContainText('Short-Term Rental Platform Application')
    await expect(getH2()).toContainText('Step 1 - Contact Information')
    await expect(page.locator('legend')).toContainText('Are you the platform representative?')
    await expect(getRadioGroup('Are you the platform').getByLabel('No')).toBeVisible() // not sure why the full title isnt working
    await expect(getRadioGroup('Are you the platform').getByLabel('Yes')).toBeVisible()

    // fill in Step 1 details
    await page.getByLabel('Yes').check()
    await expect(page.getByText('Platform Representative', { exact: true })).toBeVisible()
    await expect(getForm()).toContainText('Your Name')
    await expect(getForm()).toContainText('Contact Details')
    await expect(page.getByPlaceholder('Position/Title')).toBeVisible()

    await page.getByPlaceholder('Position/Title').fill('Sr Smoke Tester')
    await expect(getCountryCode()).toBeVisible()
    await expect(getPhoneNum()).toBeVisible()
    await expect(getPhoneExt()).toBeVisible()

    // phone#
    await getCountryCode().fill('1') // trigger the menu list
    await page.getByRole('option').first().click() // click first option in dropdown, should only be one menu open at a time
    await getPhoneNum().fill('(250) 508-7044')
    await expect(getEmail()).toBeVisible()
    await getEmail().fill('no@test.smoke')

    // finalize step 1
    await expect(page.getByRole('button', { name: 'Add Another Representative' })).toBeVisible()
    await expect(getNextBtn()).toBeVisible()
    await getNextBtn().click()
  })

  test('smoke test - Step 2', async () => {
    // check for step 2 content
    await expect(getH2()).toContainText('Step 2 - Business Details')
    await expect(page.getByTestId('business-details').getByRole('heading')).toContainText('Business Information')
    await page.getByPlaceholder('Legal Business Name').click()

    // fill in step 2 - business ID
    await page.getByPlaceholder('Legal Business Name').fill('Legal Smoke Test Business Name')
    await page.getByPlaceholder('Legal Business Name').press('Tab')
    await page.getByPlaceholder('Home Jurisdiction').fill('BC')
    await page.getByPlaceholder('Home Jurisdiction').press('Tab')
    await page.getByPlaceholder('Business Number (Optional)').fill('BN123456')
    await expect(getRadioGroup('Does the business have an').getByLabel('Yes')).toBeVisible()
    await expect(getRadioGroup('Does the business have an').getByLabel('No')).toBeVisible()
    await getRadioGroup('Does the business have an').getByLabel('Yes').check()
    await page.getByPlaceholder('CPBC Licence Number').click()
    await page.getByPlaceholder('CPBC Licence Number').fill('123456')

    // check and fill step 2 - business address
    await expect(getForm()).toContainText('Business Mailing Address')
    await expect(page.getByTestId('address-country')).toBeVisible()
    await expect(page.getByPlaceholder('Street Address', { exact: true })).toBeVisible()
    await expect(page.getByPlaceholder('Additional Street Address (')).toBeVisible()
    await expect(page.getByPlaceholder('City')).toBeVisible()
    await expect(page.getByTestId('address-region-input')).toBeVisible()
    await expect(page.getByPlaceholder('Code')).toBeVisible()
    await expect(page.getByTestId('address-location-description')).toBeVisible()

    // fill in Country for the CanadaPost API
    await page.getByTestId('address-country').click()
    await page.getByTestId('form-section-mailing').getByText('Canada').click()
    // fill in address for lookup
    await page.getByPlaceholder('Street Address', { exact: true }).click()
    await page.waitForTimeout(1000)
    await page.getByPlaceholder('Street Address', { exact: true }).fill('1234-33 Harbour Sq')
    await page.getByPlaceholder('City').click()
    await page.getByPlaceholder('City').fill('Toronto')
    await page.getByTestId('address-region-select').click()
    await page.getByText('Ontario').click()
    await page.getByPlaceholder('Postal Code').fill('M5J 2G2')
    // fill in optional fields
    await page.getByTestId('address-location-description').fill('smoke test location detail information')

    // check and fill attourney info
    await expect(getForm()).toContainText('Registered Office or Attorney for Service Address')

    const attorneyGroup = getRadioGroup('Does the business have a registered office or attorney for service in British')
    await expect(attorneyGroup.getByLabel('Yes')).toBeVisible()
    await expect(attorneyGroup.getByLabel('No')).toBeVisible()
    await attorneyGroup.getByLabel('No').check()

    // check and fill non-compliance email
    await expect(getForm()).toContainText('Notice of Non-Compliance')
    await expect(page.locator('#platform-business-noncompliance-email')).toBeVisible()
    await expect(page.locator('#platform-business-noncompliance-email-optional')).toBeVisible()
    await page.locator('#platform-business-noncompliance-email').click()
    await page.locator('#platform-business-noncompliance-email').fill('no@test.smoke.email')

    // check and fill takedown email
    await expect(getForm()).toContainText('Takedown Request')
    await expect(page.locator('#platform-business-takedown-email')).toBeVisible()
    await expect(page.locator('#platform-business-takedown-email-optional')).toBeVisible()
    await page.locator('#platform-business-takedown-email').click()
    await page.locator('#platform-business-takedown-email').fill('no@takedown.email')

    // finalize step 2
    await expect(getBackBtn()).toBeVisible()
    await expect(getNextBtn()).toBeVisible()
    await getNextBtn().click()
  })

  test('smoke test - Step 3', async () => {
    // check and fill step 3 - paltfrom info
    await expect(getH2()).toContainText('Step 3 - Platform Information')
    // platform brands
    await expect(getForm()).toContainText('Platform Brand')
    await expect(page.getByPlaceholder('Platform Brand Name')).toBeVisible()
    await expect(page.getByPlaceholder('Platform Brand Website')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Add a Platform Brand' })).toBeVisible()
    await page.getByPlaceholder('Platform Brand Name').click()
    await page.getByPlaceholder('Platform Brand Name').fill('Smoke Test Brand')
    await page.getByPlaceholder('Platform Brand Name').press('Tab')
    await page.getByPlaceholder('Platform Brand Website').fill('https://smoke.test.com')
    // platform size
    await expect(getForm()).toContainText('Platform Size')
    await expect(page.getByLabel('or more')).toBeVisible()
    await expect(page.getByLabel('Less than')).toBeVisible()
    await page.getByLabel('or more').check()

    // finalize step 3
    await expect(getBackBtn()).toBeVisible()
    await expect(getNextBtn()).toBeVisible()
    await getNextBtn().click()
  })

  // SKIPPING BECAUSE THIS WILL SUBMIT AN APPLICATION TO THE BACKEND
  // CONFIRM ITS OKAY TO SUBMIT TEST APPLICATION TO DEV DB
  test.skip('smoke test - Step 4', async () => {
    // check and fill step 4 - review and submit
    await expect(getH2()).toContainText('Step 4 - Review and Confirm')
    // Person completing the form
    await expect(page.getByTestId('platform-review-confirm')
      .locator('div').filter({ hasText: 'Person Completing Platform' }).first()).toBeVisible()
    //    await expect(page.locator('section')
    // .filter({ hasText: 'Person Completing Platform' }).getByRole('button')).toBeVisible();
    await expect(page.getByText('Contact Name').first()).toBeVisible()
    await expect(page.getByText('Phone Number').first()).toBeVisible()
    await expect(page.getByText('Email Address').first()).toBeVisible()
    await expect(page.getByTestId('platform-review-confirm')).toContainText('+1 (250) 508-7044')
    await expect(page.getByTestId('platform-review-confirm')).toContainText('no@test.smoke')

    // platform rep
    await expect(page.getByTestId('platform-review-confirm')
      .locator('div').filter({ hasText: 'Platform Representative' }).first()).toBeVisible()
    //    await expect(page.locator('section')
    // .filter({ hasText: 'Platform RepresentativeEditContact Name- Phone Number+- 2505087044 Email' })
    // .getByRole('button')).toBeVisible();
    await expect(page.getByText('Contact Name').nth(1)).toBeVisible()
    await expect(page.getByText('Phone Number').nth(1)).toBeVisible()
    await expect(page.getByText('Email Address').nth(1)).toBeVisible()
    await expect(page.getByText('Position/Title')).toBeVisible()
    await expect(page.getByText('Fax Number')).toBeVisible()
    await expect(page.getByTestId('platform-review-confirm')).toContainText('+1 (250) 508-7044')
    await expect(page.getByTestId('platform-review-confirm')).toContainText('no@test.smoke')
    await expect(page.getByTestId('platform-review-confirm')).toContainText('Sr Smoke Tester')

    // buisness info
    await expect(page.getByTestId('platform-review-confirm')
      .locator('div').filter({ hasText: 'Business Information' }).first()).toBeVisible()
    //    await expect(page.locator('section').filter({ hasText: 'Business InformationEditLegal' })
    // .getByRole('button')).toBeVisible();
    await expect(page.getByText('Legal Business Name')).toBeVisible()
    await expect(page.getByText('Attorney for Service Name')).toBeVisible()
    await expect(page.getByText('Notice of Non-Compliance')).toBeVisible()
    await expect(page.getByText('Home Jurisdiction')).toBeVisible()
    await expect(page.getByText('Registered Office or Attorney')).toBeVisible()
    await expect(page.getByText('Takedown Request')).toBeVisible()
    await expect(page.getByText('Business Number')).toBeVisible()
    await expect(page.getByText('Business Mailing Address')).toBeVisible()
    await expect(page.getByTestId('platform-review-confirm')).toContainText('Legal Smoke Test Business Name')
    await expect(page.getByTestId('platform-review-confirm')).toContainText('no@test.smoke.email')
    await expect(page.getByTestId('platform-review-confirm')).toContainText('no@takedown.email')
    await expect(page.getByTestId('platform-review-confirm')).toContainText('BN123456')
    await expect(page.getByTestId('address-display')).toContainText('1234-33 Harbour Sq')

    // platform info
    await expect(page.getByRole('heading', { name: 'Platform Information' })).toBeVisible()
    //    await expect(page.locator('section')
    // .filter({ hasText: 'Platform InformationEditPlatform Brand NameSmoke Test BrandPlatform Brand' })
    // .getByRole('button')).toBeVisible();
    await expect(page.getByText('Platform Brand Name')).toBeVisible()
    await expect(page.getByText('Platform Brand Website')).toBeVisible()
    await expect(page.getByText('Platform Size')).toBeVisible()
    await expect(page.getByTestId('platform-review-confirm')).toContainText('Smoke Test Brand')
    await expect(page.getByTestId('platform-review-confirm')).toContainText('https://smoke.test.com')
    await expect(page.getByTestId('platform-review-confirm')).toContainText('Greater than 1,000 listings')

    // disclaimers
    await expect(page.getByRole('heading', { name: 'Certify' })).toBeVisible()
    await expect(page.getByLabel('I confirm that the')).toBeVisible()
    await expect(page.getByLabel('I confirm agreement to delist')).toBeVisible()
    await page.getByLabel('I confirm that the').check()
    await page.getByLabel('I confirm agreement to delist').check()

    // finalize and submit
    await expect(page.getByRole('button', { name: 'Back' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Submit & Pay' })).toBeVisible()
    await page.getByRole('button', { name: 'Submit & Pay' }).click()
  })
})
