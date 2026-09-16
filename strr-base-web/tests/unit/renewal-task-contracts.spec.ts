import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useStrrApi } from '../../app/composables/useStrrApi'
import { ApplicationStatus } from '../../app/enums/application-status'
import { RegistrationTodoType } from '../../app/enums/registration-todo-type'

vi.mock('#baseWeb/enums/host-actions', () => import('../../app/enums/host-actions'))

const request = vi.fn()
const logError = vi.fn()
let getTodoRegistration: typeof import('../../app/utils/todoItems').getTodoRegistration

beforeEach(async () => {
  request.mockReset()
  logError.mockReset()
  vi.stubGlobal('ApplicationStatus', ApplicationStatus)
  vi.stubGlobal('RegistrationTodoType', RegistrationTodoType)
  vi.stubGlobal('useNuxtApp', () => ({ $strrApi: request }))
  vi.stubGlobal('useStrrApi', useStrrApi)
  vi.stubGlobal('logFetchError', logError)
  getTodoRegistration = (await import('../../app/utils/todoItems')).getTodoRegistration
})

afterEach(() => { vi.unstubAllGlobals() })

const renewal = { task: { type: RegistrationTodoType.REGISTRATION_RENEWAL } }
const draft = { task: { type: RegistrationTodoType.REGISTRATION_RENEWAL_DRAFT, detail: 'DRAFT-101' } }
const payment = { task: { type: RegistrationTodoType.REGISTRATION_RENEWAL_PAYMENT_PENDING, detail: 'PAY-202' } }

describe('registration renewal task contract', () => {
  it.each([
    { name: 'no tasks', todos: [], renewable: false, draftId: null, paymentId: null },
    { name: 'new renewal', todos: [renewal], renewable: true, draftId: null, paymentId: null },
    { name: 'draft renewal', todos: [draft], renewable: false, draftId: 'DRAFT-101', paymentId: null },
    { name: 'pending payment', todos: [payment], renewable: false, draftId: null, paymentId: 'PAY-202' },
    {
      name: 'all task kinds',
      todos: [payment, renewal, draft],
      renewable: true,
      draftId: 'DRAFT-101',
      paymentId: 'PAY-202'
    },
    {
      name: 'first task of each kind',
      todos: [renewal, draft, payment,
        { task: { ...draft.task, detail: 'LATER-DRAFT' } },
        { task: { ...payment.task, detail: 'LATER-PAYMENT' } }],
      renewable: true,
      draftId: 'DRAFT-101',
      paymentId: 'PAY-202'
    }
  ])('preserves the API result for $name', async ({ todos, renewable, draftId, paymentId }) => {
    request.mockResolvedValue({ todos })
    expect(await getTodoRegistration(308)).toEqual({
      hasRenewalTodo: renewable,
      hasRenewalDraft: draftId !== null,
      hasRenewalPaymentPending: paymentId !== null,
      renewalDraftId: draftId,
      renewalPaymentPendingId: paymentId
    })
    expect(request).toHaveBeenCalledExactlyOnceWith('/registrations/308/todos')
  })

  it('preserves the API client\'s logged empty-task fallback on failure', async () => {
    const error = new Error('Synthetic renewal task failure')
    request.mockRejectedValue(error)
    expect(await getTodoRegistration(308)).toEqual({
      hasRenewalTodo: false,
      hasRenewalDraft: false,
      hasRenewalPaymentPending: false,
      renewalDraftId: null,
      renewalPaymentPendingId: null
    })
    expect(logError).toHaveBeenCalledExactlyOnceWith(error, 'Unable to get registration todos for 308')
  })
})
