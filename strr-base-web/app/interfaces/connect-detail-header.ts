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
