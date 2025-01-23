import { type Duration } from 'date-fns'

export type CustomDuration = {
  start: Date | null
  end: Date | null
}

export type Range = {
  label: string,
  duration: Duration | CustomDuration
}
