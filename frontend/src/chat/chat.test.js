import { describe, expect, it } from 'vitest'
import { clearAllChats, getSessionId, loadMessages, saveMessages } from './chatStorage.js'
import { splitBold, stripCitationLine } from './formatAnswer.js'

describe('formatAnswer', () => {
  it('답변 끝의 참고 줄을 뺀다', () => {
    expect(stripCitationLine('보행일상권은 ...\n\n참고: p.54, p.55')).toBe('보행일상권은 ...')
    expect(stripCitationLine('참고 없는 답변')).toBe('참고 없는 답변')
  })

  it('**굵게**를 조각으로 나눈다', () => {
    expect(splitBold('a **b** c')).toEqual([
      { text: 'a ', bold: false },
      { text: 'b', bold: true },
      { text: ' c', bold: false },
    ])
  })
})

describe('chatStorage', () => {
  it('session_id와 대화를 사용자별로 보관한다', () => {
    const first = getSessionId(1)
    expect(first).toMatch(/^[0-9a-f-]{36}$/)
    expect(getSessionId(1)).toBe(first)
    expect(getSessionId(2)).not.toBe(first)

    saveMessages(1, [{ role: 'user', text: '안녕' }])
    expect(loadMessages(1)).toEqual([{ role: 'user', text: '안녕' }])
    expect(loadMessages(2)).toEqual([])
  })

  it('clearAllChats는 챗봇 키만 지운다 (REQ-17-8)', () => {
    saveMessages(1, [{ role: 'user', text: '안녕' }])
    getSessionId(1)
    sessionStorage.setItem('other', 'keep')

    clearAllChats()

    expect(loadMessages(1)).toEqual([])
    expect(sessionStorage.getItem('other')).toBe('keep')
    expect(sessionStorage.length).toBe(1)
  })

  it('깨진 저장값은 빈 대화로 본다', () => {
    sessionStorage.setItem('seoulplan.chat.1.messages', '{broken')
    expect(loadMessages(1)).toEqual([])
  })
})
