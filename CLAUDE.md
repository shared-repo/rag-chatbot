# CLAUDE.md

「2040 서울도시기본계획」 PDF를 근거로 답하는 RAG 챗봇. Python 배치(적재) + FastAPI/LangGraph(대화) + Spring Boot(인증·프록시 REST API) + React(화면) 4개 컴포넌트로 구성된다. 사용자 정보는 로컬 Docker MariaDB에 저장한다.

## 요구사항 문서

요구사항 상세는 아래 문서를 직접 읽고 따른다. 이 파일에 복사하지 않는다.

- `doc/requirements.md` — 확정된 요구사항(REQ-00~18): 모델, PDF 추출 검증, 실행 환경, 경로 기준, 인코딩, React 분리(REQ-16), 회원가입·로그인(REQ-17), MariaDB(REQ-18) 등 **최신 결정 사항**과 수용 기준 AC-10~25
- `doc/PRD.md` — 전체 기능 명세(F1~F3), API 명세, LangGraph 워크플로우, 화면 설계, 수용 기준 AC-1~9

두 문서의 내용이 다르면 **`doc/requirements.md`가 우선**한다. 구현 전 해당 컴포넌트의 요구사항 ID를 확인하고, 커밋 메시지·주석에서 ID(`F2-4`, `REQ-17-7` 등)로 참조한다.

## 기술 스택

| 영역 | 스택 |
|---|---|
| 배치 (`batch/`) | Python 3.13.18, pypdf / pymupdf, langchain-text-splitters, langchain-openai, chromadb |
| 챗봇 API (`api/`) | Python 3.13.18, FastAPI, uvicorn, LangGraph, langchain-openai, langchain-chroma, pydantic |
| 웹 API (`backend/`) | Java 21, Spring Boot 4.0.x, Gradle Wrapper, Spring Security(세션), Spring Data JPA, Flyway, MariaDB Connector/J |
| 프론트엔드 (`frontend/`) | Node.js v24.20.0 / npm 11.19.0, React, React Router, Vite, JavaScript(JSX), Vitest |
| LLM / 벡터 DB / DB | OpenAI API (모델은 `.env`로 설정), ChromaDB (로컬 영속 저장소), MariaDB (Docker, `localhost:3306/ragchatbot`) |

## 디렉터리 구조

```
rag-chatbot/
├── .env                 # OPENAI_API_KEY, DB_URL/DB_USERNAME/DB_PASSWORD — 절대 커밋·출력 금지
├── data-files/          # 원본 PDF (2040_seoul_plan.pdf)
├── doc/                 # PRD.md, requirements.md
├── chroma_db/           # 배치가 생성하는 벡터 DB (커밋 금지)
├── batch/               # PDF → ChromaDB 적재 배치 (진입점: ingest.py)
│   └── reports/         # --inspect 결과 리포트
├── api/                 # FastAPI 앱 (app/main.py, app/graph/ 에 LangGraph)
├── backend/             # Spring Boot REST API (/api/auth/*, /api/chat 프록시)
│   └── src/main/resources/db/migration/   # Flyway 스키마
└── frontend/            # React 앱 (home, 로그인, 회원가입 + 챗봇 모달)
```

`backend/` 패키지: `chat/`(FastAPI 프록시), `user/`(회원 엔티티·서비스·인증 API), `security/`(Spring Security 설정), `common/`(공통 오류 응답).
`frontend/src/`: `api/`(fetch·CSRF), `auth/`(로그인 상태), `pages/`, `components/`, `chat/`(챗봇 모달).

## 빌드 / 실행 / 테스트

Python은 반드시 Miniconda의 `python-env-313` 환경을 사용한다. `base` 환경에 패키지를 설치하거나 venv를 새로 만들지 않는다.

```bash
# Python 환경
conda activate python-env-313            # 비활성 상태에선: conda run -n python-env-313 <cmd>
conda env config vars set PYTHONUTF8=1 -n python-env-313   # 최초 1회 (한글 깨짐 방지)
pip install -r batch/requirements.txt
pip install -r api/requirements.txt

# 배치 (프로젝트 루트에서): 추출 품질 검증 → 리포트 확인 → 적재
python batch/ingest.py --inspect         # batch/reports/inspect_report.md 생성, 저장·임베딩 없음
python batch/ingest.py --reset --extractor pymupdf --exclude-pages 4-8   # 확정 설정 (requirements.md 2.2절)

# 챗봇 API (api/ 에서)
uvicorn app.main:app --port 8000 --reload

# 웹 API (backend/ 에서 실행해야 ../.env를 읽음, Windows는 .\gradlew.bat). MariaDB(Docker) 실행 필요
./gradlew bootRun                        # http://localhost:8080 (API 전용, 화면 없음)
./gradlew build

# 프론트엔드 (frontend/ 에서)
npm install
npm run dev                              # http://localhost:5173 — /api 는 :8080 으로 프록시
npm run build

# 테스트
pytest batch/tests
pytest api/tests                         # 단위 테스트 (OpenAI 호출 없음)
pytest api/tests -m integration          # 실제 OpenAI + chroma_db로 AC 확인 (비용 발생)
./gradlew test                           # backend/ 에서, H2 사용 (MariaDB 불필요)
npm test                                 # frontend/ 에서
```

