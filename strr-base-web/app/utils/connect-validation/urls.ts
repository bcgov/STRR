import { z } from 'zod'

export const httpRegex = /^(https?:\/\/)([\w-]+(\.[\w-]+)+\.?(:\d+)?(\/.*)?)$/i

export const getOptionalUrl = (message: string) =>
  z.string().refine(e => e.trim() === '' || httpRegex.test(e), message)

export const getRequiredUrl = (message: string) =>
  z.string().refine(e => e.trim() !== '' && httpRegex.test(e), message)
