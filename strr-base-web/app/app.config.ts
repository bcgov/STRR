/* eslint-disable max-len */
export default defineAppConfig({
  ui: {
    strategy: 'merge',
    button: {
      color: {
        red: {
          outline: 'text-red-600 border border-red-600 hover:bg-red-100'
        }
      },
      gap: { sm: 'gap-x-2.5' }
    },
    input: {
      file: {
        base: 'file:text-gray-700 file:pt-2'
      },
      color: {
        gray: {
          outline: 'bg-gray-100 ring-0 disabled:hover:bg-gray-100 disabled:hover:border-gray-500  hover:bg-gray-200 hover:border-gray-600 focus:border-primary-500 focus:border-b-2 focus:ring-0'
        },
        red: {
          outline: 'bg-red-100 ring-0 border-red-600 placeholder-red-600 focus:border-red-600 focus:border-b-2 focus:ring-0'
        },
        primary: {
          outline: 'bg-primary-50 ring-0 border-primary-500 focus:border-b-2 focus:ring-0'
        }
      }
    },
    radioGroup: {
      wrapper: 'max-w-bcGovInput'
    },
    select: {
      color: {
        gray: {
          outline: 'bg-gray-100 ring-0 disabled:hover:bg-gray-100 hover:bg-gray-200 hover:border-gray-600 focus:border-primary-500 focus:border-b-2 focus:ring-0'
        },
        primary: {
          outline: 'bg-primary-50 ring-0 border-primary-500 disabled:hover:bg-primary-50 focus:border-b-2 focus:ring-0'
        },
        red: {
          outline: 'bg-red-100 border-red-600 ring-0 focus:border-red-600 focus:border-b-2 focus:ring-0'
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
