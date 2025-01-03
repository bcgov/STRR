/* eslint-disable max-len */
import { test, expect, type Page } from '@playwright/test'
import { config as dotenvConfig } from 'dotenv'
import { getFakeBusinessDetails, getFakeContactDetails, getFakePlatformDetails } from './test-utils/faker'
// load default env
dotenvConfig()

enum LoginSource {
  BCSC = 'BCSC',
  BCEID = 'BCEID'
}

async function authSetup (loginMethod: LoginSource, page: Page) {
  const baseURL = process.env.NUXT_BASE_URL!

  await page.goto(baseURL + 'en-CA/auth/login')

  if (loginMethod === LoginSource.BCSC) {
    const username = process.env.PLAYWRIGHT_TEST_BCSC_USERNAME!
    const password = process.env.PLAYWRIGHT_TEST_BCSC_PASSWORD!
    await page.getByRole('button', { name: 'Continue with BC Services Card' }).click()
    await page.getByLabel('Log in with Test with').click()
    await page.getByLabel('Email or username').fill(username)
    await page.getByLabel('Password').fill(password)
    await page.getByRole('button', { name: 'Continue' }).click()
  } else if (loginMethod === LoginSource.BCEID) {
    const username = process.env.PLAYWRIGHT_TEST_BCEID_USERNAME!
    const password = process.env.PLAYWRIGHT_TEST_BCEID_PASSWORD!
    await page.getByRole('button', { name: 'Continue with BCeID' }).click()
    await page.locator('#user').fill(username)
    await page.getByLabel('Password').fill(password)
    await page.getByRole('button', { name: 'Continue' }).click()
  }

  await page.waitForURL(baseURL + '**')
  await page.context().storageState({ path: 'tests/e2e/.auth/user.json' })
}

// Platforms allows bcsc and bceid
const loginMethods = [LoginSource.BCSC, LoginSource.BCEID]

