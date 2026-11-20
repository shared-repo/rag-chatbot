import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import App from './App.jsx'
import AuthProvider from './auth/AuthProvider.jsx'
import { WELCOME } from './chat/ChatModal.jsx'
import { LOGIN_REQUIRED_NOTICE, SESSION_EXPIRED_NOTICE } from './pages/HomePage.jsx'
import { SIGNUP_DONE_NOTICE, validateSignup } from './pages/signupRules.js'
import { installFakeServer, json } from './test/fakeServer.js'

const USER = { id: 1, email: 'tester@example.com', nickname: '테스터' }
const SESSION_ID = '6f1c2b9e-1d2a-4a59-9d7e-1b2c3d4e5f60'

function renderApp(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  )
}

function loggedInServer(routes = {}) {
  return installFakeServer({ 'GET /api/auth/me': () => json(200, USER), ...routes })
}

async function openChat(user) {
  await user.click(await screen.findByRole('button', { name: /챗봇 문의/ }))
  return screen.findByRole('dialog', { name: '서울도시계획 챗봇' })
}

describe('로그인하지 않은 사용자', () => {
  it('챗봇 문의를 누르면 로그인 화면으로 이동한다 (AC-20)', async () => {
    const { calls } = installFakeServer()
    const user = userEvent.setup()
    renderApp()

    expect(await screen.findByRole('link', { name: '로그인' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /챗봇 문의/ }))

    expect(await screen.findByRole('heading', { name: '로그인' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(LOGIN_REQUIRED_NOTICE)
    expect(calls.some((c) => c.url === '/api/chat')).toBe(false)
  })

  it('로그인하면 home으로 돌아와 챗봇이 열린다', async () => {
    const { calls } = installFakeServer({ 'POST /api/auth/login': () => json(200, USER) })
    const user = userEvent.setup()
    renderApp()

    await user.click(await screen.findByRole('button', { name: /챗봇 문의/ }))
    await user.type(await screen.findByLabelText('아이디(이메일)'), ' tester@example.com ')
    await user.type(screen.getByLabelText('비밀번호'), 'password123!')
    await user.click(screen.getByRole('button', { name: '로그인' }))

    const dialog = await screen.findByRole('dialog', { name: '서울도시계획 챗봇' })
    expect(within(dialog).getByText(WELCOME)).toBeInTheDocument()
    expect(screen.getByText('테스터')).toBeInTheDocument()

    const login = calls.find((c) => c.url === '/api/auth/login')
    expect(login.body).toEqual({ email: 'tester@example.com', password: 'password123!' })
    expect(login.headers['X-XSRF-TOKEN']).toBe('test-csrf-token')
  })

  it('로그인 실패 문구를 보여준다', async () => {
    installFakeServer({
      'POST /api/auth/login': () => json(401, { detail: '이메일 또는 비밀번호가 올바르지 않습니다.' }),
    })
    const user = userEvent.setup()
    renderApp('/login')

    await user.type(await screen.findByLabelText('아이디(이메일)'), 'tester@example.com')
    await user.type(screen.getByLabelText('비밀번호'), 'wrong-password')
    await user.click(screen.getByRole('button', { name: '로그인' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('이메일 또는 비밀번호가 올바르지 않습니다.')
  })
})

describe('회원가입', () => {
  it('입력 규칙을 화면에서 먼저 확인한다', () => {
    const ok = { email: 'a@b.kr', password: 'password1', passwordConfirm: 'password1', nickname: '닉네임' }
    expect(validateSignup(ok)).toBe('')
    expect(validateSignup({ ...ok, email: 'nope' })).toBe('이메일 형식이 올바르지 않습니다.')
    expect(validateSignup({ ...ok, password: 'short', passwordConfirm: 'short' })).toBe(
      '비밀번호는 8~64자로 입력해 주세요.',
    )
    expect(validateSignup({ ...ok, passwordConfirm: 'different' })).toBe('비밀번호가 일치하지 않습니다.')
    expect(validateSignup({ ...ok, nickname: ' 가 ' })).toBe('닉네임은 2~20자로 입력해 주세요.')
  })

  it('가입에 성공하면 로그인 화면으로 이동하고 이메일을 채워 둔다 (AC-18)', async () => {
    const { calls } = installFakeServer({
      'POST /api/auth/signup': (req) => json(201, { id: 1, email: req.body.email.toLowerCase(), nickname: '테스터' }),
    })
    const user = userEvent.setup()
    renderApp('/signup')

    await user.type(await screen.findByLabelText('아이디(이메일)'), 'Tester@Example.com')
    await user.type(screen.getByLabelText('비밀번호'), 'password123!')
    await user.type(screen.getByLabelText('비밀번호 확인'), 'password123!')
    await user.type(screen.getByLabelText('닉네임'), '테스터')
    await user.click(screen.getByRole('button', { name: '회원가입' }))

    expect(await screen.findByRole('heading', { name: '로그인' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(SIGNUP_DONE_NOTICE)
    expect(screen.getByLabelText('아이디(이메일)')).toHaveValue('tester@example.com')
    expect(calls.find((c) => c.url === '/api/auth/signup').body).toEqual({
      email: 'Tester@Example.com',
      password: 'password123!',
      nickname: '테스터',
    })
  })

  it('중복 이메일 오류를 보여준다 (AC-19)', async () => {
    installFakeServer({ 'POST /api/auth/signup': () => json(409, { detail: '이미 가입된 이메일입니다.' }) })
    const user = userEvent.setup()
    renderApp('/signup')

    await user.type(await screen.findByLabelText('아이디(이메일)'), 'tester@example.com')
    await user.type(screen.getByLabelText('비밀번호'), 'password123!')
    await user.type(screen.getByLabelText('비밀번호 확인'), 'password123!')
    await user.type(screen.getByLabelText('닉네임'), '테스터')
    await user.click(screen.getByRole('button', { name: '회원가입' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('이미 가입된 이메일입니다.')
  })
})

describe('로그인한 사용자의 챗봇', () => {
  it('질문을 보내고 답변·출처를 텍스트로 표시한다 (AC-21, REQ-16-5)', async () => {
    sessionStorage.setItem('seoulplan.chat.1.sessionId', SESSION_ID)
    const { calls } = loggedInServer({
      'POST /api/chat': () =>
        json(200, {
          session_id: SESSION_ID,
          answer: '**보행일상권**은 <img src=x onerror=alert(1)> 입니다.\n참고: p.54',
          category: 'urban_planning',
          sources: [{ page: 54, snippet: '...' }],
        }),
    })
    const user = userEvent.setup()
    renderApp()

    const dialog = await openChat(user)
    await user.type(within(dialog).getByLabelText('질문 입력'), '보행일상권이란?{Enter}')

    expect(await within(dialog).findByText('참고 페이지: p.54')).toBeInTheDocument()
    expect(within(dialog).getByText('보행일상권이란?')).toHaveClass('chat-msg--user')
    expect(within(dialog).getByText('보행일상권').tagName).toBe('STRONG')
    expect(within(dialog).getByText(/<img src=x onerror=alert\(1\)>/)).toBeInTheDocument()
    expect(dialog.querySelector('img')).toBeNull()
    expect(within(dialog).queryByText(/참고: p\.54/)).toBeNull()

    const chat = calls.find((c) => c.url === '/api/chat')
    expect(chat.body).toEqual({ session_id: SESSION_ID, message: '보행일상권이란?' })
    expect(chat.headers['X-XSRF-TOKEN']).toBe('test-csrf-token')
    expect(JSON.parse(sessionStorage.getItem('seoulplan.chat.1.messages'))).toHaveLength(3)
  })

  it('Shift+Enter는 줄바꿈이고 빈 메시지는 보내지 않는다 (F3-7)', async () => {
    const { calls } = loggedInServer()
    const user = userEvent.setup()
    renderApp()

    const dialog = await openChat(user)
    const input = within(dialog).getByLabelText('질문 입력')
    await user.type(input, '   {Enter}')
    await user.type(input, '첫 줄{Shift>}{Enter}{/Shift}둘째 줄')

    expect(input).toHaveValue('   첫 줄\n둘째 줄')
    expect(calls.some((c) => c.url === '/api/chat')).toBe(false)
  })

  it('서버 오류는 오류 말풍선으로 표시한다 (AC-9)', async () => {
    loggedInServer({
      'POST /api/chat': () => json(503, { detail: '챗봇 서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.' }),
    })
    const user = userEvent.setup()
    renderApp()

    const dialog = await openChat(user)
    await user.type(within(dialog).getByLabelText('질문 입력'), '질문{Enter}')

    expect(await within(dialog).findByText('챗봇 서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.')).toHaveClass(
      'chat-msg--error',
    )
  })

  it('세션이 만료되면(401) 로그인 화면으로 보낸다', async () => {
    loggedInServer({ 'POST /api/chat': () => json(401, { detail: '로그인이 필요합니다.' }) })
    const user = userEvent.setup()
    renderApp()

    const dialog = await openChat(user)
    await user.type(within(dialog).getByLabelText('질문 입력'), '질문{Enter}')

    expect(await screen.findByRole('heading', { name: '로그인' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(SESSION_EXPIRED_NOTICE)
  })

  it('닫았다 열어도 대화가 유지되고, 로그아웃하면 지워진다 (AC-8, AC-22)', async () => {
    const { calls } = loggedInServer({
      'POST /api/chat': () => json(200, { session_id: SESSION_ID, answer: '답변', category: 'off_topic', sources: [] }),
      'POST /api/auth/logout': () => json(204),
    })
    const user = userEvent.setup()
    renderApp()

    let dialog = await openChat(user)
    await user.type(within(dialog).getByLabelText('질문 입력'), '질문{Enter}')
    await within(dialog).findByText('답변')

    await user.click(within(dialog).getByRole('button', { name: '챗봇 닫기' }))
    await waitFor(() => expect(dialog).not.toHaveAttribute('open'))
    dialog = await openChat(user)
    expect(within(dialog).getByText('답변')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: '챗봇 닫기' }))

    await user.click(screen.getByRole('button', { name: '로그아웃' }))

    expect(await screen.findByRole('link', { name: '로그인' })).toBeInTheDocument()
    expect(sessionStorage.getItem('seoulplan.chat.1.messages')).toBeNull()
    expect(screen.queryByRole('dialog', { hidden: true })).toBeNull()
    expect(calls.some((c) => c.url === '/api/auth/logout')).toBe(true)
  })
})
