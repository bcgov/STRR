export default defineAppConfig({
  strrBaseLayer: {
    page: {
      login: {
        redirectPath: '/auth/account/choose-existing'
        // options: { // allow all options?
        //   createAccount: false,
        //   idps: () => ['bceid', 'bcsc'] // function required to overwrite default value, will merge if no function
        // }
      }
    }
  },
  ui: {}
})
