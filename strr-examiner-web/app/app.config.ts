/* eslint-disable max-len */
import { RoutesE } from '~/enums/routes'

export default defineAppConfig({
  connect: {
    core: {
      login: {
        redirectPath: '',
        idps: () => ['idir']
      },
      header: {
        options: {
          localeSelect: false,
          unauthenticated: {
            whatsNew: false,
            loginMenu: false,
            createAccount: false
          },
          authenticated: {
            notifications: true,
            accountOptionsMenu: true
          }
        }
      },
      plugin: {
        authApi: {
          errorRedirect: {
            401: '/auth/login'
          }
        },
        payApi: {
          errorRedirect: {
            401: '/auth/login'
          }
        }
      }
    }
  },
  strrBaseLayer: {
    page: {
      login: {
        redirectPath: RoutesE.DASHBOARD,
        options: {
          createAccount: false,
          idps: () => ['idir'] // function required to overwrite default value, will merge if no function
        }
      }
    }
  },
  ui: {
    button: {
      variant: {
        select_menu_trigger: 'border-gray-700 focus-visible:border-primary-500 bg-gray-100 hover:bg-gray-200 border-b-[1px] focus-visible:border-b-2 focus:ring-0 h-[42px] rounded-t-m rounded-b-none',
        combobox: 'bg-[#F1F3F5] hover:bg-gray-200 border-b-[1px] rounded-none rounded-t-md'
      }
    }
  }
})
