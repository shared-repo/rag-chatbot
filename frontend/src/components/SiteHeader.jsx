import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../auth/authContext.js'

export default function SiteHeader() {
  const { user, loading, logout } = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)

  async function handleLogout() {
    setBusy(true)
    try {
      await logout()
    } catch {
      // 서버 오류여도 화면에서는 로그아웃 처리됨
    } finally {
      setBusy(false)
      navigate('/', { replace: true })
    }
  }

  return (
    <header className="site-header">
      <Link to="/" className="site-header__brand">
        2040 서울도시기본계획 안내
      </Link>
      {!loading && (
        <nav className="site-header__nav" aria-label="계정">
          {user ? (
            <>
              <span className="site-header__user">
                <strong>{user.nickname}</strong>님
              </span>
              <button type="button" className="btn btn--ghost" onClick={handleLogout} disabled={busy}>
                로그아웃
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn--ghost">
                로그인
              </Link>
              <Link to="/signup" className="btn btn--primary">
                회원가입
              </Link>
            </>
          )}
        </nav>
      )}
    </header>
  )
}
