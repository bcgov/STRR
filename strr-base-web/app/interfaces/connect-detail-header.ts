export interface ConnectDetailHeaderSideDetail {
  label: string
  value: string
  edit?: {
    isEditing: boolean,
    validation?: {
      error: string
      validate: (val: string) => string
    }
    action: Function
  }
}

export interface ConnectDetailHeaderItem {
  text: string
  itemClass?: string
  icon?: string
  iconClass?: string
  chip?: boolean
  chipColour?: string
  link?: boolean
  linkHref?: string
}

export interface ConnectDetailHeaderBtn {
  action: Function
  label: string
  icon?: string
  loading?: boolean
  trailingIcon?: string
}