loginMethods.forEach((loginMethod) => {
  test.describe(`STRR Platform Smoke Test - ${loginMethod}`, () => {
    const completingParty = getFakeContactDetails()
    const primaryRep = getFakeContactDetails()
    const secondaryRep = getFakeContactDetails()
    const businessDetails = getFakeBusinessDetails()
    const platformDetails = getFakePlatformDetails()

    // this will fail if these options are ever changed
    const listingSizeMap = {
      '1000 or more': 'Major (1000+ listings)',
      '250-999': 'Medium (250-999 listings)',
      '249 or less': 'Minor (under 250 listings)'
    }

    let page: Page

    // this is required to use saved user auth state
    // do not use this in tests where user should be logged out
    // test.use({ storageState: 'tests/e2e/.auth/user.json' })

    test.beforeAll(async ({ browser }) => {
      const context = await browser.newContext({ storageState: undefined }) // start fresh
      page = await context.newPage()

      // get auth state
      await authSetup(loginMethod, page)

      await page.goto('./') // start at home page // uses base url set in playwright config
    })

    const getH2 = () => page.getByTestId('h2').first()

    test('smoke test - Select Account', async () => {
      page.goto('./en-CA/auth/account/choose-existing') // should be redirected to select account page
      await expect(page.getByTestId('h1')).toContainText('Select Account')

      if (loginMethod === LoginSource.BCSC) {
        const accountName = process.env.PLAYWRIGHT_TEST_BCSC_PREMIUM_ACCOUNT_NAME
        await page.getByLabel(`Use this Account, ${accountName}`).click() // select premium account
      } else {
        const accountName = process.env.PLAYWRIGHT_TEST_BCEID_PREMIUM_ACCOUNT_NAME
        await page.getByLabel(`Use this Account, ${accountName}`).click() // select premium account
      }
      page.waitForURL('**/platform/**') // should be redirect to application or dashboard
    })

    test('smoke test - Application Step 1', async () => {
      page.goto('./en-CA/platform/application?override=true') // go to application even if user already has applications
      page.waitForURL('**/platform/application?**')
      // check for step 1 content
      await expect(page.getByTestId('h1')).toContainText('Short-Term Rental Platform Service Provider Application')
      await expect(getH2()).toContainText('Step 1 - Contact Information')

      // fill in Step 1 details
      await page.getByTestId('completing-party-radio-group').getByText('No').check() // select not platform rep

      // fill out completing party section
      const completingPartySection = page.locator('section').filter({ hasText: 'Person Completing Platform Service Provider Application' })
      await completingPartySection.getByTestId('phone-countryCode').fill(completingParty.phone.countryCode!)
      await completingPartySection.getByRole('option').first().click()
      await completingPartySection.getByTestId('phone-number').fill(completingParty.phone.number)
      await completingPartySection.getByTestId('phone-extension').fill(completingParty.phone.extension!)
      await completingPartySection.getByTestId('platform-completing-party-party-email').fill(completingParty.emailAddress)

      // fill out primary rep section
      const primaryRepSection = page.locator('section').filter({ hasText: 'Platform Service Provider Representative' }).first()
      await primaryRepSection.getByTestId('platform-primary-rep-first-name').fill(primaryRep.firstName!)
      await primaryRepSection.getByTestId('platform-primary-rep-middle-name').fill(primaryRep.middleName!)
      await primaryRepSection.getByTestId('platform-primary-rep-last-name').fill(primaryRep.lastName)
      await primaryRepSection.getByTestId('platform-primary-rep-position').fill(primaryRep.position)
      await primaryRepSection.getByTestId('phone-countryCode').fill(primaryRep.phone.countryCode!)
      await primaryRepSection.getByRole('option').first().click()
      const primaryRepNumberField = primaryRepSection.getByTestId('phone-number')
      await expect(primaryRepNumberField).toBeVisible()
      await expect(primaryRepNumberField).toBeEnabled()
      await primaryRepNumberField.fill(primaryRep.phone.number)
      await primaryRepSection.getByTestId('phone-extension').fill(primaryRep.phone.extension!)
      await primaryRepSection.getByTestId('platform-primary-rep-fax-number').fill(primaryRep.faxNumber!)
      await primaryRepSection.getByTestId('platform-primary-rep-party-email').fill(primaryRep.emailAddress)

      // fill out secondary rep section
      page.getByRole('button', { name: 'Add Another Representative' }).click()
      await expect(page.getByText('Secondary Platform Service Provider Representative')).toBeVisible()
      const secondaryRepSection = page.locator('section').filter({ hasText: 'Secondary Platform Service Provider Representative' })
      await secondaryRepSection.getByTestId('platform-secondary-rep-first-name').fill(secondaryRep.firstName!)
      await secondaryRepSection.getByTestId('platform-secondary-rep-middle-name').fill(secondaryRep.middleName!)
      await secondaryRepSection.getByTestId('platform-secondary-rep-last-name').fill(secondaryRep.lastName)
      await secondaryRepSection.getByTestId('platform-secondary-rep-position').fill(secondaryRep.position)
      await secondaryRepSection.getByTestId('phone-countryCode').fill(secondaryRep.phone.countryCode!)
      await secondaryRepSection.getByRole('option').first().click()
      const secondaryRepNumberField = secondaryRepSection.getByTestId('phone-number')
      await expect(secondaryRepNumberField).toBeVisible()
      await expect(secondaryRepNumberField).toBeEnabled()
      await secondaryRepNumberField.fill(secondaryRep.phone.number)
      await secondaryRepSection.getByTestId('phone-extension').fill(secondaryRep.phone.extension!)
      await secondaryRepSection.getByTestId('platform-secondary-rep-fax-number').fill(secondaryRep.faxNumber!)
      await secondaryRepSection.getByTestId('platform-secondary-rep-party-email').fill(secondaryRep.emailAddress)

      // finalize step 1
      page.getByRole('button', { name: 'Add Business Details', exact: true }).click()
      await expect(getH2()).toContainText('Step 2 - Business Details')
    })

    test('smoke test - Application Step 2', async () => {
      // check for step 2 content
      await expect(getH2()).toContainText('Step 2 - Business Details')
      await expect(page.getByTestId('business-details').getByRole('heading')).toContainText('Business Information')

      // fill in step 2 - business ID
      await page.getByTestId('platform-business-legal-name').fill(businessDetails.legalName)
      await page.getByTestId('platform-business-home-jur').fill(businessDetails.homeJurisdiction)
      await page.getByTestId('platform-business-number').fill(businessDetails.businessNumber)
      await page.getByTestId('platform-business-hasCpbc').getByText('Yes').check()
      await page.getByTestId('platform-cpbc').fill(businessDetails.cpbcLicenceNumber)

      // fill in business address - address complete doesnt seem to be working here
      await page.getByTestId('platform-business-address-country').click()
      await page.getByRole('option', { name: 'Canada' }).click()
      await page.getByTestId('platform-business-address-street').fill(businessDetails.mailingAddress.street)
      await page.getByTestId('mailingAddress.city').fill(businessDetails.mailingAddress.city)
      await page.getByTestId('address-region-select').click()
      await page.getByRole('option', { name: businessDetails.mailingAddress.region }).click()
      await page.getByTestId('mailingAddress.postalCode').fill(businessDetails.mailingAddress.postalCode)
      await page.getByTestId('address-location-description').fill(businessDetails.mailingAddress.locationDescription)

      // check yes for attourney info
      await page.getByTestId('platform-business-hasRegOffAtt').getByText('Yes').check()
      await page.getByTestId('platform-att-for-svc-name').fill(businessDetails.regOfficeOrAtt.attorneyName)
      await page.getByTestId('platform-registered-office-address-street').fill(businessDetails.regOfficeOrAtt.mailingAddress.street)
      await page.getByTestId('regOfficeOrAtt.mailingAddress.city').fill(businessDetails.regOfficeOrAtt.mailingAddress.city)
      await page.getByTestId('regOfficeOrAtt.mailingAddress.postalCode').fill(businessDetails.regOfficeOrAtt.mailingAddress.postalCode)

      // check and fill non-compliance email
      await page.getByTestId('platform-business-noncompliance-email').fill(businessDetails.nonComplianceEmail)
      await page.getByTestId('platform-business-noncompliance-email-optional').fill(businessDetails.nonComplianceEmailOptional)

      // check and fill takedown email
      await page.getByTestId('platform-business-takedown-email').fill(businessDetails.takeDownEmail)
      await page.getByTestId('platform-business-takedown-email-optional').fill(businessDetails.takeDownEmailOptional)

      // finalize step 2
      page.getByRole('button', { name: 'Add Provider Information', exact: true }).click()
      await expect(getH2()).toContainText('Step 3 - Provider Information')
    })

    test('smoke test - Application Step 3', async () => {
      // check and fill step 3 - platform info
      await expect(getH2()).toContainText('Step 3 - Provider Information')
      // platform brands
      for (const [index, brand] of platformDetails.brands.entries()) {
        await page.getByTestId('platform-brand-name-' + index).fill(brand.name)
        await page.getByTestId('platform-brand-site-' + index).fill(brand.website)

        if (index < platformDetails.brands.length - 1) {
          await page.getByRole('button', { name: 'Add a Platform', exact: true }).click()
        }
      }

      // platform size
      await page.getByTestId('platform-listingSize').getByText(platformDetails.listingSize).check()

      // finalize step 3
      page.getByRole('button', { name: 'Review and Confirm', exact: true }).click()
      await expect(getH2()).toContainText('Step 4 - Review and Confirm')
    })

    test('smoke test - Application Step 4', async () => {
      // check and fill step 4 - review and submit
      await expect(getH2()).toContainText('Step 4 - Review and Confirm')
      // Person completing the form
      const completingPartySection = page.locator('section').filter({ hasText: 'Person Completing Platform Service Provider Application' })
      await expect(completingPartySection).toContainText(completingParty.firstName!)
      await expect(completingPartySection).toContainText(completingParty.lastName!)
      await expect(completingPartySection).toContainText(completingParty.phone.number.replace(/\D/g, '')) // get only numerical values
      await expect(completingPartySection).toContainText(completingParty.emailAddress)

      // primary rep review
      const primaryRepSection = page.locator('section').filter({ hasText: 'Platform Service Provider Representative' }).first()
      await expect(primaryRepSection).toContainText(primaryRep.firstName!)
      await expect(primaryRepSection).toContainText(primaryRep.lastName!)
      await expect(primaryRepSection).toContainText(primaryRep.phone.number.replace(/\D/g, ''))
      await expect(primaryRepSection).toContainText(primaryRep.emailAddress)
      await expect(primaryRepSection).toContainText(primaryRep.position)
      await expect(primaryRepSection).toContainText(primaryRep.faxNumber!)

      // secondary rep review
      const secondaryRepSection = page.locator('section').filter({ hasText: 'Secondary Platform Service Provider Representative' })
      await expect(secondaryRepSection).toContainText(secondaryRep.firstName!)
      await expect(secondaryRepSection).toContainText(secondaryRep.lastName!)
      await expect(secondaryRepSection).toContainText(secondaryRep.phone.number.replace(/\D/g, ''))
      await expect(secondaryRepSection).toContainText(secondaryRep.emailAddress)
      await expect(secondaryRepSection).toContainText(secondaryRep.position)
      await expect(secondaryRepSection).toContainText(secondaryRep.faxNumber!)

      // business info section
      const businessInfoSection = page.locator('section').filter({ hasText: 'Business Information' })
      await expect(businessInfoSection).toContainText(businessDetails.legalName)
      await expect(businessInfoSection).toContainText(businessDetails.homeJurisdiction)
      await expect(businessInfoSection).toContainText(businessDetails.businessNumber)
      await expect(businessInfoSection).toContainText(businessDetails.cpbcLicenceNumber)
      await expect(businessInfoSection).toContainText(businessDetails.mailingAddress.street)
      await expect(businessInfoSection).toContainText(businessDetails.mailingAddress.city)
      await expect(businessInfoSection).toContainText(businessDetails.regOfficeOrAtt.attorneyName)
      await expect(businessInfoSection).toContainText(businessDetails.regOfficeOrAtt.mailingAddress.street)
      await expect(businessInfoSection).toContainText(businessDetails.regOfficeOrAtt.mailingAddress.city)
      await expect(businessInfoSection).toContainText(businessDetails.takeDownEmail)
      await expect(businessInfoSection).toContainText(businessDetails.takeDownEmailOptional)
      await expect(businessInfoSection).toContainText(businessDetails.nonComplianceEmail)
      await expect(businessInfoSection).toContainText(businessDetails.nonComplianceEmailOptional)

      // platform info section
      const platformInfoSection = page.locator('section').filter({ hasText: 'Platform Details' })
      for (const brand of platformDetails.brands) {
        await expect(platformInfoSection).toContainText(brand.name)
        await expect(platformInfoSection).toContainText(brand.website)
      }

      // @ts-expect-error - listing size doesnt match map/record
      await expect(platformInfoSection).toContainText(listingSizeMap[platformDetails.listingSize])

      // Check certify checkbox
      await page.getByTestId('confirmation-checkbox').check()

      // finalize and submit
      await page.getByRole('button', { name: 'Submit & Pay' }).click()
      page.waitForURL('**/platform/dashboard/**')
      await expect(page.getByTestId('h1')).toContainText(businessDetails.legalName)
      await expect(page).toHaveURL(/.*\/platform\/dashboard$/)
    })

    test('smoke test - Dashboard', async () => {
      page.waitForURL('**/platform/dashboard/**')
      await expect(page.getByTestId('h1')).toContainText(businessDetails.legalName)
      await expect(page).toHaveURL(/.*\/platform\/dashboard$/)

      // assert header details
      const detailsHeader = page.getByTestId('connect-details-header')
      await expect(detailsHeader).toContainText(businessDetails.legalName)
      // @ts-expect-error - listing size doesnt match map/record
      await expect(detailsHeader).toContainText(listingSizeMap[platformDetails.listingSize])
      await expect(detailsHeader).toContainText(businessDetails.homeJurisdiction)
      await expect(detailsHeader).toContainText('Pending Approval')
      await expect(detailsHeader).toContainText('Business Number: ' + businessDetails.businessNumber)
      await expect(detailsHeader).toContainText('Consumer Protection BC Number: ' + businessDetails.cpbcLicenceNumber)
      await expect(detailsHeader.getByRole('button', { name: 'Download Receipt', exact: true })).toBeVisible()

      // assert todos
      const todoSection = page.locator('section').filter({ hasText: 'To Do' })
      await expect(todoSection).toContainText('You don’t have anything to do yet')
      await expect(todoSection).toContainText('Filings that require your attention will appear here')

      // platform names section
      const sectionLabel = platformDetails.brands.length > 1 ? 'Platform Names' : 'Platform Name'
      const platformNamesSection = page.locator('section').filter({ hasText: sectionLabel })
      for (const brand of platformDetails.brands) {
        await expect(platformNamesSection).toContainText(brand.name)
        await expect(platformNamesSection).toContainText(brand.website)
      }

      // addresses section
      const addressesSection = page.locator('section').filter({ hasText: 'Addresses' })
      await expect(addressesSection).toContainText(businessDetails.mailingAddress.street)
      await expect(addressesSection).toContainText(businessDetails.regOfficeOrAtt.attorneyName)
      await expect(addressesSection).toContainText(businessDetails.regOfficeOrAtt.mailingAddress.street)
      await expect(addressesSection).toContainText(businessDetails.nonComplianceEmail)
      await expect(addressesSection).toContainText(businessDetails.nonComplianceEmailOptional)
      await expect(addressesSection).toContainText(businessDetails.takeDownEmail)
      await expect(addressesSection).toContainText(businessDetails.takeDownEmailOptional)

      // representatives section
      const repSection = page.locator('section').filter({ hasText: 'Representatives' })
      await expect(repSection).toContainText(primaryRep.firstName!)
      await expect(repSection).toContainText(primaryRep.lastName)
      await expect(repSection).toContainText(primaryRep.position)
      await expect(repSection).toContainText(primaryRep.emailAddress)
      await expect(repSection).toContainText(secondaryRep.firstName!)
      await expect(repSection).toContainText(secondaryRep.lastName)
      await expect(repSection).toContainText(secondaryRep.position)
      await expect(repSection).toContainText(secondaryRep.emailAddress)

      // completing party section
      const compPArtySection = page.locator('section').filter({ hasText: 'Completing Party' })
      await expect(compPArtySection).toContainText(completingParty.emailAddress)
    })
  })
})
