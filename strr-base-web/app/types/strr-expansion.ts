export type ComponentProps<T> =
T extends new () => { $props: infer P } ? NonNullable<P> :
  T extends (props: infer P, ...args: any) => any ? P :
      {}

export interface Expansion {
  onClose?: () => void
}

export interface ExpansionState {
  component: Component | string
  props: Expansion
}
