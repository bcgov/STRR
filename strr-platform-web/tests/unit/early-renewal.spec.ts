import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, reactive, ref } from 'vue'
import { enI18n } from '../mocks/i18n'
import { EarlyRenewalAlert } from '#components'
import Application from '~/pages/platform/application.vue'
import Dashboard from '~/pages/platform/dashboard.vue'

const draftApplication = ref<any>(undefined)
const registration = ref<any>(undefined)
let header: Record<string, unknown> = {}
let buttonControl: ConnectBtnControl | undefined
const mockGetRegistrationToDos = vi.fn()

mockNuxtImport('useRoute', () => () => ({ query: { applicationId: '123', renew: 'true' }, params: {}, meta: {} }))
mockNuxtImport('setOnBeforeSessionExpired', () => vi.fn())
mockNuxtImport('setBreadcrumbs', () => vi.fn())
mockNuxtImport('useLocalePath', () => () => (path: string) => path)
mockNuxtImport('useNuxtApp', original => () => Object.assign(Object.create(original()), {
  $i18n: enI18n.global
}))

mockNuxtImport('useStrrApi', () => () => ({ getRegistrationToDos: mockGetRegistrationToDos }))

const platformStore = reactive({
  application: draftApplication,
  registration,
  permitDetails: ref(undefined),
  isPaidApplication: ref(false),
  showPermitDetails: ref(false),
  renewalRegId: ref(undefined),
  isRegistrationRenewal: ref(false),
  downloadApplicationReceipt: vi.fn(),
  loadPlatform: vi.fn((applicationId?: string) => {
    if (applicationId) {
      draftApplication.value = { header }
    }
  })
})
mockNuxtImport('useStrrPlatformStore', () => () => platformStore)
mockNuxtImport('useConnectLaunchdarklyStore', () => () => ({
  getStoredFlag: (name: string) => name === 'enable-save-draft'
}))

mockNuxtImport('useButtonControl', () => () => ({
  setButtonControl: (control: ConnectBtnControl) => { buttonControl = control },
  handleButtonLoading: vi.fn()
}))

mockNuxtImport('useConnectFeeStore', () => () => ({
  initAlternatePaymentMethod: vi.fn().mockResolvedValue(undefined),
  getFee: vi.fn().mockResolvedValue({ serviceFees: 0 }),
  addReplaceFee: vi.fn(),
  removeFee: vi.fn(),
  setPlaceholderFilingTypeCode: vi.fn(),
  setPlaceholderServiceFee: vi.fn()
}))

const StepperStub = defineComponent({
  name: 'ConnectStepper',
  emits: ['update:activeStepIndex'],
  setup: (_, { slots }) => () => h('div', slots.default?.())
})

const mountApplication = async () => {
  const wrapper = await mountSuspended(Application, {
    global: {
      plugins: [enI18n],
      stubs: {
        ConnectSpinner: true,
        ConnectTypographyH1: true,
        ModalGroupHelpAndInfo: true,
        ConnectStepper: StepperStub,
        FormContactInfo: true,
        FormPlatformBusinessDetails: true,
        FormPlatformDetails: true,
        FormPlatformReviewConfirm: true
      }
    }
  })
  await flushPromises()
  return wrapper
}

const TodoStub = defineComponent({
  name: 'Todo',
  props: { id: { type: String, default: '' }, subtitle: { type: String, default: '' } },
  setup: props => () => h('div', { id: props.id }, props.subtitle)
})

const mountDashboard = async () => {
  const wrapper = await mountSuspended(Dashboard, {
    global: { plugins: [enI18n], stubs: { Todo: TodoStub } }
  })
  await flushPromises()
  return wrapper
}

const ALERT = '[data-testid="early-renewal-alert"]'

const lastButton = () => buttonControl!.rightButtons.at(-1)!

describe('Early renewal draft in the application wizard', () => {
  beforeEach(() => {
    draftApplication.value = undefined
    buttonControl = undefined
    header = { applicationNumber: '123', applicationType: 'renewal', status: 'DRAFT' }
  })

  it('shows the alert and blocks only the submit button before the window starts', async () => {
    header = { ...header, renewalWindowStartDate: '2027-01-15', hasRenewalWindowStarted: false }
    const wrapper = await mountApplication()

    expect(wrapper.find(ALERT).exists()).toBe(true)
    expect(wrapper.findComponent(EarlyRenewalAlert).props('date')).toBe('January 15, 2027')
    expect(lastButton()).toMatchObject({ disabled: false, locked: false })

    wrapper.findComponent(StepperStub).vm.$emit('update:activeStepIndex', 3)
    await flushPromises()
    expect(lastButton()).toMatchObject({ disabled: true, locked: true })
    expect(buttonControl!.leftButtons).toHaveLength(3) // cancel, save and exit, save
    expect(buttonControl!.leftButtons.some(button => button.disabled)).toBe(false)
  })

  // when the alert shows is covered by getDraftEarlyRenewalDate in strr-base-web
  it('shows no alert and allows submit once the window has started', async () => {
    header = { ...header, renewalWindowStartDate: '2027-01-15', hasRenewalWindowStarted: true }
    const wrapper = await mountApplication()
    wrapper.findComponent(StepperStub).vm.$emit('update:activeStepIndex', 3)
    await flushPromises()

    expect(wrapper.find(ALERT).exists()).toBe(false)
    expect(lastButton()).toMatchObject({ disabled: false, locked: false })
  })
})

describe('Renewal draft todo on the dashboard', () => {
  beforeEach(() => {
    draftApplication.value = undefined
    registration.value = { id: 7, status: 'ACTIVE', expiryDate: '2027-02-24T23:59:59' }
  })

  const draftTodo = (detail?: string) => ({ task: { type: 'REGISTRATION_RENEWAL_DRAFT', detail } })

  // the subtitle choice is covered by getRenewalDraftSubtitle in strr-base-web
  it('uses the early subtitle before the window starts', async () => {
    mockGetRegistrationToDos.mockResolvedValue({
      todos: [draftTodo('456')],
      renewalWindow: { startDate: '2027-01-15', hasStarted: false }
    })
    const wrapper = await mountDashboard()

    // the text itself is in the base layer locale, which is not loaded here
    expect(wrapper.find('#todo-renewal-draft').text()).toBe('todos.renewalDraft.earlySubtitle')
  })

  it('skips draft and payment todos that have no application number', async () => {
    mockGetRegistrationToDos.mockResolvedValue({
      todos: [draftTodo(), { task: { type: 'REGISTRATION_RENEWAL_PAYMENT_PENDING' } }]
    })
    const wrapper = await mountDashboard()

    expect(mockGetRegistrationToDos).toHaveBeenCalledWith(7)
    expect(wrapper.findComponent(TodoStub).exists()).toBe(false)
  })
})
