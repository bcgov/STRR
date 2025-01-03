/* eslint-disable max-len */
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { test, expect, type Page } from '@playwright/test'
import { config as dotenvConfig } from 'dotenv'
import { getFakeBusinessDetails, getFakeContactDetails, getFakeStrataDetails } from './test-utils/faker'

const currentDir = dirname(fileURLToPath(import.meta.url))
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

// Strata allows bcsc and bceid
const loginMethods = [LoginSource.BCSC, LoginSource.BCEID]

loginMethods.forEach((loginMethod) => {
  test.describe(`STRR Strata Smoke Test - ${loginMethod}`, () => {
    const completingParty = getFakeContactDetails()
    const primaryRep = getFakeContactDetails()
    const secondaryRep = getFakeContactDetails()
    const businessDetails = getFakeBusinessDetails()
    const strataDetails = getFakeStrataDetails()

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
      page.waitForURL('**/strata-hotel/**') // should be redirect to application or dashboard
    })

    test('smoke test - Application Step 1', async () => {
      page.goto('./en-CA/strata-hotel/application') // go to application even if user already has applications
      page.waitForURL('**/strata-hotel/application')
      // check for step 1 content
      await expect(page.getByTestId('h1')).toContainText('Short-Term Rental Strata-Titled Hotel or Motel Application')
      await expect(getH2()).toContainText('Step 1 - Contact Information')

      // fill in Step 1 details
      await page.getByTestId('completing-party-radio-group').getByText('No').check() // select not platform rep

      // fill out completing party section
      const completingPartySection = page.locator('section').filter({ hasText: 'Person Completing Strata-Titled Hotel or Motel Application' })
      await completingPartySection.getByTestId('phone-countryCode').fill(completingParty.phone.countryCode!)
      await completingPartySection.getByRole('option').first().click()
      await completingPartySection.getByTestId('phone-number').fill(completingParty.phone.number)
      await completingPartySection.getByTestId('phone-extension').fill(completingParty.phone.extension!)
      await completingPartySection.getByTestId('platform-completing-party-party-email').fill(completingParty.emailAddress)

      // fill out primary rep section
      const primaryRepSection = page.locator('section').filter({ hasText: 'Strata-Titled Hotel or Motel Representative' }).first()
      await primaryRepSection.getByTestId('platform-primary-rep-first-name').fill(primaryRep.firstName!) // TODO: update test ids
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
      await expect(page.getByText('Secondary Strata-Titled Hotel or Motel Representative')).toBeVisible()
      const secondaryRepSection = page.locator('section').filter({ hasText: 'Secondary Strata-Titled Hotel or Motel Representative' })
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

      // fill in step 2 - business info
      await page.getByTestId('strata-business-legal-name').fill(businessDetails.legalName)
      await page.getByTestId('strata-business-home-jur').fill(businessDetails.homeJurisdiction)
      await page.getByTestId('strata-business-number').fill(businessDetails.businessNumber)

      // fill in business address - address complete doesnt seem to be working here
      await page.getByTestId('strata-business-address-country').click()
      await page.getByRole('option', { name: 'Canada' }).click()
      await page.getByTestId('strata-business-address-street').fill(businessDetails.mailingAddress.street)
      await page.getByTestId('mailingAddress.city').fill(businessDetails.mailingAddress.city)
      await page.getByTestId('address-region-select').click()
      await page.getByRole('option', { name: businessDetails.mailingAddress.region }).click()
      await page.getByTestId('mailingAddress.postalCode').fill(businessDetails.mailingAddress.postalCode)
      await page.getByTestId('address-location-description').fill(businessDetails.mailingAddress.locationDescription)

      // check yes for attourney info
      await page.getByTestId('strata-business-hasRegOffAtt').getByText('Yes').check()
      await page.getByTestId('strata-att-for-svc-name').fill(businessDetails.regOfficeOrAtt.attorneyName)
      await page.getByTestId('strata-registered-office-address-street').fill(businessDetails.regOfficeOrAtt.mailingAddress.street)
      await page.getByTestId('regOfficeOrAtt.mailingAddress.city').fill(businessDetails.regOfficeOrAtt.mailingAddress.city)
      await page.getByTestId('regOfficeOrAtt.mailingAddress.postalCode').fill(businessDetails.regOfficeOrAtt.mailingAddress.postalCode)

      // finalize step 2
      page.getByRole('button', { name: 'Add Strata Hotel Information', exact: true }).click()
      await expect(getH2()).toContainText('Step 3 - Strata-Titled Hotel or Motel Information')
    })

    test('smoke test - Application Step 3', async () => {
      // check and fill step 3 - strata info
      await expect(getH2()).toContainText('Step 3 - Strata-Titled Hotel or Motel Information')

      const strataDetailsSection = page.locator('section').filter({ hasText: 'Strata-Titled Hotel or Motel Details' })
      await strataDetailsSection.getByTestId('strata-brand-name').fill(strataDetails.brand.name)
      await strataDetailsSection.getByTestId('strata-brand-site').fill(strataDetails.brand.website)
      await strataDetailsSection.getByTestId('strata-details-numberOfUnits').fill(strataDetails.numberOfUnits!.toString())

      const strataBuildingsSection = page.locator('section').filter({ hasText: 'Strata Hotel Buildings' })
      // fill out primary building
      await strataBuildingsSection.getByTestId('strata-primary-address-street').fill(strataDetails.location.street)
      await strataBuildingsSection.getByTestId('location.city').fill(strataDetails.location.city)
      await strataBuildingsSection.getByTestId('location.postalCode').fill(strataDetails.location.postalCode)
      await strataBuildingsSection.getByTestId('address-location-description').first().fill(strataDetails.location.locationDescription)
      // fill out secondary building
      await strataBuildingsSection.getByRole('button', { name: 'Add a Building', exact: true }).click()
      await strataBuildingsSection.getByTestId('strata-building-0-street').fill(strataDetails.buildings[0]!.street)
      await strataBuildingsSection.getByTestId('buildings.0city').fill(strataDetails.buildings[0]!.city)
      await strataBuildingsSection.getByTestId('buildings.0postalCode').fill(strataDetails.buildings[0]!.postalCode)
      await strataBuildingsSection.getByTestId('address-location-description').nth(1).fill(strataDetails.buildings[0]!.locationDescription)
      // upload supporting document
      await page.locator('input[type="file"]').setInputFiles(join(currentDir, '../fake-files/fake-strata-hotel-docs.pdf'))

      // finalize step 3
      page.getByRole('button', { name: 'Review and Confirm', exact: true }).click()
      await expect(getH2()).toContainText('Step 4 - Review and Confirm')
    })

    test('smoke test - Application Step 4', async () => {
      // check and fill step 4 - review and submit
      await expect(getH2()).toContainText('Step 4 - Review and Confirm')
      // Person completing the form
      const completingPartySection = page.locator('section').filter({ hasText: 'Person Completing Strata-Titled Hotel or Motel Application' })
      await expect(completingPartySection).toContainText(completingParty.firstName!)
      await expect(completingPartySection).toContainText(completingParty.lastName!)
      await expect(completingPartySection).toContainText(completingParty.phone.number.replace(/\D/g, '')) // get only numerical values
      await expect(completingPartySection).toContainText(completingParty.emailAddress)

      // primary rep review
      const primaryRepSection = page.locator('section').filter({ hasText: 'Strata-Titled Hotel or Motel Representative' }).first()
      await expect(primaryRepSection).toContainText(primaryRep.firstName!)
      await expect(primaryRepSection).toContainText(primaryRep.lastName!)
      await expect(primaryRepSection).toContainText(primaryRep.phone.number.replace(/\D/g, ''))
      await expect(primaryRepSection).toContainText(primaryRep.emailAddress)
      await expect(primaryRepSection).toContainText(primaryRep.position)
      await expect(primaryRepSection).toContainText(primaryRep.faxNumber!)

      // secondary rep review
      const secondaryRepSection = page.locator('section').filter({ hasText: 'Secondary Strata-Titled Hotel or Motel Representative' })
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
      await expect(businessInfoSection).toContainText(businessDetails.mailingAddress.street)
      await expect(businessInfoSection).toContainText(businessDetails.mailingAddress.city)
      await expect(businessInfoSection).toContainText(businessDetails.regOfficeOrAtt.attorneyName)
      await expect(businessInfoSection).toContainText(businessDetails.regOfficeOrAtt.mailingAddress.street)
      await expect(businessInfoSection).toContainText(businessDetails.regOfficeOrAtt.mailingAddress.city)

      // strata details section
      const strataDetailsSection = page.locator('section').filter({ hasText: 'Strata-Titled Hotel or Motel Details' })
      await expect(strataDetailsSection).toContainText(strataDetails.brand.name)
      await expect(strataDetailsSection).toContainText(strataDetails.brand.website)
      await expect(strataDetailsSection).toContainText(strataDetails.numberOfUnits!.toString())
      await expect(strataDetailsSection).toContainText(strataDetails.location.street)
      await expect(strataDetailsSection).toContainText(strataDetails.location.city)
      await expect(strataDetailsSection).toContainText(strataDetails.location.postalCode)
      await expect(strataDetailsSection).toContainText(strataDetails.buildings[0]!.street)
      await expect(strataDetailsSection).toContainText(strataDetails.buildings[0]!.city)
      await expect(strataDetailsSection).toContainText(strataDetails.buildings[0]!.postalCode)
      await expect(strataDetailsSection).toContainText('fake-strata-hotel-docs.pdf')

      // Check certify checkbox
      await page.getByTestId('confirmation-checkbox').check()

      // finalize and submit
      await page.getByRole('button', { name: 'Submit & Pay' }).click()
      page.waitForURL('**/strata-hotel/dashboard/**')
      await expect(page.getByTestId('h1')).toContainText(strataDetails.brand.name)
      await expect(page).toHaveURL(/.*\/strata-hotel\/dashboard\/.*/)
    })

    test('smoke test - Dashboard Details View', async () => {
      page.waitForURL('**/strata-hotel/dashboard/**')
      await expect(page.getByTestId('h1')).toContainText(strataDetails.brand.name)
      await expect(page).toHaveURL(/.*\/strata-hotel\/dashboard\/.*/)

      // assert header details
      const detailsHeader = page.getByTestId('connect-details-header')
      await expect(detailsHeader).toContainText(strataDetails.brand.name)
      const urlParts = strataDetails.brand.website.match(/^(https?:\/\/)(www\.)?(.+?(?=(\/)|$))/) // remove https from website name and trailing slashes
      await expect(detailsHeader).toContainText(urlParts![3]!)
      await expect(detailsHeader).toContainText(strataDetails.numberOfUnits!.toString())
      await expect(detailsHeader).toContainText('Pending Approval')
      await expect(detailsHeader.getByRole('button', { name: 'Download Receipt', exact: true })).toBeVisible()

      // assert todos
      const todoSection = page.locator('section').filter({ hasText: 'To Do' })
      await expect(todoSection).toContainText('You don’t have anything to do yet')
      await expect(todoSection).toContainText('Filings that require your attention will appear here')

      // registering business section
      const regBusSection = page.locator('section').filter({ hasText: 'Registering Business' })
      await expect(regBusSection).toContainText(businessDetails.legalName)
      await expect(regBusSection).toContainText(businessDetails.mailingAddress.street)
      await expect(regBusSection).toContainText(businessDetails.mailingAddress.postalCode)
      await expect(regBusSection).toContainText(businessDetails.homeJurisdiction)
      await expect(regBusSection).toContainText(businessDetails.businessNumber)

      // Registered Office or Attorney for Service section
      const regOfficeOrAttSection = page.locator('section').filter({ hasText: 'Registered Office or Attorney for Service' })
      await expect(regOfficeOrAttSection).toContainText(businessDetails.regOfficeOrAtt.attorneyName)
      await expect(regOfficeOrAttSection).toContainText(businessDetails.regOfficeOrAtt.mailingAddress.street)
      await expect(regOfficeOrAttSection).toContainText(businessDetails.regOfficeOrAtt.mailingAddress.postalCode)

      // docs section
      const docsSection = page.locator('section').filter({ hasText: 'Supporting Documentation' })
      await expect(docsSection).toContainText('fake-strata-hotel-docs.pdf')

      // completing party section
      const compPartySection = page.locator('section').filter({ hasText: 'Completing Party' })
      await expect(compPartySection).toContainText(completingParty.emailAddress)

      // representatives sections
      const repSection = page.locator('section').filter({ hasText: 'Representatives' })
      await expect(repSection).toContainText(primaryRep.firstName!)
      await expect(repSection).toContainText(primaryRep.lastName)
      await expect(repSection).toContainText(primaryRep.position)
      await expect(repSection).toContainText(primaryRep.emailAddress)
      await expect(repSection).toContainText(secondaryRep.firstName!)
      await expect(repSection).toContainText(secondaryRep.lastName)
      await expect(repSection).toContainText(secondaryRep.position)
      await expect(repSection).toContainText(secondaryRep.emailAddress)

      // buildings sections
      const buildingsSection = page.locator('section').filter({ hasText: 'Buildings' })
      await expect(buildingsSection).toContainText(strataDetails.location.street)
      await expect(buildingsSection).toContainText(strataDetails.location.postalCode)
      await expect(buildingsSection).toContainText('Building 2')
      await expect(buildingsSection).toContainText(strataDetails.buildings[0]!.street)
      await expect(buildingsSection).toContainText(strataDetails.buildings[0]!.postalCode)
    })

    test('smoke test - Dashboard List View', async () => {
      page.waitForURL('**/strata-hotel/dashboard/**')
      await expect(page.getByTestId('h1')).toContainText(strataDetails.brand.name)
      await expect(page).toHaveURL(/.*\/strata-hotel\/dashboard\/.*/)

      // go back to list view
      await page.getByRole('link', { name: 'My STR Strata-Titled Hotel or Motel Registry' }).click()
      await expect(page.getByTestId('h1')).toContainText('My Short-Term Rental Registry')
      const listSection = page.locator('section').filter({ hasText: 'My Strata-titled Hotel and Motel List' })
      expect(listSection).toContainText(strataDetails.brand.name)
    })
  })
})
