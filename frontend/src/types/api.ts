export interface ApiResponse<T> {
  code: string
  message: string
  data: T
  details?: unknown
  requestId: string
  timestamp: string
}

export interface PageResult<T> {
  items: T[]
  total?: number
  page: number
  pageSize: number
}
