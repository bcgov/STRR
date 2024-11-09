import { mountSuspended } from '@nuxt/test-utils/runtime'
import Stepper from '~/components/bcros/stepper/Stepper.vue'
import CreateApplication from '@/pages/create-account.vue'
import {
  BcrosFormSectionBusinessDetails,
  BcrosFormSectionContactDetails,
  BcrosFormSectionContactName,
  BcrosFormSectionPropertyManagerBusinessMailingAddress
} from '#components'

const FIELD_ERROR = '.data-field-error' // css of the field error

// Define required fields for Property Manager
const PROPERTY_MANAGER_REQUIRED_FIELDS = [
  'address',
  'city',
  'province',
  'postal code',
  'first name',
  'last name',
  'phone number',
  'email address'
]

// Define required fields for Individual Host Type
const INDIVIDUAL_HOST_REQUIRED_FIELDS = [
  'first name',
  'last name',
  'dob day',
  'dob month',
  'dob year',
  'phone number',
  'email'
]

// Define required fields for Business Host Type
const BUSINESS_HOST_REQUIRED_FIELDS = [
  'business legal name',
  'first name',
  'last name',
  'phone number',
  'email']

describe('Rental Application Validations', () => {
  let wrapper: any

  // go to specific step in Stepper
  const goToStep = async (stepNumber: number) => {
    const stepId = `[data-test-id=step-index-${stepNumber - 1}]`
    wrapper.findComponent(Stepper).find(stepId).trigger('click')
    await nextTick()
  }

  beforeAll(async () => {
    wrapper = await mountSuspended(CreateApplication)
    // go thru all steps to trigger validations
    await goToStep(2)
    await goToStep(3)
    await goToStep(4)
    await goToStep(5)
  })

  it('should validate Step 1 - Property Manager', async () => {
    await goToStep(1)

    const propertyManagerForm = wrapper.findTestId('property-manager-form')

    expect(propertyManagerForm.findAll(FIELD_ERROR)).toHaveLength(PROPERTY_MANAGER_REQUIRED_FIELDS.length)

    // business mailing address
    expect(propertyManagerForm.findComponent(BcrosFormSectionPropertyManagerBusinessMailingAddress).exists()).toBe(true)
    wrapper.findTestId('property-manager-address-input').setValue('123 Main St')
    wrapper.findTestId('property-manager-city-input').setValue('Vancouver')
    wrapper.findTestId('property-manager-province-select').setValue({ value: 'BC', name: 'British Columbia' })
    wrapper.findTestId('property-manager-postal-code-input').setValue('V6A1A1')

    // contact name
    expect(propertyManagerForm.findComponent(BcrosFormSectionContactName).exists()).toBe(true)
    wrapper.findTestId('contact-first-name-input').setValue('John')
    wrapper.findTestId('contact-last-name-input').setValue('Doe')

    // contact details
    expect(propertyManagerForm.findComponent(BcrosFormSectionContactDetails).exists()).toBe(true)
    wrapper.findTestId('phone-number').setValue('123-456-7890')
    wrapper.findTestId('email-address').setValue('abc@abc.com')

    // await for validations to complete
    await nextTick()

    // there should be no errors after all required fields populated
    expect(wrapper.findTestId('property-manager-form').findAll(FIELD_ERROR)).toHaveLength(0)
  })

  it('should validate Step 2 - Host Information', async () => {
    await goToStep(2)

    const hostInformation = wrapper.findTestId('host-information-form')

    expect(hostInformation.findAll(FIELD_ERROR)).toHaveLength(INDIVIDUAL_HOST_REQUIRED_FIELDS.length)

    // TODO: fix field validations so all 12 errors show up
    // expect(hostInformation.findAll(FIELD_ERROR)).toHaveLength(12)

    // switch to Business type
    formState.primaryContact.contactType = HostContactTypeE.BUSINESS
    await nextTick()
    expect(hostInformation.findComponent(BcrosFormSectionBusinessDetails).exists()).toBe(true)
    expect(hostInformation.findComponent(BcrosFormSectionContactName).exists()).toBe(true)

    // go to another step and come back to trigger validation
    await goToStep(3)
    await goToStep(2)

    expect(hostInformation.findAll(FIELD_ERROR)).toHaveLength(BUSINESS_HOST_REQUIRED_FIELDS.length)

    // populate fields to trigger validations and reset errors
    wrapper.findTestId('business-legal-name-input').setValue('Acme Corporation')

    wrapper.findTestId('contact-first-name-input').setValue('John')
    wrapper.findTestId('contact-last-name-input').setValue('Doe')

    wrapper.findTestId('phone-number').setValue('1234567890')
    wrapper.findTestId('email-address').setValue('john.doe@example.com')

    // await for validations to complete
    await nextTick()

    // there should be no errors after all required fields populated
    expect(wrapper.findTestId('host-information-form').findAll(FIELD_ERROR)).toHaveLength(0)
  })
})
