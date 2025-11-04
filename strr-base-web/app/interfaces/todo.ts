export interface TodoButton {
  label: string
  action: Function
  colour?: string
  icon?: string
}

export interface Todo {
  id: string
  title: string
  buttons?: TodoButton[]
  subtitle?: string
  icon?: string
  iconClass?: string
  detail?: string
}
