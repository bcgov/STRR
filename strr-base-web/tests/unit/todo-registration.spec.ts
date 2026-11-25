import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RegistrationTodoType } from '~/enums/registration-todo-type'
import { ApplicationStatus } from '~/enums/application-status'

const getRegistrationToDos = vi.fn()
vi.stubGlobal('useStrrApi', () => ({ getRegistrationToDos }))
vi.stubGlobal('RegistrationTodoType', RegistrationTodoType)
vi.stubGlobal('ApplicationStatus', ApplicationStatus)

const { getTodoRegistration } = await import('../../app/utils/todoItems')

describe('getTodoRegistration', () => {
  beforeEach(() => getRegistrationToDos.mockReset())

  it('returns the renewal window and the draft application number', async () => {
    const renewalWindow = { startDate: '2027-01-15', hasStarted: false }
    getRegistrationToDos.mockResolvedValue({
      todos: [{ task: { type: RegistrationTodoType.REGISTRATION_RENEWAL_DRAFT, detail: '456' } }],
      renewalWindow
    })
    expect(await getTodoRegistration(7)).toEqual({
      hasRenewalTodo: false,
      hasRenewalDraft: true,
      hasRenewalPaymentPending: false,
      renewalDraftId: '456',
      renewalPaymentPendingId: null,
      renewalWindow
    })
    expect(getRegistrationToDos).toHaveBeenCalledWith(7)
  })

  it('returns the payment pending application number', async () => {
    getRegistrationToDos.mockResolvedValue({
      todos: [{ task: { type: RegistrationTodoType.REGISTRATION_RENEWAL_PAYMENT_PENDING, detail: '789' } }]
    })
    expect(await getTodoRegistration(7)).toMatchObject({
      hasRenewalPaymentPending: true,
      renewalPaymentPendingId: '789'
    })
  })

  it('accepts a response without a window or application numbers', async () => {
    getRegistrationToDos.mockResolvedValue({
      todos: [{ task: { type: RegistrationTodoType.REGISTRATION_RENEWAL_DRAFT } }]
    })
    const result = await getTodoRegistration(7)
    expect(result.renewalDraftId).toBeNull()
    expect(result.renewalWindow).toBeUndefined()
  })
})
