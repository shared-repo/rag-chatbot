import { describe, expect, it, vi } from 'vitest'
import { installFakeServer, json } from '../test/fakeServer.js'
import { ApiError, GENERIC_ERROR, NETWORK_ERROR, apiRequest } from './client.js'

describe('apiRequest', () => {
  it('POST에는 XSRF-TOKEN 쿠키 값을 X-XSRF-TOKEN 헤더로 보낸다 (없으면 먼저 발급)', async () => {
    const { calls } = installFakeServer({ 'POST /api/x': () => json(200, { ok: true }) })

    await expect(apiRequest('/api/x', { method: 'POST', body: { a: 1 } })).resolves.toEqual({ ok: true })

    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual(['GET /api/auth/csrf', 'POST /api/x'])
    expect(calls[1].headers['X-XSRF-TOKEN']).toBe('test-csrf-token')
    expect(calls[1].headers['Content-Type']).toBe('application/json')
    expect(calls[1].body).toEqual({ a: 1 })
  })

  it('GET에는 CSRF 헤더를 붙이지 않는다', async () => {
    const { calls } = installFakeServer({ 'GET /api/y': () => json(200, { y: 1 }) })
    await apiRequest('/api/y')
    expect(calls).toHaveLength(1)
    expect(calls[0].headers['X-XSRF-TOKEN']).toBeUndefined()
  })

  it('오류 응답의 detail을 ApiError로 던진다', async () => {
    installFakeServer({ 'POST /api/z': () => json(409, { detail: '이미 가입된 이메일입니다.' }) })
    const error = await apiRequest('/api/z', { method: 'POST' }).catch((e) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(409)
    expect(error.message).toBe('이미 가입된 이메일입니다.')
  })

  it('JSON이 아닌 오류 본문은 일반 오류 문구로 바꾼다', async () => {
    installFakeServer({ 'GET /api/z': () => new Response('Bad Gateway', { status: 502 }) })
    await expect(apiRequest('/api/z')).rejects.toMatchObject({ status: 502, message: GENERIC_ERROR })
  })

  it('403이면 CSRF 토큰을 새로 받아 한 번만 다시 시도한다', async () => {
    let attempts = 0
    const { calls } = installFakeServer({
      'POST /api/r': () => {
        attempts += 1
        return attempts === 1 ? json(403, { detail: '거부' }) : json(200, { ok: true })
      },
    })
    await expect(apiRequest('/api/r', { method: 'POST' })).resolves.toEqual({ ok: true })
    expect(calls.filter((c) => c.url === '/api/auth/csrf')).toHaveLength(2)
  })

  it('204는 null을 돌려준다', async () => {
    installFakeServer({ 'POST /api/auth/logout': () => json(204) })
    await expect(apiRequest('/api/auth/logout', { method: 'POST' })).resolves.toBeNull()
  })

  it('연결 실패는 status 0의 ApiError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    await expect(apiRequest('/api/q')).rejects.toMatchObject({ status: 0, message: NETWORK_ERROR })
  })
})
