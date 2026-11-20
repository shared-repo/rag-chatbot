import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { ApiError, GENERIC_ERROR } from '../api/client.js'
import { useAuth } from '../auth/authContext.js'
import SiteHeader from '../components/SiteHeader.jsx'

/** 로그인 화면 (REQ-16-2, REQ-17). */
export default function LoginPage() {
  const { user, loading, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state || {}
  const [email, setEmail] = useState(state.email || '')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!loading && user && !submitting) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(email.trim(), password)
      navigate('/', { replace: true, state: { openChat: Boolean(state.openChat) } })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : GENERIC_ERROR)
      setSubmitting(false)
    }
  }

  return (
    <>
      <SiteHeader />
      <main className="auth">
        <form className="auth-card" onSubmit={handleSubmit} noValidate>
          <h1 className="auth-card__title">로그인</h1>
          {state.notice && !error && (
            <p className="auth-card__notice" role="status">
              {state.notice}
            </p>
          )}
          {error && (
            <p className="auth-card__error" role="alert">
              {error}
            </p>
          )}

          <div className="field">
            <label htmlFor="login-email" className="field__label">
              아이디(이메일)
            </label>
            <input
              id="login-email"
              type="email"
              name="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="login-password" className="field__label">
              비밀번호
            </label>
            <input
              id="login-password"
              type="password"
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          <button type="submit" className="btn btn--primary btn--block" disabled={submitting || !email || !password}>
            {submitting ? '로그인 중…' : '로그인'}
          </button>

          <p className="auth-card__switch">
            아직 회원이 아니신가요? <Link to="/signup">회원가입</Link>
          </p>
        </form>
      </main>
    </>
  )
}
