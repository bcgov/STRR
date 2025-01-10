import { expect, type Page } from '@playwright/test'
import { config as dotenvConfig } from 'dotenv'
/* eslint-disable max-len */
import { LoginSource } from '../enums/login-source'
import { generateOTP } from './generate-otp'
// load default env
dotenvConfig()

export async function completeLogin (page: Page, loginMethod: LoginSource) {
  const baseUrl = process.env.NUXT_BASE_URL!
  const username = loginMethod === LoginSource.BCSC
    ? process.env.PLAYWRIGHT_TEST_BCSC_USERNAME!
    : process.env.PLAYWRIGHT_TEST_BCEID_USERNAME!
  const password = loginMethod === LoginSource.BCSC
    ? process.env.PLAYWRIGHT_TEST_BCSC_PASSWORD!
    : process.env.PLAYWRIGHT_TEST_BCEID_PASSWORD!
  const environment = process.env.NUXT_ENVIRONMENT_HEADER!.toLowerCase()
  const otpSecret = process.env.PLAYWRIGHT_TEST_BCEID_OTP_SECRET!

  await page.goto('en-CA/auth/login')

  if (loginMethod === LoginSource.BCSC) {
    await page.getByRole('button', { name: 'Continue with BC Services Card' }).click()
    await page.getByLabel('Log in with Test with').click()
    await page.getByLabel('Email or username').fill(username)
    await page.getByLabel('Password').fill(password)
    await page.getByRole('button', { name: 'Continue' }).click()
  } else if (loginMethod === LoginSource.BCEID) {
    await page.getByRole('button', { name: 'Continue with BCeID' }).click()
    await page.locator('#user').fill(username)
    await page.getByLabel('Password').fill(password)
    await page.getByRole('button', { name: 'Continue' }).click()
    if (environment.toLowerCase() !== 'development') {
      const accountActivity = page.getByText('To complete login with your')
      if (accountActivity) {
        await page.getByRole('button', { name: 'Continue' }).click()
      }
      const otp = generateOTP(otpSecret)
      await page.getByLabel('One-time code').click()
      await page.getByLabel('One-time code').fill(otp)
      await page.getByRole('button', { name: 'Sign In' }).click()
    }
  }

  await page.waitForURL(baseUrl + '**')
}

export async function chooseAccount (page: Page, loginMethod: LoginSource) {
  await page.goto('./en-CA/auth/account/choose-existing', { waitUntil: 'networkidle' })

  await expect(page.getByTestId('h1')).toContainText('Existing Account Found')

  if (loginMethod === LoginSource.BCSC) {
    const accountName = process.env.PLAYWRIGHT_TEST_BCSC_PREMIUM_ACCOUNT_NAME
    await page.getByLabel(`Use this Account, ${accountName}`).click() // select premium account
  } else {
    const accountName = process.env.PLAYWRIGHT_TEST_BCEID_PREMIUM_ACCOUNT_NAME
    await page.getByLabel(`Use this Account, ${accountName}`).click() // select premium account
  }
  page.waitForURL('**/dashboard/**') // should be redirect to dashboard
}

