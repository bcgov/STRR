export default defineAppConfig({
  ui: {
    strategy: 'merge',
    button: {
      color: {
        red: {
          outline: 'text-red-600 border border-red-600 hover:bg-red-100'
        }
      }
    },
    input: {
      file: {
        base: 'file:text-gray-700 file:pt-2'
      },
      color: {
        red: {
          outline: 'bg-red-100 ring-0 border-red-600 placeholder-red-600 hover:bg-gray-200 ' +
            'focus:border-red-600 focus:border-b-2 focus:ring-0'
        },
        primary: {
          outline: 'bg-primary-50 ring-0 border-primary-500 hover:bg-gray-200 focus:border-b-2 focus:ring-0'
        }
      }
    },
    radioGroup: {
      wrapper: 'max-w-bcGovInput'
    },
    select: {
      color: {
        red: {
          outline: 'bg-red-100 border-red-600 ring-0 hover:bg-gray-200 ' +
            'focus:border-red-600 focus:border-b-2 focus:ring-0'
        }
      }
    },
    selectMenu: {
      input: 'bg-gray-100 text-gray-700 h-10 -mt-2 border-b-[1.5px] border-b-primary',
      popper: { offsetDistance: '0', placement: 'bottom-start', locked: 'true' },
      base: 'overflow-x-hidden',
      option: {
        selected: 'text-primary-500 bg-gray-100 pe-0',
        container: 'w-full',
        empty: 'text-gray-700'
      }
    },
    textarea: {
      base: 'bg-gray-100 hover:bg-gray-200 border-b text-gray-900 focus:border-b-2 h-20 hover:bg-gray-200',
      rounded: 'rounded-none rounded-t',
      color: {
        gray: {
          outline: 'placeholder-gray-700 ring-0 focus:ring-0 focus:placeholder-primary-500'
        },
        primary: {
          outline: 'bg-primary-50 border-primary-500 text-gray-900 ring-0 focus:ring-0'
        },
        red: {
          outline: 'bg-red-50 border-red-600 placeholder-red-600 ring-0 focus:ring-0'
        }
      }
    },
    tooltip: {
      container: 'z-20 group min-h-fit opacity-100'
    }
  }
})
