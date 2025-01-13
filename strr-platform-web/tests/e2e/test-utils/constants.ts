import { LoginSource } from '../enums/login-source'
export const loginMethods = [LoginSource.BCSC, LoginSource.BCEID]

// this will fail if these options are ever changed
export const listingSizeMap = {
  '1000 or more': 'Major (1000+ listings)',
  '250-999': 'Medium (250-999 listings)',
  '249 or less': 'Minor (under 250 listings)'
}
