import { testParsedToken } from '~/tests/mocks/mockData'

export const setupExaminer = async () => {
  // assigning token with a examiner login source
  useBcrosKeycloak().kc.tokenParsed = {
    ...testParsedToken,
    loginSource: 'IDIR'
  }
  await nextTick()
}

export const setupHost = async () => {
  useBcrosKeycloak().kc.tokenParsed = testParsedToken
  await nextTick()
}
