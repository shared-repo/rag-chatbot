export const SIGNUP_DONE_NOTICE = '회원가입이 완료되었습니다. 로그인해 주세요.'

/** 화면에서 먼저 확인하는 입력 규칙 (서버 검증과 같음, REQ-17-2). */
export function validateSignup({ email, password, passwordConfirm, nickname }) {
  if (!/^[^\s@]+@[^\s@]+$/.test(email.trim()) || email.trim().length > 255) {
    return '이메일 형식이 올바르지 않습니다.'
  }
  if (password.length < 8 || password.length > 64 || new TextEncoder().encode(password).length > 72) {
    return '비밀번호는 8~64자로 입력해 주세요.'
  }
  if (password !== passwordConfirm) {
    return '비밀번호가 일치하지 않습니다.'
  }
  const trimmedNickname = nickname.trim()
  if (trimmedNickname.length < 2 || trimmedNickname.length > 20) {
    return '닉네임은 2~20자로 입력해 주세요.'
  }
  return ''
}
