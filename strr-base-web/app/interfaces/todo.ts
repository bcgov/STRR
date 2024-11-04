export interface TodoButton {
  label: string
  action: Function
  colour?: string
  icon?: string
}

export interface Todo {
  title: string
  button: TodoButton
  subtitle?: string
}
