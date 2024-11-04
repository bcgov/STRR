import { mountSuspended } from '@nuxt/test-utils/runtime'
import { set } from 'lodash'
import {
  BcrosFormSectionContactInformationForm,
  BcrosFormSectionPropertyManagerForm,
  BcrosFormSectionReviewForm,
  BcrosFormSectionReviewSubsection
} from '#components'
import CreateApplication from '@/pages/create-account.vue'
import Stepper from '~/components/bcros/stepper/Stepper.vue'
import H1 from '~/components/bcros/typography/H1.vue'
import H2 from '~/components/bcros/typography/H2.vue'
import InfoModal from '~/components/common/InfoModal.vue'
import FeeWidget from '~/components/FeeWidget.vue'
import { mockPrimaryContact } from '~/tests/mocks/mockApplication'
import { mockPropertyManager } from '~/tests/mocks/mockPropertyManager'

const { t } = useTranslation()

describe('Rental Application', () => {
  let wrapper: any

  // go to specific step in Stepper
  const goToStep = async (stepNumber: number) => {
    const stepId = `[data-test-id=step-index-${stepNumber - 1}]`
    wrapper.findComponent(Stepper).find(stepId).trigger('click')
    await nextTick()
  }

  it('should render Rental Application page and form correctly', async () => {
    wrapper = await mountSuspended(CreateApplication)

    expect(wrapper.findTestId('create-account-page').exists()).toBe(true)

    expect(wrapper.findAllComponents(InfoModal)).toHaveLength(2)
    expect(wrapper.findComponent(FeeWidget).exists()).toBe(true)

    expect(wrapper.findComponent(H1).text()).toBe(t('createAccount.title'))

    const stepper = wrapper.findComponent(Stepper)
    expect(stepper.exists()).toBe(true)

    expect(wrapper.findComponent(BcrosFormSectionPropertyManagerForm).exists()).toBeTruthy()
    expect(wrapper.findComponent(H2).text()).toContain('Step 1')

    await goToStep(2)
    expect(wrapper.findComponent(BcrosFormSectionContactInformationForm).exists()).toBe(true)
    expect(wrapper.findComponent(H2).text()).toContain(t('createAccount.contact.title'))

    await goToStep(3)
    expect(wrapper.findComponent(H2).text()).toContain(t('createAccount.details.title'))

    await goToStep(4)
    expect(wrapper.findComponent(H2).text()).toContain(t('createAccount.eligibility.title'))

    await goToStep(5)
    expect(wrapper.findComponent(H2).text()).toContain(t('createAccount.confirm.title'))

    const reviewForm = wrapper.findComponent(BcrosFormSectionReviewForm)
    expect(reviewForm.exists()).toBe(true)

    // only one Primary Contact section is showing, Secondary Contact does not exist
    expect(reviewForm.findAllComponents(BcrosFormSectionReviewSubsection)).toHaveLength(1)

    const primaryContactReview = reviewForm.findComponent(BcrosFormSectionReviewSubsection)
    expect(primaryContactReview.exists()).toBe(true)

    const rentalUnitReview = reviewForm.findTestId('rental-unit-review')
    expect(rentalUnitReview.exists()).toBe(true)
  })

  it('Review Step - should render Property Manager Information section', async () => {
    wrapper = await mountSuspended(CreateApplication)
    await goToStep(5)

    expect(wrapper.findComponent(H2).text()).toContain(t('createAccount.confirm.title'))

    // Property Manager should exist by default
    expect(wrapper.findTestId('property-manager-review').exists()).toBe(true)

    // update Property Manager state
    formState.hasPropertyManager = true
    formState.propertyManager = mockPropertyManager
    await nextTick()

    const propertyManagerReview = wrapper.findTestId('property-manager-review')
    // Property Manager should exists
    expect(propertyManagerReview.exists()).toBe(true)

    const propertyManagerReviewFields = propertyManagerReview.findAll("[data-test-id='form-item']")
    expect(propertyManagerReviewFields).toHaveLength(8)

    // extract the text from Property Manager section
    const propertyManagerReviewText = propertyManagerReview.text()

    // update Country from CA to Canada
    const updatePropertyManagerAddress: PropertyManagerBusinessAddressI =
       set({ ...mockPropertyManager.businessMailingAddress }, 'country', 'Canada')

    const filterValues = (obj: any) => Object.values(obj).filter(value =>
      typeof value === 'string' || typeof value === 'number'
    )

    // construct list of expected values from mocked Property Manager
    const expectedValues = [
      mockPropertyManager.businessLegalName,
      mockPropertyManager.businessNumber,
      ...filterValues(updatePropertyManagerAddress),
      ...filterValues(mockPropertyManager.contact)
    ]

    // check that mocked values were rendered (as text) in the Property Manager section
    expectedValues.forEach((value) => {
      expect(propertyManagerReviewText).toContain(value)
    })

    expect(wrapper.findTestId('host-auth-checkbox').exists()).toBe(false)
  })

  it('Review Step - should render Host Authorization Checkbox', async () => {
    wrapper = await mountSuspended(CreateApplication)
    formState.isPropertyManagerRole = true
    await goToStep(5)

    const rentalUnitReview = wrapper.findTestId('rental-unit-review')
    expect(rentalUnitReview.exists()).toBe(true)
    expect(wrapper.findTestId('host-auth-checkbox').exists()).toBe(true)

    // go back to Step 1 and reset Property Manager role
    await goToStep(1)
    formState.isPropertyManagerRole = false
    await goToStep(5)

    expect(wrapper.findTestId('host-auth-checkbox').exists()).toBe(false)
  })

  // Utility function to filter only string values from an object
  const filterValues = (obj: any) => Object.values(obj).filter(val => typeof val === 'string')

  it('Review Step - should render Primary Contact Information section', async () => {
    wrapper = await mountSuspended(CreateApplication)
    await goToStep(5)

    const primaryContactReview = wrapper.findTestId('primary-contact-review')
    expect(primaryContactReview.exists()).toBe(true)

    // Check number of fields displayed in primary contact section
    const primaryContactFields = primaryContactReview.findAll('[data-test-id=form-item]')
    expect(primaryContactFields).toHaveLength(9)

    // Update Property Manager state with mock data
    formState.primaryContact = mockPrimaryContact
    await nextTick()

    // update Country from CA to Canada
    const updatedPrimaryContact = set({ ...mockPrimaryContact }, 'country', 'Canada')

    // Construct list of expected values by filtering only string values
    const expectedValues = filterValues(updatedPrimaryContact)

    // Extract text from the rendered Primary Contact section
    const primaryContactReviewText = primaryContactReview.text()

    // Verify that each expected value appears in the rendered text
    expectedValues.forEach((value) => {
      expect(primaryContactReviewText).toContain(value)
    })
  })

  it('Review Step - should render Rental Unit Information section', async () => {
    wrapper = await mountSuspended(CreateApplication)
    await goToStep(5)

    const rentalUnitReview = wrapper.findTestId('rental-unit-review')
    expect(rentalUnitReview.exists()).toBe(true)

    // check number of fields displayed in rental unit section
    const rentalUnitReviewFields = rentalUnitReview.findAll("[data-test-id='form-item']")
    expect(rentalUnitReviewFields.length).toBe(9)
  })
})
