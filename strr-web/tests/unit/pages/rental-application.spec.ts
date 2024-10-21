import { mountSuspended } from '@nuxt/test-utils/runtime'
import ApplicationDetails from '@/pages/create-account.vue'
import Stepper from '~/components/bcros/stepper/Stepper.vue'
import InfoModal from '~/components/common/InfoModal.vue'
import FeeWidget from '~/components/FeeWidget.vue'
import H1 from '~/components/bcros/typography/H1.vue'
import H2 from '~/components/bcros/typography/H2.vue'
import {
  BcrosFormSectionPropertyManagerForm,
  BcrosFormSectionContactInformationForm,
  BcrosFormSectionReviewForm,
  BcrosFormSectionReviewSubsection
} from '#components'

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
    wrapper = await mountSuspended(ApplicationDetails)

    expect(wrapper.findTestId('create-account-page').exists()).toBe(true)

    expect(wrapper.findAllComponents(InfoModal).length).toBe(2)
    expect(wrapper.findComponent(FeeWidget).exists()).toBeTruthy()

    expect(wrapper.findComponent(H1).text()).toBe(t('createAccount.title'))

    const stepper = wrapper.findComponent(Stepper)
    expect(stepper.exists()).toBeTruthy()

    expect(wrapper.findComponent(BcrosFormSectionPropertyManagerForm).exists()).toBeTruthy()

    await goToStep(2)
    expect(wrapper.findComponent(BcrosFormSectionContactInformationForm).exists()).toBeTruthy()
    expect(wrapper.findComponent(H2).text()).toContain('Step 2')

    await goToStep(3)
    expect(wrapper.findComponent(H2).text()).toContain('Step 3')

    await goToStep(4)
    expect(wrapper.findComponent(H2).text()).toContain('Step 4')

    await goToStep(5)
    expect(wrapper.findComponent(H2).text()).toContain('Step 5')

    const reviewForm = wrapper.findComponent(BcrosFormSectionReviewForm)
    expect(reviewForm.exists()).toBeTruthy()

    // only one Primary Contact section is showing, Secondary Contact does not exist
    expect(reviewForm.findAllComponents(BcrosFormSectionReviewSubsection).length).toBe(1)

    const primaryContactReview = reviewForm.findComponent(BcrosFormSectionReviewSubsection)
    expect(primaryContactReview.exists()).toBeTruthy()

    // check number of fields displayed in primary contact section
    const primaryContactFields = primaryContactReview.findAll('[data-test-id=form-item]')
    expect(primaryContactFields.length).toBe(9)

    // const rentalUnitReview = reviewForm.find('[data-test-id=rental-unit-review]')
    const rentalUnitReview = reviewForm.findTestId('rental-unit-review')
    expect(rentalUnitReview.exists()).toBeTruthy()

    // check number of fields displayed in rental unit section
    const rentalUnitReviewFields = rentalUnitReview.findAll("[data-test-id='form-item']")
    expect(rentalUnitReviewFields.length).toBe(5)
  })
})
