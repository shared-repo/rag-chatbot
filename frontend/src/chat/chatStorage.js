/**
 * 대화 내용과 session_id를 sessionStorage에 사용자별로 보관한다 (F3-10, REQ-17-8).
 * 로그아웃하면 clearAllChats()로 모두 지운다.
 */

const PREFIX = 'seoulplan.chat.'

const sessionKey = (userId) => `${PREFIX}${userId}.sessionId`
const messagesKey = (userId) => `${PREFIX}${userId}.messages`

export function createUuid() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID()
  }
  // randomUUID를 지원하지 않는 환경(비보안 컨텍스트 등)용 RFC 4122 v4
  const bytes = window.crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export function getSessionId(userId) {
  let id = sessionStorage.getItem(sessionKey(userId))
  if (!id) {
    id = createUuid()
    sessionStorage.setItem(sessionKey(userId), id)
  }
  return id
}

export function loadMessages(userId) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(messagesKey(userId)) || '[]')
    return Array.isArray(saved) ? saved : []
  } catch {
    return []
  }
}

export function saveMessages(userId, messages) {
  try {
    sessionStorage.setItem(messagesKey(userId), JSON.stringify(messages))
  } catch {
    // 저장 공간 부족 등: 화면 표시에는 영향 없음
  }
}

export function clearAllChats() {
  const keys = []
  for (let i = 0; i < sessionStorage.length; i += 1) {
    const key = sessionStorage.key(i)
    if (key && key.startsWith(PREFIX)) {
      keys.push(key)
    }
  }
  keys.forEach((key) => sessionStorage.removeItem(key))
}
