# frontend

「2040 서울도시기본계획」 챗봇의 React 화면 (REQ-16). home, 로그인, 회원가입 화면과 챗봇 모달을 제공한다.
API는 같은 출처의 `/api/*`로만 호출하며, 개발 서버(Vite)가 Spring Boot(`http://localhost:8080`)로 프록시한다.

## 실행

```bash
npm install
npm run dev      # http://localhost:5173  (Spring Boot :8080, FastAPI :8000 실행 필요)
npm test         # Vitest + Testing Library (서버 불필요)
npm run lint     # oxlint
npm run build    # dist/ 생성
```

## 구조

| 경로 | 내용 |
|---|---|
| `src/api/client.js` | fetch 래퍼: CSRF 헤더(`X-XSRF-TOKEN`), `{"detail"}` 오류 → `ApiError` |
| `src/api/auth.js` | `/api/auth/*` 호출 |
| `src/auth/` | 로그인 상태 (`AuthProvider`, `useAuth`) |
| `src/pages/` | `HomePage`, `LoginPage`, `SignupPage` |
| `src/chat/` | 챗봇 모달, 대화 보관(sessionStorage, 사용자별), 답변 서식 |
| `src/index.css` | 전체 스타일 (기존 `chat.css` 이전) |