실행 순서: MariaDB(Docker) → 배치 적재 → 챗봇 API(:8000) → 웹 API(:8080) → 프론트엔드(:5173).

## 코딩 규칙

### 공통
- 비밀값은 `.env`에서만 읽는다. API Key·DB 비밀번호를 코드·로그·응답·프론트엔드에 노출하지 않는다.
- `.env`, `chroma_db/`, `batch/reports/`, `frontend/node_modules/`, `frontend/dist/`는 `.gitignore`에 등록한다.
- 사용자에게 보이는 문구와 LLM 프롬프트는 한국어로 작성한다. 코드 식별자는 영어를 쓴다.
- 파일은 UTF-8로 읽고 쓴다(Windows 기본 인코딩에 의존하지 않는다).
- 요구사항 문서에 없는 기능을 임의로 추가하지 않는다. 필요하면 먼저 제안한다.
- API 오류 응답은 모두 `{"detail": "..."}` 형식이다.

### Python
- 타입 힌트를 필수로 쓰고, 요청·응답·설정 모델은 pydantic으로 정의한다.
- 설정은 `config.py` 한 곳에서 로드한다. 모델명·경로·top_k 등을 하드코딩하지 않는다.
- `.env`와 `chroma_db/` 경로는 **프로젝트 루트 기준**으로 계산한다(`Path(__file__)` 기반). 실행 위치(cwd)에 의존하지 않는다.
- 배치와 API는 같은 임베딩 모델·컬렉션명을 사용해야 한다.
- LangGraph 노드는 state → 부분 state를 반환하는 함수로 작성한다. LLM·검색은 `ChatLLM`·`Retriever` 프로토콜로 주입해 테스트에서 가짜로 바꾼다. 그래프는 앱 기동 시 1회만 컴파일한다.
- 체크포인터에 저장되는 state 값은 직렬화 가능한 타입(TypedDict, 기본 타입, 메시지)만 쓴다. 턴마다 바뀌는 값(`documents`)은 요청 입력에서 초기화한다.
- `print` 대신 `logging`을 쓴다. 질문 원문은 DEBUG 레벨에서만 기록한다.
- 의존성은 `requirements.txt`에 버전을 고정한다. PDF 라이브러리는 `batch/`에만 둔다.
- 테스트에서는 OpenAI 호출을 mock한다. 실제 API를 호출하는 테스트는 별도 마커(`@pytest.mark.integration`)로 분리한다.

### Java / Spring Boot
- Spring Boot 4.x / Spring Security 7 기준으로 작성한다(3.x 전용 API·예제를 그대로 쓰지 않는다). `build.gradle`에 Java toolchain 21을 지정한다.
- `backend/`은 REST API만 제공한다. 화면(Thymeleaf·정적 리소스)을 두지 않는다.
- 생성자 주입을 사용한다. 앱 설정값은 `application.yml`의 `@ConfigurationProperties`로 바인딩한다(FastAPI 주소: `chatbot.api.base-url`).
- DB 접속 정보는 `.env`의 `DB_URL`/`DB_USERNAME`/`DB_PASSWORD`를 `${...}`로 참조한다. 스키마 변경은 Flyway 마이그레이션 파일을 새로 추가한다(기존 `V*.sql` 수정 금지). JPA `ddl-auto`는 `validate`.
- 인증은 세션 쿠키 + CSRF(`XSRF-TOKEN` 쿠키 / `X-XSRF-TOKEN` 헤더)다. 비밀번호는 BCrypt로만 저장한다.
- FastAPI로는 사용자별로 바꾼 `session_id`를 보낸다(REQ-17-7).
- 테스트는 `test` 프로필(H2)로 실행해 MariaDB 없이 통과해야 한다.

### React
- JavaScript(JSX)로 작성한다. 함수 컴포넌트와 Hooks만 사용한다.
- API는 `src/api/client.js`를 거쳐 상대경로 `/api/...`로 호출한다. 브라우저는 FastAPI를 직접 호출하지 않는다.
- 봇 응답은 텍스트 노드로 렌더링한다. `dangerouslySetInnerHTML` 금지(XSS 방지).
- 대화 내용은 사용자별 키로 `sessionStorage`에 보관하고 로그아웃 시 지운다.
