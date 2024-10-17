import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { setupExaminer, setupHost } from '../../utils/helper-functions'
import { BcrosBanner, BcrosButtonsPrimary } from '#components'
import {
  mockApplicationApproved,
  mockApplicationFullReview,
  mockApplicationPaymentDue
} from '~/tests/mocks/mockApplication'

describe('Banner Component Test', () => {
  const { t } = useTranslation()

  it('should mount Banner component with Examiner action buttons', async () => {
    const banner = await mountSuspended(BcrosBanner, {
      props: { application: mockApplicationFullReview }
    })

    await setupExaminer()

    expect(banner.find('[data-test-id="banner"]').exists()).toBe(true)

    const examinerActionButtons = banner.findAllComponents(BcrosButtonsPrimary)
    expect(examinerActionButtons.length).toBe(2)
    expect(examinerActionButtons.at(0)?.text()).toContain(t('banner.' + ExaminerActionsE.APPROVE))
    expect(examinerActionButtons.at(1)?.text()).toContain(t('banner.' + ExaminerActionsE.REJECT))
  })

  it('should mount Banner component with Host action buttons', async () => {
    const banner = await mountSuspended(BcrosBanner, {
      props: { application: mockApplicationPaymentDue }
    })

    await setupHost()

    const hostActionButtons = banner.findAllComponents(BcrosButtonsPrimary)
    expect(hostActionButtons.length).toBe(1)
    expect(hostActionButtons.at(0)?.text()).toContain(t('banner.' + HostActionsE.SUBMIT_PAYMENT))
  })

  it('should mount Banner component with no action buttons for Host', async () => {
    const banner = await mountSuspended(BcrosBanner, {
      props: { application: mockApplicationApproved }
    })

    await setupHost()

    const hostActionButtons = banner.findAllComponents(BcrosButtonsPrimary)
    // there should be no actions buttons for Host because application is already approved
    expect(hostActionButtons.length).toBe(0)
  })
})
