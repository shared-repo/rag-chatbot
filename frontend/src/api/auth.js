import { ApiError, apiRequest } from './client.js'

/** 로그인한 사용자. 로그인하지 않았으면 null. */
export async function fetchMe() {
  try {
    return await apiRequest('/api/auth/me')
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null
    }
    throw error
  }
}

export function login(email, password) {
  return apiRequest('/api/auth/login', { method: 'POST', body: { email, password } })
}

export function signup(email, password, nickname) {
  return apiRequest('/api/auth/signup', { method: 'POST', body: { email, password, nickname } })
}

export function logout() {
  return apiRequest('/api/auth/logout', { method: 'POST' })
}
