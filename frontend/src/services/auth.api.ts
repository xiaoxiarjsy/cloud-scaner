import { http } from './http'

export interface LoginPayload {
  token: string
  user: { id: string; email: string; nickname: string }
}

export interface MeInfo {
  id: string
  email: string
  nickname: string
}

export const authApi = {
  login(email: string, password: string) {
    return http.post<LoginPayload>('/auth/login', { email, password })
  },
  logout() {
    return http.post<{ loggedOut: boolean }>('/auth/logout')
  },
  me() {
    return http.get<MeInfo>('/auth/me')
  }
}
