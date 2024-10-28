import { mountSuspended } from '@nuxt/test-utils/runtime'
import { set } from 'zod'
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

  it('should render Review and Confirm Step - Property Manager Information section', async () => {
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

    // construct list of expected values from mocked Property Manager
    const expectedValues = [
      mockPropertyManager.businessLegalName,
      mockPropertyManager.businessNumber,
      ...Object.values(updatePropertyManagerAddress),
      ...Object.values(mockPropertyManager.contact)
    ]

    // check that mocked values were rendered (as text) in the Property Manager section
    expectedValues.forEach((value) => {
      expect(propertyManagerReviewText).toContain(value)
    })
  })

  it('should render Review and Confirm Step - Primary Contact Information section', async () => {
    wrapper = await mountSuspended(CreateApplication)
    await goToStep(5)

    const primaryContactReview = wrapper.findTestId('primary-contact-review')
    expect(primaryContactReview.exists()).toBe(true)

    // check number of fields displayed in primary contact section
    const primaryContactFields = primaryContactReview.findAll('[data-test-id=form-item]')
    expect(primaryContactFields).toHaveLength(9)

    // update Property Manager state
    formState.primaryContact = mockPrimaryContact
    await nextTick()

    // update Country from CA to Canada
    const updatedPrimaryContact = set({ ...mockPrimaryContact }, 'country', 'Canada')

    // construct list of expected values from mocked Primary Contact
    const expectedValues = Object.values(updatedPrimaryContact)

    const primaryContactReviewText = primaryContactReview.text()

    // check that mocked values were rendered (as text) in the Primary Contact section
    expectedValues.forEach((value) => {
      expect(primaryContactReviewText).toContain(value)
    })
  })

  it('should render Review and Confirm Step - Rental Unit Information section', async () => {
    wrapper = await mountSuspended(CreateApplication)
    await goToStep(5)

    const rentalUnitReview = wrapper.findTestId('rental-unit-review')
    expect(rentalUnitReview.exists()).toBe(true)

    // check number of fields displayed in rental unit section
    const rentalUnitReviewFields = rentalUnitReview.findAll("[data-test-id='form-item']")
    expect(rentalUnitReviewFields.length).toBe(8)
  })
})
