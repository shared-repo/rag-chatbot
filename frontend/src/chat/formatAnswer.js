/** 출처를 따로 표시하므로 답변 끝의 "참고: p.X" 줄은 화면에서 뺀다. */
export function stripCitationLine(text) {
  return text.replace(/\n*참고\s*:[^\n]*\s*$/, '').trimEnd()
}

/**
 * "**굵게**" 표기를 [{text, bold}] 조각으로 나눈다 (F3-17, REQ-16-5).
 * 화면에서는 조각을 텍스트 노드/<strong>으로 렌더링하며 HTML로 해석하지 않는다.
 */
export function splitBold(text) {
  return text
    .split(/\*\*(.+?)\*\*/g)
    .map((part, index) => ({ text: part, bold: index % 2 === 1 }))
    .filter((part) => part.text)
}
