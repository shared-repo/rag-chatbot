import { apiRequest } from '../api/client.js'

export const REQUEST_TIMEOUT_MS = 65000 // 서버 프록시 타임아웃(60초)보다 약간 길게

/** POST /api/chat (PRD 3.2.1). 로그인 필요 (REQ-17-6). */
export async function sendChat(sessionId, message) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    return await apiRequest('/api/chat', {
      method: 'POST',
      body: { session_id: sessionId, message },
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timer)
  }
}