export const fillStep2 = async (
  page: Page,
  completingParty: HostOwner,
  cohost: HostOwner,
  propertyManager: HostOwner
) => {
  // fill out completing party
  await page.getByRole('button', { name: 'Add an Individual', exact: true }).click()
  await expect(page.locator('section').filter({ hasText: 'Add an Individual' })).toBeVisible()
  const compPartySection = page.locator('section').filter({ hasText: 'Add an Individual' })
  // add host role birth date and SIN
  await compPartySection.locator('input[type="checkbox"][name="isCompParty"]').check()
  await compPartySection.getByTestId('host-owner-preferred-name').fill(completingParty.preferredName!)
  await compPartySection.locator('input[type="radio"][value="HOST"]').check()
  await compPartySection.getByTestId('date-select').fill(completingParty.dateOfBirth)
  await compPartySection.getByTestId('host-owner-taxNumber').fill(completingParty.taxNumber)
  // add host mailing address
  await compPartySection.getByTestId('host-owner-address-country').click()
  await compPartySection.getByRole('option', { name: 'Canada' }).click()
  await compPartySection.getByTestId('host-owner-address-street').fill(completingParty.mailingAddress.street)
  await compPartySection.getByTestId('mailingAddress.city').fill(completingParty.mailingAddress.city)
  await compPartySection.getByTestId('address-region-select').click()
  await compPartySection.getByRole('option', { name: completingParty.mailingAddress.region }).click()
  await compPartySection.getByTestId('mailingAddress.postalCode').fill(completingParty.mailingAddress.postalCode)
  await compPartySection.getByTestId('address-location-description').fill(completingParty.mailingAddress.locationDescription)
  // add host contact info
  await compPartySection.getByTestId('phone-countryCode').fill(completingParty.phone.countryCode!)
  await compPartySection.getByRole('option').first().click()
  await compPartySection.getByTestId('phone-number').fill(completingParty.phone.number)
  await compPartySection.getByTestId('phone-extension').fill(completingParty.phone.extension!)
  await compPartySection.getByTestId('host-owner-fax-number').fill(completingParty.faxNumber!)
  await compPartySection.getByTestId('host-owner-email').fill(completingParty.emailAddress)
  // done filling completing party
  await compPartySection.getByRole('button', { name: 'Done', exact: true }).click()
  await expect(compPartySection).not.toBeVisible() // form should be hidden
  await expect(page.locator('table').filter({ hasText: 'Person completing form' })).toBeVisible() // completing party should be added to table

  // add cohost
  await page.getByRole('button', { name: 'Add an Individual', exact: true }).click()
  await expect(page.locator('section').filter({ hasText: 'Add an Individual' })).toBeVisible()
  const cohostSection = page.locator('section').filter({ hasText: 'Add an Individual' })
  // fill cohost name and role
  await cohostSection.getByTestId('host-owner-first-name').fill(cohost.firstName!)
  await cohostSection.getByTestId('host-owner-middle-name').fill(cohost.middleName!)
  await cohostSection.getByTestId('host-owner-last-name').fill(cohost.lastName!)
  await cohostSection.getByTestId('host-owner-preferred-name').fill(cohost.preferredName!)
  await cohostSection.locator('input[type="radio"][value="CO_HOST"]').check()
  // add cohost mailing address
  await cohostSection.getByTestId('host-owner-address-country').click()
  await cohostSection.getByRole('option', { name: 'Canada' }).click()
  await cohostSection.getByTestId('host-owner-address-street').fill(cohost.mailingAddress.street)
  await cohostSection.getByTestId('mailingAddress.city').fill(cohost.mailingAddress.city)
  await cohostSection.getByTestId('address-region-select').click()
  await cohostSection.getByRole('option', { name: cohost.mailingAddress.region }).click()
  await cohostSection.getByTestId('mailingAddress.postalCode').fill(cohost.mailingAddress.postalCode)
  await cohostSection.getByTestId('address-location-description').fill(cohost.mailingAddress.locationDescription)
  // add cohost contact info
  await cohostSection.getByTestId('phone-countryCode').fill(cohost.phone.countryCode!)
  await cohostSection.getByRole('option').first().click()
  await cohostSection.getByTestId('phone-number').fill(cohost.phone.number)
  await cohostSection.getByTestId('phone-extension').fill(cohost.phone.extension!)
  await cohostSection.getByTestId('host-owner-fax-number').fill(cohost.faxNumber!)
  await cohostSection.getByTestId('host-owner-email').fill(cohost.emailAddress)
  // done filling cohost
  await cohostSection.getByRole('button', { name: 'Done', exact: true }).click()
  await expect(cohostSection).not.toBeVisible() // form should be hidden
  await expect(page.locator('table').filter({ hasText: 'Co-host' })).toBeVisible() // cohost party should be added to table

  // add property manager
  await page.getByRole('button', { name: 'Add a Business', exact: true }).click()
  await expect(page.locator('section').filter({ hasText: 'Add a Business' })).toBeVisible()
  const pmSection = page.locator('section').filter({ hasText: 'Add a Business' })
  // add business name, pm role and business number
  await pmSection.getByTestId('host-owner-businessLegalName').fill(propertyManager.businessLegalName)
  await pmSection.locator('input[type="radio"][value="PROPERTY_MANAGER"]').check()
  await pmSection.getByTestId('owner-host-businessNumber').fill(propertyManager.businessNumber)
  // add business address
  await pmSection.getByTestId('host-owner-address-country').click()
  await pmSection.getByRole('option', { name: 'Canada' }).click()
  await pmSection.getByTestId('host-owner-address-street').fill(propertyManager.mailingAddress.street)
  await pmSection.getByTestId('mailingAddress.city').fill(propertyManager.mailingAddress.city)
  await pmSection.getByTestId('address-region-select').click()
  await pmSection.getByRole('option', { name: propertyManager.mailingAddress.region }).click()
  await pmSection.getByTestId('mailingAddress.postalCode').fill(propertyManager.mailingAddress.postalCode)
  await pmSection.getByTestId('address-location-description').fill(propertyManager.mailingAddress.locationDescription)
  // add contact info and individuals name
  await pmSection.getByTestId('host-owner-first-name').fill(propertyManager.firstName!)
  await pmSection.getByTestId('host-owner-middle-name').fill(propertyManager.middleName!)
  await pmSection.getByTestId('host-owner-last-name').fill(propertyManager.lastName!)
  await pmSection.getByTestId('host-owner-preferred-name').fill(propertyManager.preferredName!)
  await pmSection.getByTestId('phone-countryCode').fill(propertyManager.phone.countryCode!)
  await pmSection.getByRole('option').first().click()
  await pmSection.getByTestId('phone-number').fill(propertyManager.phone.number)
  await pmSection.getByTestId('phone-extension').fill(propertyManager.phone.extension!)
  await pmSection.getByTestId('host-owner-fax-number').fill(propertyManager.faxNumber!)
  await pmSection.getByTestId('host-owner-email').fill(propertyManager.emailAddress)
  // done filling property manager
  await pmSection.getByRole('button', { name: 'Done', exact: true }).click()
  await expect(pmSection).not.toBeVisible() // form should be hidden
  await expect(page.locator('table').filter({ hasText: 'Property Manager' })).toBeVisible() // Property Manager should be added to table
}
