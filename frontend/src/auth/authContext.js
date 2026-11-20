import { createContext, useContext } from 'react'

/** @type {import('react').Context<null | {
 *   user: null | {id: number, email: string, nickname: string},
 *   loading: boolean,
 *   login: (email: string, password: string) => Promise<object>,
 *   signup: (email: string, password: string, nickname: string) => Promise<object>,
 *   logout: () => Promise<void>,
 *   markLoggedOut: () => void,
 * }>} */
export const AuthContext = createContext(null)

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) {
    throw new Error('useAuth는 AuthProvider 안에서만 사용할 수 있습니다.')
  }
  return value
}
