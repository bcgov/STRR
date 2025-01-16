import type { ShallowRef, Component } from 'vue'
import { createSharedComposable } from '@vueuse/core'
import type { ExpansionState, Expansion, ComponentProps } from '~/types/strr-expansion'

export const expansionInjectionKey: InjectionKey<ShallowRef<ExpansionState>> = Symbol('strr-examiner-expansion')

function _useExpansion () {
  const expansionState = inject(expansionInjectionKey)

  const isExpanded = ref(false)

  function open<T extends Component> (component: T, props?: Expansion & ComponentProps<T>) {
    if (!expansionState) {
      throw new Error('useExpansion() is called without provider')
    }
    // Set the shared expansion state
    expansionState.value = {
      component,
      props: props ?? {}
    }
    isExpanded.value = true
  }

  function close () {
    if (!expansionState?.value) { return }

    isExpanded.value = false
    reset()
  }

  function reset () {
    if (!expansionState?.value) { return }

    expansionState.value = {
      component: 'div',
      props: {} as Expansion & ComponentProps<any>
    }
  }

  // TODO: implement ?
  /**
   * Update the expansion props partially.
   */
  // function patch<T extends Component = {}>(props: Partial<Expansion & ComponentProps<T>>) {
  //   expansionState.value = {
  //     ...expansionState.value,
  //     props: {
  //       ...expansionState.value.props,
  //       ...props
  //     }
  //   }
  // }

  return {
    open,
    close,
    reset,
    // patch,
    isExpanded
  }
}

export const useStrrExpansion = createSharedComposable(_useExpansion)
