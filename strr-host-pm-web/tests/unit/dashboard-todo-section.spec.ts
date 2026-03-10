import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, it, expect } from 'vitest'
import { baseEnI18n } from '../mocks/i18n'
import DashboardTodoSection from '~/components/dashboard/DashboardTodoSection.vue'

const mockTodo: Todo = { id: 'todo-1', title: 'Complete your application' }

const setupMount = (props: { todos: Todo[], loading: boolean, showRenewalSubmitted?: boolean }) =>
  mountSuspended(DashboardTodoSection, { props, global: { plugins: [baseEnI18n] } })

describe('Dashboard Todo Section', () => {
  it('should render TodoEmpty when todos list is empty', async () => {
    const wrapper = await setupMount({ todos: [], loading: false })
    expect(wrapper.find('[data-testid="todo-empty"]').exists()).toBe(true)
  })

  it('should render todo items when todos are provided', async () => {
    const todos: Todo[] = [
      { id: 'todo-1', title: 'First todo' },
      { id: 'todo-2', title: 'Second todo' }
    ]
    const wrapper = await setupMount({ todos, loading: false })
    expect(wrapper.find('[data-testid="todo-empty"]').exists()).toBe(false)
  })

  it('does not render renewal submitted notification by default', async () => {
    const wrapper = await setupMount({ todos: [mockTodo], loading: false })
    expect(wrapper.find('[data-testid="renewal-submitted-notification"]').exists()).toBe(false)
  })

  it('should render renewal submitted notification when showRenewalSubmitted is true', async () => {
    const wrapper = await setupMount({ todos: [], loading: false, showRenewalSubmitted: true })
    expect(wrapper.find('[data-testid="renewal-submitted-notification"]').exists()).toBe(true)
  })
})
