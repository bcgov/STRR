import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ConnectTreeTable from '../../app/components/connect/TreeTable.vue'

const UTableStub = {
  name: 'UTable',
  props: ['columns', 'rows', 'loading', 'emptyState', 'ui'],
  template: `
    <div class="u-table-mock">
      <div v-if="loading" class="loading-state">
        <slot name="loading-state">Loading...</slot>
      </div>
      <div v-else-if="!rows || rows.length === 0" class="empty-state">
        <slot name="empty-state">{{ emptyState?.label }}</slot>
      </div>
      <table v-else>
        <thead>
          <tr>
            <th v-for="col in columns" :key="col.key">
              <slot :name="col.key + '-header'" :column="col">{{ col.label }}</slot>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, idx) in rows" :key="row.id" :class="row.class" :data-row-id="row.id">
            <td v-for="col in columns" :key="col.key">
              <slot :name="col.key + '-data'" :row="row" :index="idx">{{ row[col.key] }}</slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `
}

const UIconStub = {
  name: 'UIcon',
  props: ['name'],
  template: '<i :class="name" />'
}

const stubs = {
  UTable: UTableStub,
  UIcon: UIconStub
}

const sampleColumns = [
  { key: 'property', label: 'Property / Number' },
  { key: 'status', label: 'Status' },
  { key: 'address', label: 'Address' }
]

const sampleRows = [
  {
    id: 'reg_101',
    property: 'STR-2026-001',
    status: 'Active',
    address: '101 Main St',
    children: [
      {
        id: 'app_201',
        property: 'HRA-2026-001',
        status: 'Approved',
        address: '101 Main St'
      },
      {
        id: 'app_202',
        property: 'HRA-2026-002',
        status: 'In Review',
        address: '101 Main St'
      }
    ]
  },
  {
    id: 'app_standalone',
    property: 'HRA-2026-999',
    status: 'Draft',
    address: '500 Oak St'
  }
]

describe('ConnectTreeTable', () => {
  it('renders root items collapsed by default', () => {
    const wrapper = mount(ConnectTreeTable, {
      props: {
        columns: sampleColumns,
        rows: sampleRows
      },
      global: { stubs }
    })

    const rows = wrapper.findAll('tbody tr')
    // 2 root rows rendered (children of reg_101 collapsed)
    expect(rows.length).toBe(2)
    expect(rows[0].text()).toContain('STR-2026-001')
    expect(rows[1].text()).toContain('HRA-2026-999')
  })

  it('expands child rows when clicking the toggle chevron button', async () => {
    const wrapper = mount(ConnectTreeTable, {
      props: {
        columns: sampleColumns,
        rows: sampleRows
      },
      global: { stubs }
    })

    const toggleBtn = wrapper.find('[data-testid="toggle-expand-btn"]')
    expect(toggleBtn.exists()).toBe(true)

    // Click to expand
    await toggleBtn.trigger('click')

    // Now 4 rows should be visible (1 parent + 2 children + 1 standalone)
    const rows = wrapper.findAll('tbody tr')
    expect(rows.length).toBe(4)
    expect(rows[0].text()).toContain('STR-2026-001')
    expect(rows[1].text()).toContain('HRA-2026-001')
    expect(rows[2].text()).toContain('HRA-2026-002')
    expect(rows[3].text()).toContain('HRA-2026-999')
  })

  it('exposes expandAll, collapseAll, and areAllExpanded methods', async () => {
    const wrapper = mount(ConnectTreeTable, {
      props: {
        columns: sampleColumns,
        rows: sampleRows
      },
      global: { stubs }
    })

    const vm = wrapper.vm as any
    expect(vm.areAllExpanded).toBe(false)

    vm.expandAll()
    await wrapper.vm.$nextTick()

    expect(vm.areAllExpanded).toBe(true)
    expect(wrapper.findAll('tbody tr').length).toBe(4)

    vm.collapseAll()
    await wrapper.vm.$nextTick()

    expect(vm.areAllExpanded).toBe(false)
    expect(wrapper.findAll('tbody tr').length).toBe(2)
  })

  it('supports custom slot rendering for columns and slot bindings', () => {
    const wrapper = mount(ConnectTreeTable, {
      props: {
        columns: sampleColumns,
        rows: sampleRows,
        defaultExpandAll: true
      },
      slots: {
        'status-data': `
          <template #status-data="{ row, isChild }">
            <span class="custom-status" :data-child="isChild">{{ row.status }} (custom)</span>
          </template>
        `
      },
      global: { stubs }
    })

    const statuses = wrapper.findAll('.custom-status')
    expect(statuses.length).toBe(4)
    expect(statuses[0].text()).toBe('Active (custom)')
    expect(statuses[0].attributes('data-child')).toBe('false')
    expect(statuses[1].text()).toBe('Approved (custom)')
    expect(statuses[1].attributes('data-child')).toBe('true')
  })

  it('renders empty state when rows is empty', () => {
    const wrapper = mount(ConnectTreeTable, {
      props: {
        columns: sampleColumns,
        rows: [],
        emptyState: { label: 'No records available' }
      },
      global: { stubs }
    })

    expect(wrapper.find('.empty-state').text()).toContain('No records available')
  })
})
