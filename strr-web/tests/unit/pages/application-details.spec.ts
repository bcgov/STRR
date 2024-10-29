import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import { mockFilingHistory } from '../../mocks/mockFilingHistory'
import { mockApplicationApproved } from '../../mocks/mockApplication'
import ApplicationDetails from '@/pages/application-details/[id]/index.vue'

vi.mock('~/composables/useApplications', () => ({
  useApplications: vi.fn(() => ({
    getApplication: vi.fn(),
    getApplicationHistory: vi.fn(),
    getDocument: vi.fn()
  }))
}))

vi.mock('~/composables/useBreadcrumb', () => ({
  useBreadcrumb: vi.fn(() => ({
    setupBreadcrumbData: vi.fn()
  }))
}))

vi.mock('~/composables/useChipFlavour', () => ({
  useChipFlavour: vi.fn(() => ({
    getChipFlavour: vi.fn()
  }))
}))

const mockRoute = {
  params: {
    id: '1'
  }
}

describe('ApplicationDetails', () => {
  it('renders application details correctly', () => {
    const wrapper = mount(ApplicationDetails, {
      global: {
        mocks: {
          $route: mockRoute,
          useApplications: vi.fn(() => ({
            getApplication: vi.fn().mockResolvedValue(mockApplicationApproved),
            getApplicationHistory: vi.fn().mockResolvedValue(mockFilingHistory),
            getDocument: vi.fn()
          })),
          useBreadcrumb: vi.fn(() => ({
            setupBreadcrumbData: vi.fn()
          })),
          useChipFlavour: vi.fn(() => ({
            getChipFlavour: vi.fn().mockReturnValue({ text: 'Auto Approved' })
          }))
        },
        stubs: [
          'BcrosBanner',
          'BcrosTypographyH1',
          'BcrosChip',
          'BcrosFormSectionReviewItem',
          'UTable',
          'UButton',
          'FilingHistory'
        ]
      }
    })
    expect(wrapper.vm).toBeTruthy()

    //  await wrapper.vm.$nextTick()
    //     expect(wrapper.find('[data-test-id="application-title"]').text()).toContain('BCH24527283787')
    //     expect(wrapper.find('[data-test-id="application-status-chip"]').text()).toBe('Auto Approved')
    //     expect(wrapper.find('[data-test-id="unit-address"]').text()).toContain('123 Main St')
    //     expect(wrapper.find('[data-test-id="business-license"]').text()).toBe('-')
    //     expect(wrapper.find('[data-test-id="ownership-type"]').text()).toBe('Own')
    //     expect(wrapper.find('[data-test-id="property-type"]').text()).toBe('Secondary Suite')
    //     expect(wrapper.find('[data-test-id="primary-contact-name"]').text()).toContain('BCREGTEST TWENTYFIVE')
    //     expect(wrapper.find('[data-test-id="primary-contact-email"]').text()).toBe('test1@email.com')
    //     expect(wrapper.find('[data-test-id="primary-contact-phone"]').text()).toBe('5554443322')
    //   })

    //   it('displays correct application status', async () => {
    //     const wrapper = mount(ApplicationDetails, {
    //       global: {
    //         mocks: {
    //           $route: mockRoute,
    //           useApplications: vi.fn(() => ({
    //             getApplication: vi.fn().mockResolvedValue(mockApplicationApproved),
    //             getApplicationHistory: vi.fn().mockResolvedValue(mockFilingHistory),
    //             getDocument: vi.fn()
    //           })),
    //           useBreadcrumb: vi.fn(() => ({
    //             setupBreadcrumbData: vi.fn()
    //           })),
    //           useChipFlavour: vi.fn(() => ({
    //             getChipFlavour: vi.fn().mockReturnValue({ text: 'Auto Approved' })
    //           }))
    //         },
    //         stubs: [
    //           'BcrosBanner',
    //           'BcrosTypographyH1',
    //           'BcrosChip',
    //           'BcrosFormSectionReviewItem',
    //           'UTable',
    //           'UButton',
    //           'FilingHistory'
    //         ]
    //       }
    //     })

    //     await wrapper.vm.$nextTick()

    //     expect(wrapper.find('[data-test-id="application-status-text"]').text()).toBe('hostStatuses.autoApproved')
    //   })

    //   it('renders filing history correctly', async () => {
    //     const wrapper = mount(ApplicationDetails, {
    //       global: {
    //         mocks: {
    //           $route: mockRoute,
    //           useApplications: vi.fn(() => ({
    //             getApplication: vi.fn().mockResolvedValue(mockApplicationApproved),
    //             getApplicationHistory: vi.fn().mockResolvedValue(mockFilingHistory),
    //             getDocument: vi.fn()
    //           })),
    //           useBreadcrumb: vi.fn(() => ({
    //             setupBreadcrumbData: vi.fn()
    //           })),
    //           useChipFlavour: vi.fn(() => ({
    //             getChipFlavour: vi.fn().mockReturnValue({ text: 'Auto Approved' })
    //           }))
    //         },
    //         stubs: [
    //           'BcrosBanner',
    //           'BcrosTypographyH1',
    //           'BcrosChip',
    //           'BcrosFormSectionReviewItem',
    //           'UTable',
    //           'UButton'
    //         ]
    //       }
    //     })

    //     await wrapper.vm.$nextTick()

    //     const filingHistory = wrapper.findComponent({ name: 'FilingHistory' })
    //     expect(filingHistory.exists()).toBe(true)
    //     expect(filingHistory.props('history')).toEqual(mockFilingHistory)
    //   })

    //   it('handles application without documents', async () => {
    //     const applicationWithoutDocuments = {
    //       ...mockApplicationApproved,
    //       registration: { ...mockApplicationApproved.registration, documents: [] }
    //     }
    //     const wrapper = mount(ApplicationDetails, {
    //       global: {
    //         mocks: {
    //           $route: mockRoute,
    //           useApplications: vi.fn(() => ({
    //             getApplication: vi.fn().mockResolvedValue(applicationWithoutDocuments),
    //             getApplicationHistory: vi.fn().mockResolvedValue(mockFilingHistory),
    //             getDocument: vi.fn()
    //           })),
    //           useBreadcrumb: vi.fn(() => ({
    //             setupBreadcrumbData: vi.fn()
    //           })),
    //           useChipFlavour: vi.fn(() => ({
    //             getChipFlavour: vi.fn().mockReturnValue({ text: 'Auto Approved' })
    //           }))
    //         },
    //         stubs: [
    //           'BcrosBanner',
    //           'BcrosTypographyH1',
    //           'BcrosChip',
    //           'BcrosFormSectionReviewItem',
    //           'UTable',
    //           'UButton',
    //           'FilingHistory'
    //         ]
    //       }
    //     })

    //     await wrapper.vm.$nextTick()

    //     expect(wrapper.find('[data-test-id="documents-section"]').exists()).toBe(false)
    //   })

    //   it('displays LTSA and auto-approval sections for examiner', async () => {
    //     const wrapper = mount(ApplicationDetails, {
    //       global: {
    //         mocks: {
    //           $route: mockRoute,
    //           useApplications: vi.fn(() => ({
    //             getApplication: vi.fn().mockResolvedValue(mockApplicationApproved),
    //             getApplicationHistory: vi.fn().mockResolvedValue(mockFilingHistory),
    //             getDocument: vi.fn()
    //           })),
    //           useBreadcrumb: vi.fn(() => ({
    //             setupBreadcrumbData: vi.fn()
    //           })),
    //           useChipFlavour: vi.fn(() => ({
    //             getChipFlavour: vi.fn().mockReturnValue({ text: 'Auto Approved' })
    //           })),
    //           useBcrosKeycloak: vi.fn(() => ({
    //             isExaminer: true
    //           }))
    //         },
    //         stubs: [
    //           'BcrosBanner',
    //           'BcrosTypographyH1',
    //           'BcrosChip',
    //           'BcrosFormSectionReviewItem',
    //           'UTable',
    //           'UButton',
    //           'FilingHistory'
    //         ]
    //       }
    //     })

    //     await wrapper.vm.$nextTick()

    //     expect(wrapper.find('[data-test-id="ltsa-info-section"]').exists()).toBe(true)
    //     expect(wrapper.find('[data-test-id="auto-approval-section"]').exists()).toBe(true)
    //   })

    //   it('does not display LTSA and auto-approval sections for non-examiner', async () => {
    //     const wrapper = mount(ApplicationDetails, {
    //       global: {
    //         mocks: {
    //           $route: mockRoute,
    //           useApplications: vi.fn(() => ({
    //             getApplication: vi.fn().mockResolvedValue(mockApplicationApproved),
    //             getApplicationHistory: vi.fn().mockResolvedValue(mockFilingHistory),
    //             getDocument: vi.fn()
    //           })),
    //           useBreadcrumb: vi.fn(() => ({
    //             setupBreadcrumbData: vi.fn()
    //           })),
    //           useChipFlavour: vi.fn(() => ({
    //             getChipFlavour: vi.fn().mockReturnValue({ text: 'Auto Approved' })
    //           })),
    //           useBcrosKeycloak: vi.fn(() => ({
    //             isExaminer: false
    //           }))
    //         },
    //         stubs: [
    //           'BcrosBanner',
    //           'BcrosTypographyH1',
    //           'BcrosChip',
    //           'BcrosFormSectionReviewItem',
    //           'UTable',
    //           'UButton',
    //           'FilingHistory'
    //         ]
    //       }
    //     })

    //     await wrapper.vm.$nextTick()

    //     expect(wrapper.find('[data-test-id="ltsa-info-section"]').exists()).toBe(false)
    //     expect(wrapper.find('[data-test-id="auto-approval-section"]').exists()).toBe(false)
  })
})
