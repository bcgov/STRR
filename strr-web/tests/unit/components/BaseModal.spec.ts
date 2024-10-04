import { mountSuspended } from '@nuxt/test-utils/runtime'
import InfoModal from '~/components/common/InfoModal.vue'

const { t } = useTranslation()

const MODAL_HEADER = 'Main Header'
const MODAL_OPEN_LABEL = 'Open Modal'

describe('Base Modal Tests', () => {
  it('should render modal with its components and content', async () => {
    const wrapper = await mountSuspended(InfoModal, {
      props: {
        header: MODAL_HEADER,
        openButtonLabel: MODAL_OPEN_LABEL
      },
      slots: {
        default: () => '<div>Main Content</div>'
      }
    })

    expect(wrapper.exists()).toBeTruthy()

    // check H2 header
    expect(wrapper.find('[data-test-id="info-modal-header"]').exists()).toBeFalsy()

    // check open modal button label
    const openModalButton = wrapper.find('[data-test-id="info-modal-open-button"]')
    expect(openModalButton.exists()).toBeTruthy()
    expect(openModalButton.text()).toBe(MODAL_OPEN_LABEL)

    // modal is not open
    expect(document.querySelector('[data-test-id="info-modal"]')).toBeFalsy()

    openModalButton.trigger('click')
    await nextTick()

    const modal = document.querySelector('[data-test-id="info-modal"]')

    // modal is open
    expect(modal).toBeTruthy()

    const modalHeader = modal?.querySelector('[data-test-id="info-modal-header"]')?.innerHTML
    expect(modalHeader).toContain(MODAL_HEADER)

    const modalDefaultSlot = modal?.querySelector('[data-test-id="info-modal-default-slot"]')?.innerHTML
    expect(modalDefaultSlot).toContain('Main Content')

    const modalContactInfo = modal?.querySelector('[data-test-id="contact-info"]')?.innerHTML
    expect(modalContactInfo).toContain(t('bcrosContactInfo.tollFree.value'))

    const modalActions = modal?.querySelector('[data-test-id="info-modal-action-buttons"]')?.innerHTML
    expect(modalActions).toBeTruthy()
    expect(modalActions).toContain(t('common.baseModal.closeButtonLabel'))
  })
})
