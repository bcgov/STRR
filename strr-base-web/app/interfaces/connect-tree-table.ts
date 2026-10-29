export interface ConnectTreeTableColumn {
  key: string
  label: string
  sortable?: boolean
  class?: string
  [key: string]: any
}

export interface ConnectTreeTableRowMeta {
  isParent: boolean
  isChild: boolean
  isExpanded: boolean
  hasChildren: boolean
  isLastChild: boolean
  level: number
  parentId?: string | number
}

export interface ConnectTreeTableRow<T = any> {
  id: string | number
  children?: ConnectTreeTableRow<T>[]
  [key: string]: any
}

