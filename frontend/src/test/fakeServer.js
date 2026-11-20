import { vi } from 'vitest'

export const json = (status, body) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
  })

/**
 * fetch를 가짜 Spring Boot API로 바꾼다.
 * routes: { 'POST /api/auth/login': (request) => Response, ... }
 * /api/auth/csrf 는 기본으로 XSRF-TOKEN 쿠키를 발급한다.
 */
export function installFakeServer(routes = {}) {
  const calls = []
  const fetchMock = vi.fn(async (url, options = {}) => {
    const method = options.method || 'GET'
    const request = {
      url,
      method,
      headers: options.headers || {},
      body: options.body ? JSON.parse(options.body) : undefined,
    }
    calls.push(request)
    const handler = routes[`${method} ${url}`]
    if (handler) {
      return handler(request)
    }
    if (url === '/api/auth/csrf') {
      document.cookie = 'XSRF-TOKEN=test-csrf-token; path=/'
      return json(204)
    }
    if (url === '/api/auth/me') {
      return json(401, { detail: '로그인이 필요합니다.' })
    }
    return json(404, { detail: 'not found' })
  })
  vi.stubGlobal('fetch', fetchMock)
  return { calls, fetchMock }
}
