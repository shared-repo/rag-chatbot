/**
 * Spring Boot API 호출 (REQ-16-3, REQ-17-5).
 * - 항상 같은 출처의 상대경로(/api/...)로 호출한다. 세션 쿠키는 브라우저가 자동으로 보낸다.
 * - POST 등 상태를 바꾸는 요청에는 XSRF-TOKEN 쿠키 값을 X-XSRF-TOKEN 헤더로 보낸다.
 * - 오류는 서버의 {"detail": "..."} 문구를 담은 ApiError로 던진다.
 */

const CSRF_COOKIE = 'XSRF-TOKEN'
const CSRF_HEADER = 'X-XSRF-TOKEN'
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export const GENERIC_ERROR = '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
export const NETWORK_ERROR = '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.'

export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export function readCookie(name) {
  const prefix = `${name}=`
  const found = document.cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith(prefix))
  return found ? decodeURIComponent(found.slice(prefix.length)) : null
}

/** XSRF-TOKEN 쿠키를 새로 받는다. */
export async function refreshCsrfToken() {
  try {
    await fetch('/api/auth/csrf', { credentials: 'same-origin' })
  } catch {
    // 연결 실패는 실제 요청에서 다시 드러난다
  }
}

async function readDetail(response) {
  try {
    const body = await response.json()
    if (body && typeof body.detail === 'string' && body.detail) {
      return body.detail
    }
  } catch {
    // JSON이 아닌 오류 본문 (예: 개발 서버 프록시 오류)
  }
  return GENERIC_ERROR
}

async function send(path, method, body, signal) {
  const headers = { Accept: 'application/json' }
  if (!SAFE_METHODS.has(method)) {
    if (!readCookie(CSRF_COOKIE)) {
      await refreshCsrfToken()
    }
    const token = readCookie(CSRF_COOKIE)
    if (token) {
      headers[CSRF_HEADER] = token
    }
  }
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }
  try {
    return await fetch(path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: 'same-origin',
      signal,
    })
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error
    }
    throw new ApiError(0, NETWORK_ERROR)
  }
}

/**
 * @param {string} path  예: '/api/auth/me'
 * @param {{method?: string, body?: unknown, signal?: AbortSignal}} [options]
 * @returns {Promise<any>} 응답 JSON (204면 null)
 */
export async function apiRequest(path, { method = 'GET', body, signal } = {}) {
  let response = await send(path, method, body, signal)

  // CSRF 토큰이 바뀐 경우(로그아웃 직후 등) 토큰을 새로 받아 한 번만 다시 시도한다.
  if (response.status === 403 && !SAFE_METHODS.has(method)) {
    await refreshCsrfToken()
    response = await send(path, method, body, signal)
  }

  if (!response.ok) {
    throw new ApiError(response.status, await readDetail(response))
  }
  if (response.status === 204) {
    return null
  }
  const text = await response.text()
  return text ? JSON.parse(text) : null
}
