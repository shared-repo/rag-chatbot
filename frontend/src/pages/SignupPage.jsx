import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { ApiError, GENERIC_ERROR } from '../api/client.js'
import { useAuth } from '../auth/authContext.js'
import SiteHeader from '../components/SiteHeader.jsx'
import { SIGNUP_DONE_NOTICE, validateSignup } from './signupRules.js'

/** 회원가입 화면 (REQ-16-2, REQ-17-1). 이메일 인증 과정은 없다. */
export default function SignupPage() {
  const { user, loading, signup } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '', passwordConfirm: '', nickname: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!loading && user) {
    return <Navigate to="/" replace />
  }

  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }))

  async function handleSubmit(event) {
    event.preventDefault()
    const message = validateSignup(form)
    if (message) {
      setError(message)
      return
    }
    setError('')
    setSubmitting(true)
    try {
      const created = await signup(form.email.trim(), form.password, form.nickname.trim())
      navigate('/login', { replace: true, state: { notice: SIGNUP_DONE_NOTICE, email: created.email } })
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
          <h1 className="auth-card__title">회원가입</h1>
          {error && (
            <p className="auth-card__error" role="alert">
              {error}
            </p>
          )}

          <div className="field">
            <label htmlFor="signup-email" className="field__label">
              아이디(이메일)
            </label>
            <input
              id="signup-email"
              type="email"
              name="email"
              autoComplete="username"
              maxLength={255}
              required
              value={form.email}
              onChange={update('email')}
            />
          </div>

          <div className="field">
            <label htmlFor="signup-password" className="field__label">
              비밀번호
            </label>
            <input
              id="signup-password"
              aria-describedby="signup-password-hint"
              type="password"
              name="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={64}
              required
              value={form.password}
              onChange={update('password')}
            />
            <span id="signup-password-hint" className="field__hint">8~64자</span>
          </div>

          <div className="field">
            <label htmlFor="signup-passwordConfirm" className="field__label">
              비밀번호 확인
            </label>
            <input
              id="signup-passwordConfirm"
              type="password"
              name="passwordConfirm"
              autoComplete="new-password"
              maxLength={64}
              required
              value={form.passwordConfirm}
              onChange={update('passwordConfirm')}
            />
          </div>

          <div className="field">
            <label htmlFor="signup-nickname" className="field__label">
              닉네임
            </label>
            <input
              id="signup-nickname"
              aria-describedby="signup-nickname-hint"
              type="text"
              name="nickname"
              autoComplete="nickname"
              minLength={2}
              maxLength={20}
              required
              value={form.nickname}
              onChange={update('nickname')}
            />
            <span id="signup-nickname-hint" className="field__hint">2~20자</span>
          </div>

          <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
            {submitting ? '가입 중…' : '회원가입'}
          </button>

          <p className="auth-card__switch">
            이미 회원이신가요? <Link to="/login">로그인</Link>
          </p>
        </form>
      </main>
    </>
  )
}
