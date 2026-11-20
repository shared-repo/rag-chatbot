import { useEffect, useRef, useState } from 'react'
import { ApiError, GENERIC_ERROR } from '../api/client.js'
import { sendChat } from './chatApi.js'
import { getSessionId, loadMessages, saveMessages } from './chatStorage.js'
import { splitBold, stripCitationLine } from './formatAnswer.js'

export const WELCOME = '안녕하세요! 2040 서울도시기본계획에 대해 궁금한 점을 물어보세요.'
const TIMEOUT_ERROR = '응답 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.'
const TOO_LONG_ERROR = '질문은 1,000자 이내로 입력해 주세요.'
const MAX_CHARS = 1000

/** 봇 답변: "**굵게**"만 <strong>으로, 나머지는 텍스트 노드로 렌더링 (REQ-16-5). */
function BotText({ text }) {
  return splitBold(text).map((part, index) =>
    part.bold ? <strong key={index}>{part.text}</strong> : <span key={index}>{part.text}</span>,
  )
}

function ChatMessage({ message }) {
  const hasSources = Array.isArray(message.sources) && message.sources.length > 0
  const text = message.role === 'bot' && hasSources ? stripCitationLine(message.text) : message.text
  return (
    <div className={`chat-msg chat-msg--${message.role}`}>
      {message.role === 'bot' ? <BotText text={text} /> : text}
      {hasSources && (
        <div className="chat-msg__sources">
          참고 페이지: {message.sources.map((page) => `p.${page}`).join(', ')}
        </div>
      )}
    </div>
  )
}

/**
 * 챗봇 모달 (F3-4 ~ F3-17).
 * @param {{open: boolean, user: {id: number}, onClose: () => void, onSessionExpired: () => void}} props
 */
export default function ChatModal({ open, user, onClose, onSessionExpired }) {
  const dialogRef = useRef(null)
  const listRef = useRef(null)
  const inputRef = useRef(null)
  // 환영 메시지 (F3-6): 저장된 대화가 없을 때 첫 메시지로 둔다.
  const [messages, setMessages] = useState(() => {
    const saved = loadMessages(user.id)
    return saved.length > 0 ? saved : [{ role: 'bot', text: WELCOME }]
  })
  const [input, setInput] = useState('')
  const [pending, setPending] = useState(false)

  // 열기/닫기: <dialog>.showModal() 사용 (F3-17)
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) {
      return
    }
    if (open && !dialog.open) {
      dialog.showModal()
      inputRef.current?.focus()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  // 대화 내용 보관 (F3-10)
  useEffect(() => {
    saveMessages(user.id, messages)
  }, [user.id, messages])

  // 새 메시지·로딩 표시 시 맨 아래로
  useEffect(() => {
    const list = listRef.current
    if (list) {
      list.scrollTop = list.scrollHeight
    }
  }, [messages, pending, open])

  const addMessage = (message) => setMessages((current) => [...current, message])

  async function submit() {
    const text = input.trim()
    if (!text || pending) {
      return // F3-7: 빈 메시지는 전송하지 않음
    }
    if (text.length > MAX_CHARS) {
      addMessage({ role: 'error', text: TOO_LONG_ERROR })
      return
    }
    setInput('')
    addMessage({ role: 'user', text })
    setPending(true)
    try {
      const data = await sendChat(getSessionId(user.id), text)
      addMessage({
        role: 'bot',
        text: data.answer,
        sources: (data.sources || []).map((source) => source.page),
      })
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        onSessionExpired() // 세션 만료: 로그인 화면으로 (REQ-17-6)
        return
      }
      const message =
        error.name === 'AbortError' ? TIMEOUT_ERROR : error instanceof ApiError ? error.message : GENERIC_ERROR
      addMessage({ role: 'error', text: message })
    } finally {
      setPending(false)
      inputRef.current?.focus()
    }
  }

  function handleKeyDown(event) {
    // Enter: 전송, Shift+Enter: 줄바꿈. 한글 조합 중 Enter는 무시 (IME, F3-17)
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && event.keyCode !== 229) {
      event.preventDefault()
      submit()
    }
  }

  return (
    // ESC로 닫으면 브라우저가 close 이벤트를 보낸다. 배경(dialog 자체) 클릭도 닫기.
    <dialog
      ref={dialogRef}
      className="chat-dialog"
      aria-labelledby="chat-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) {
          onClose()
        }
      }}
    >
      <header className="chat-header">
        <h2 id="chat-title" className="chat-header__title">
          서울도시계획 챗봇
        </h2>
        <button type="button" className="chat-header__close" aria-label="챗봇 닫기" onClick={onClose}>
          ✕
        </button>
      </header>

      <div ref={listRef} className="chat-messages" role="log" aria-live="polite" aria-busy={pending}>
        {messages.map((message, index) => (
          <ChatMessage key={index} message={message} />
        ))}
        {pending && (
          <div className="chat-msg chat-msg--bot chat-typing" aria-label="답변을 작성하고 있습니다">
            <span />
            <span />
            <span />
          </div>
        )}
      </div>

      <form
        className="chat-form"
        autoComplete="off"
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        <label htmlFor="chat-input" className="visually-hidden">
          질문 입력
        </label>
        <textarea
          id="chat-input"
          ref={inputRef}
          className="chat-form__input"
          rows={2}
          maxLength={MAX_CHARS}
          placeholder="질문을 입력하세요 (Shift+Enter 줄바꿈)"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button type="submit" className="chat-form__send" disabled={pending}>
          전송
        </button>
      </form>
    </dialog>
  )
}
