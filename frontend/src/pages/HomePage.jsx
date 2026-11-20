import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useAuth } from '../auth/authContext.js'
import ChatModal from '../chat/ChatModal.jsx'
import SiteHeader from '../components/SiteHeader.jsx'

export const LOGIN_REQUIRED_NOTICE = '챗봇은 로그인한 뒤 이용할 수 있습니다.'
export const SESSION_EXPIRED_NOTICE = '로그인이 만료되었습니다. 다시 로그인해 주세요.'

/** home 화면 (F3-2, F3-3, REQ-16-2). 챗봇은 로그인한 사용자만 연다 (REQ-17-6). */
export default function HomePage() {
  const { user, loading, markLoggedOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  // 로그인 화면에서 돌아온 경우(state.openChat) 챗봇을 바로 연다.
  const openChatRequested = Boolean(location.state?.openChat)
  const [chatOpen, setChatOpen] = useState(openChatRequested)

  // 새로고침·뒤로가기 때 다시 열리지 않도록 history state를 지운다.
  useEffect(() => {
    if (openChatRequested) {
      navigate('.', { replace: true, state: null })
    }
  }, [openChatRequested, navigate])

  function goToLogin(notice) {
    navigate('/login', { state: { notice, openChat: true } })
  }

  function handleLauncherClick() {
    if (loading) {
      return
    }
    if (!user) {
      goToLogin(LOGIN_REQUIRED_NOTICE)
      return
    }
    setChatOpen(true)
  }

  function handleSessionExpired() {
    setChatOpen(false)
    markLoggedOut()
    goToLogin(SESSION_EXPIRED_NOTICE)
  }

  return (
    <>
      <SiteHeader />
      <main className="home">
        <section className="hero">
          <p className="hero__eyebrow">도시 계획 안내 챗봇</p>
          <h1 className="hero__title">2040 서울도시기본계획 안내</h1>
          <p className="hero__lead">서울의 미래 도시 공간 계획을 챗봇에게 물어보세요.</p>
          <p className="hero__desc">
            「2040 서울도시기본계획」 문서를 근거로 토지이용, 중심지 체계, 교통, 주거, 공원·녹지, 생활권 계획 등
            도시 계획에 관한 질문에 답변합니다. 화면 오른쪽 아래의 <strong>챗봇 문의</strong>를 눌러 시작하세요.
            {!user && !loading && ' 챗봇은 로그인한 뒤 이용할 수 있습니다.'}
          </p>
        </section>

        <section className="examples" aria-labelledby="examples-title">
          <h2 id="examples-title" className="examples__title">
            이런 질문을 할 수 있어요
          </h2>
          <ul className="examples__list">
            <li>2040 서울도시기본계획의 7대 목표는 무엇인가요?</li>
            <li>보행일상권이란 무엇인가요?</li>
            <li>서울의 중심지 체계는 어떻게 바뀌나요?</li>
            <li>수변 공간은 어떻게 활용하나요?</li>
          </ul>
          <p className="examples__note">도시 계획과 관련 없는 질문에는 답변하지 않습니다.</p>
        </section>
      </main>

      <footer className="footer">
        「2040 서울도시기본계획」 문서를 기반으로 답변하는 안내 챗봇입니다. 답변은 참고용이며, 정확한 내용은 원문을
        확인하세요.
      </footer>

      {/* 챗봇 열기 (F3-3) */}
      <button
        type="button"
        className="chat-launcher"
        aria-haspopup="dialog"
        aria-expanded={chatOpen}
        onClick={handleLauncherClick}
      >
        <span className="chat-launcher__icon" aria-hidden="true">
          💬
        </span>
        <span>챗봇 문의</span>
      </button>

      {user && (
        <ChatModal
          key={user.id}
          open={chatOpen}
          user={user}
          onClose={() => setChatOpen(false)}
          onSessionExpired={handleSessionExpired}
        />
      )}
    </>
  )
}
