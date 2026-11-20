import { useCallback, useEffect, useMemo, useState } from 'react'
import * as authApi from '../api/auth.js'
import { refreshCsrfToken } from '../api/client.js'
import { clearAllChats } from '../chat/chatStorage.js'
import { AuthContext } from './authContext.js'

/** 로그인 상태 (REQ-17). 앱 시작 시 /api/auth/me로 세션을 확인한다. */
export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    refreshCsrfToken()
      .then(() => authApi.fetchMe())
      .then((me) => {
        if (active) setUser(me)
      })
      .catch(() => {
        if (active) setUser(null)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const login = useCallback(async (email, password) => {
    const me = await authApi.login(email, password)
    setUser(me)
    return me
  }, [])

  const signup = useCallback((email, password, nickname) => authApi.signup(email, password, nickname), [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } finally {
      clearAllChats() // REQ-17-8
      setUser(null)
    }
  }, [])

  /** 서버 세션이 만료된 것을 알게 됐을 때 (401). */
  const markLoggedOut = useCallback(() => setUser(null), [])

  const value = useMemo(
    () => ({ user, loading, login, signup, logout, markLoggedOut }),
    [user, loading, login, signup, logout, markLoggedOut],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
