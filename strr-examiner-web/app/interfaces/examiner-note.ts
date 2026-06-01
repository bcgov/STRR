export interface ExaminerNote {
  id: number
  timestamp: string
  username: string
  text: string
  event?: {
    label: string
    timestamp: string
  }
}
