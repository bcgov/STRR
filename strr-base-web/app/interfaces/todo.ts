export interface TodoButton {
  label: string
  action: Function
  colour?: string
  icon?: string
}

export interface Todo {
  id: string
  title: string
  button?: TodoButton
  subtitle?: string
  icon?: string
  iconClass?: string
}
