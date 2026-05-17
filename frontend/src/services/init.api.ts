import { http } from './http'

const baseURL = '/api'

export const initApi = {
  run() {
    return fetch(`${baseURL}/init`, { method: 'POST' })
  }
}
