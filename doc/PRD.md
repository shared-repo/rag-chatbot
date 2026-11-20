# PRD: 2040 서울도시기본계획 RAG 챗봇

| 항목 | 내용 |
|---|---|
| 문서 버전 | v1.3 |
| 작성일 | 2026-11-03 |
| 상태 | Draft |
| 관련 문서 | [requirements.md](./requirements.md) (확정 요구사항, 이 문서와 다르면 requirements.md 우선) |
| 변경 사항 | v1.1: requirements.md v1.4 확정 사항 반영 — 추출 품질 검증(`--inspect`), 임베딩 모델 검증, 경로 기준, 실행 환경 버전, 인코딩<br>v1.2: requirements.md v1.7 반영 표기 — React 프론트엔드 분리, 회원가입·로그인, MariaDB. **화면·인증·DB 상세는 requirements.md 2.7~2.9절을 따른다.**<br>v1.3: requirements.md v1.9 반영 — Java 21 |

---

## 1. 개요

### 1.1 배경
「2040 서울도시기본계획」은 서울시의 장기 도시 공간 정책을 담은 방대한 문서로, 일반 사용자가 원하는 정보를 직접 찾기 어렵다. 이 문서를 기반으로 질의응답이 가능한 RAG(Retrieval-Augmented Generation) 챗봇을 제공하여 도시 계획 정보 접근성을 높인다.

### 1.2 목표
- `data-files/2040_seoul_plan.pdf`를 벡터 DB(ChromaDB)에 적재하는 배치 프로그램 제공
- 도시 계획 관련 질문에 대해 문서 근거 기반 답변 생성
- 도시 계획과 무관한 질문은 정중히 거절하고 답변 가능 범위 안내
- 웹 홈 화면 우측 하단의 링크로 여는 모달 팝업 챗봇 UI 제공

### 1.3 범위 외 (Non-Goals)
- ~~회원가입/로그인 등 사용자 인증~~ → v1.2에서 범위에 포함 (requirements.md REQ-17)
- ~~home 이외의 웹 화면~~ → v1.2에서 로그인·회원가입 화면 추가 (requirements.md REQ-16-2)
- 2040_seoul_plan.pdf 이외 문서의 적재
- 대화 이력의 영구 저장(DB 저장)
- 운영 환경 배포 자동화(CI/CD)

---

## 2. 시스템 구성

### 2.1 컴포넌트

| # | 컴포넌트 | 기술 스택 | 역할 |
|---|---|---|---|
| 1 | 데이터 적재 배치 (`batch`) | Python, ChromaDB, OpenAI Embeddings | PDF 파싱 → 청크 분할 → 임베딩 → ChromaDB 저장 |
| 2 | 챗봇 API 서비스 (`api`) | Python, FastAPI, LangGraph, ChromaDB, OpenAI ChatGPT API | 질문 분류, 벡터 검색, 답변 생성 |
| 3 | 웹 애플리케이션 (`backend`) | Java, Spring Boot, Thymeleaf, JavaScript | home 화면, 챗봇 모달 UI, 챗봇 API 프록시 |

### 2.2 아키텍처

```
┌──────────────┐     ┌────────────────────────┐     ┌──────────────────────────┐
│   Browser    │────▶│  Spring Boot (backend) │────▶│  FastAPI (api)           │
│ home + 모달  │◀────│  :8080                 │◀────│  :8000                   │
└──────────────┘     │  GET  /                │     │  POST /api/chat          │
                     │  POST /api/chat (프록시)│     │  ┌────────────────────┐  │
                     └────────────────────────┘     │  │ LangGraph Workflow │  │
                                                    │  └─────────┬──────────┘  │
                                                    └────────────┼─────────────┘
                                                                 │
                              ┌──────────────────┐     ┌─────────▼─────────┐
                              │  OpenAI API      │◀────│   ChromaDB        │
                              │ (Chat/Embedding) │     │ (persistent dir)  │
                              └──────────────────┘     └─────────▲─────────┘
                                                                 │
┌───────────────────────────────┐                                │
│ batch (Python)                │────────────────────────────────┘
│ data-files/2040_seoul_plan.pdf│
└───────────────────────────────┘
```

- 브라우저는 Spring Boot에만 접근하고, Spring Boot가 FastAPI를 서버 측에서 호출한다(CORS 회피, 내부 API 은닉).
- 배치와 챗봇 API는 동일한 ChromaDB 저장 경로 및 컬렉션을 공유한다. 경로는 실행 위치와 관계없이 프로젝트 루트 기준으로 해석한다(REQ-13).

### 2.3 디렉터리 구조 (안)

```
rag-chatbot/
├── .env                      # OPENAI_API_KEY 등 (Git 제외)
├── CLAUDE.md                 # 개발 가이드 (스택, 명령, 코딩 규칙)
├── data-files/
│   └── 2040_seoul_plan.pdf
├── doc/
│   ├── PRD.md
│   └── requirements.md
├── chroma_db/                # ChromaDB 영속 저장소 (배치 생성, Git 제외)
├── batch/
│   ├── ingest.py             # 배치 진입점 (적재 / --inspect 검증 모드)
│   ├── config.py             # .env 로딩, 프로젝트 루트 기준 경로 계산
│   ├── loader.py             # PDF 로딩/정제 (pypdf | pymupdf)
│   ├── splitter.py           # 청크 분할
│   ├── inspector.py          # 추출 품질 검증 리포트 생성
│   ├── reports/              # inspect_report.md (Git 제외)
│   ├── tests/
│   └── requirements.txt
├── api/
│   ├── app/
│   │   ├── main.py           # FastAPI 앱
│   │   ├── config.py         # .env 로딩, 프로젝트 루트 기준 경로 계산
│   │   ├── schemas.py        # 요청/응답 모델
│   │   ├── prompts.py        # 분류·생성 프롬프트, 고정 응답 문구
│   │   ├── llm.py            # ChatGPT 호출 래퍼 (분류: 구조화 출력, 생성)
│   │   ├── graph/
│   │   │   ├── state.py      # LangGraph State
│   │   │   ├── nodes.py      # classify / retrieve / generate / reject
│   │   │   └── workflow.py   # 그래프 구성
│   │   └── vectorstore.py    # ChromaDB 접근, 임베딩 모델 일치 검증
│   ├── tests/
│   └── requirements.txt
└── backend/                  # Spring Boot 프로젝트
    ├── build.gradle
    ├── settings.gradle
    ├── gradlew, gradlew.bat  # Gradle Wrapper
    ├── gradle/wrapper/
    └── src/
        ├── main/
        │   ├── java/kr/seoulplan/web/
        │   │   ├── WebApplication.java
        │   │   ├── HomeController.java          # GET / → home
        │   │   └── chat/
        │   │       ├── ChatProxyController.java # POST /api/chat → FastAPI 프록시
        │   │       ├── ChatbotApiClient.java    # RestClient 호출, 오류 → 상태 코드 변환
        │   │       ├── ChatbotClientConfig.java # 타임아웃 설정한 RestClient
        │   │       ├── ChatbotApiProperties.java# chatbot.api.* 설정
        │   │       ├── ChatbotApiException.java
        │   │       └── ChatDtos.java            # 요청/응답 record (snake_case JSON)
        │   └── resources/
        │       ├── application.yml
        │       ├── templates/home.html
        │       └── static/{css/chat.css, js/chat.js}
        └── test/java/.../
```

---

## 3. 기능 요구사항

### 3.1 [F1] 데이터 적재 배치 프로그램 (Python)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| F1-1 | `data-files/2040_seoul_plan.pdf`를 페이지 단위로 읽어 텍스트를 추출한다. | 필수 |
| F1-2 | 추출 텍스트의 불필요한 공백·반복 머리말/꼬리말·빈 페이지를 정제한다. | 필수 |
| F1-3 | 텍스트를 청크로 분할한다. 기본값: `chunk_size=1000`자, `chunk_overlap=200`자 (설정 가능). | 필수 |
| F1-4 | 각 청크를 OpenAI 임베딩 모델(기본 `text-embedding-3-small`)로 임베딩한다. | 필수 |
| F1-5 | ChromaDB `PersistentClient`를 사용해 `chroma_db/` 경로, 컬렉션 `seoul_plan_2040`에 저장한다. | 필수 |
| F1-6 | 각 청크에 메타데이터를 저장한다: `source`(파일명), `page`(페이지 번호), `chunk_index`. | 필수 |
| F1-7 | 재실행 시 중복 적재가 없어야 한다(문서ID+페이지+청크인덱스 기반 결정적 ID 사용, 또는 `--reset` 옵션으로 컬렉션 재생성). | 필수 |
| F1-8 | 임베딩 API 호출은 배치 단위(예: 100건)로 수행하고, 실패 시 지수 백오프로 재시도한다. | 필수 |
| F1-9 | 실행 결과(총 페이지 수, 청크 수, 소요 시간, 실패 건수)를 로그로 출력한다. | 필수 |
| F1-10 | 텍스트가 추출되지 않는 이미지 페이지는 경고 로그를 남기고 건너뛴다(OCR은 범위 외). | 권장 |
| F1-11 | 적재 전 추출 품질을 확인하는 검증 모드(`--inspect`)를 제공한다. ChromaDB 저장·임베딩 호출 없이 `batch/reports/inspect_report.md`를 생성한다. 리포트 내용과 판단 기준은 requirements.md REQ-11을 따른다. | 필수 |
| F1-12 | 추출기는 `pypdf`(기본)와 `pymupdf` 중 선택할 수 있다(`--extractor`). | 필수 |
| F1-13 | 컬렉션 메타데이터에 `embedding_model`, `extractor`, `chunk_size`, `chunk_overlap`을 기록한다. | 필수 |
| F1-14 | 경로 옵션(`--pdf`, `--chroma-dir`)이 상대경로이면 프로젝트 루트 기준으로 해석하고, 기동 시 실제 ChromaDB 절대경로를 로그로 출력한다. | 필수 |
| F1-15 | 목차 등 검색 품질을 떨어뜨리는 페이지를 `--exclude-pages`로 적재에서 제외하고, 컬렉션 메타데이터 `exclude_pages`에 기록한다. | 필수 |

**실행 예시** (프로젝트 루트에서, `python-env-313` 환경)
```bash
# 1) 추출 품질 검증
python batch/ingest.py --inspect
# 2) 확정 설정으로 적재 (확정값은 requirements.md 2.2절)
python batch/ingest.py --reset --extractor pymupdf --exclude-pages 4-8
```

**CLI 옵션**

| 옵션 | 기본값 | 설명 |
|---|---|---|
| `--pdf` | `data-files/2040_seoul_plan.pdf` | 입력 PDF 경로 (상대경로는 프로젝트 루트 기준) |
| `--chroma-dir` | `chroma_db` | ChromaDB 저장 경로 (상대경로는 프로젝트 루트 기준) |
| `--collection` | `seoul_plan_2040` | 컬렉션명 |
| `--chunk-size` | `1000` | 청크 크기 |
| `--chunk-overlap` | `200` | 청크 중첩 |
| `--extractor` | `pypdf` | PDF 추출기 (`pypdf` \| `pymupdf`) |
| `--exclude-pages` | (없음) | 적재에서 제외할 페이지 (예: `4-8,12`) |
| `--report` | `batch/reports/inspect_report.md` | 검증 리포트 경로 |
| `--inspect` | `false` | 검증 모드: 리포트만 생성, 저장·임베딩 없음 |
| `--reset` | `false` | 기존 컬렉션 삭제 후 재적재 |

### 3.2 [F2] 챗봇 API 서비스 (FastAPI + LangGraph)

#### 3.2.1 API 명세

**`POST /api/chat`**

Request
```json
{
  "session_id": "b3f1c2e0-...",
  "message": "2040 서울도시기본계획의 7대 목표는 무엇인가요?"
}
```

Response (200)
```json
{
  "session_id": "b3f1c2e0-...",
  "answer": "2040 서울도시기본계획은 ... 7대 목표를 제시하고 있습니다. ...",
  "category": "urban_planning",
  "sources": [
    { "page": 12, "snippet": "..." },
    { "page": 13, "snippet": "..." }
  ]
}
```

| 필드 | 설명 |
|---|---|
| `session_id` | 클라이언트가 생성한 대화 세션 ID(UUID). 대화 맥락 유지에 사용 |
| `category` | `urban_planning` \| `off_topic` |
| `sources` | 답변 근거 청크의 페이지/발췌. `off_topic`이면 빈 배열 |

**`GET /health`** → `{"status": "ok"}`

**오류 응답**

| 상황 | 상태코드 | 비고 |
|---|---|---|
| `message` 누락/빈 문자열, 1,000자 초과 | 422 | 입력 검증 실패 |
| OpenAI API 오류/타임아웃 | 502 | 사용자용 메시지: "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요." |
| ChromaDB 컬렉션 없음 | 503 | 배치 미실행 안내 로그 |

#### 3.2.2 LangGraph 워크플로우

```
          ┌─────────┐
 START ──▶│classify │
          └────┬────┘
     urban_planning │ off_topic
        ┌──────────┴──────────┐
        ▼                     ▼
   ┌─────────┐           ┌─────────┐
   │retrieve │           │ reject  │
   └────┬────┘           └────┬────┘
        ▼                     │
   ┌─────────┐                │
   │generate │                │
   └────┬────┘                │
        └────────┬────────────┘
                 ▼
                END
```

**State 정의**

| 필드 | 타입 | 설명 |
|---|---|---|
| `messages` | `list[BaseMessage]` (add_messages reducer) | 대화 이력 |
| `question` | `str` | 현재 사용자 질문 |
| `category` | `Literal["urban_planning","off_topic"]` | 분류 결과 |
| `documents` | `list[Document]` | 검색된 청크 |
| `answer` | `str` | 최종 응답 |

**노드 요구사항**

| ID | 노드 | 요구사항 |
|---|---|---|
| F2-1 | `classify` | ChatGPT에 구조화 출력(structured output)으로 질문을 `urban_planning`/`off_topic`으로 분류한다. 직전 대화 맥락을 함께 전달하여 후속 질문("그럼 교통은?")도 올바르게 분류한다. |
| F2-2 | 분류 기준 | 도시 계획 관련: 토지이용, 도시공간구조(중심지 체계), 주거·주택, 교통, 공원·녹지, 환경, 경제·산업 공간, 도시재생, 생활권 계획, 서울 2040 계획의 목표·전략 등. 그 외(일상 대화, 코딩, 날씨, 일반 상식 등)는 `off_topic`. 인사말은 `off_topic`으로 처리하되 안내 응답을 반환한다. |
| F2-3 | `retrieve` | ChromaDB에서 질문 임베딩 기반 유사도 검색으로 상위 k개(기본 `k=5`) 청크를 조회한다. |
| F2-4 | `generate` | 검색 청크를 컨텍스트로 ChatGPT가 한국어 답변을 생성한다. 컨텍스트에 근거가 없으면 "제공된 2040 서울도시기본계획 문서에서 관련 내용을 찾을 수 없습니다"라고 답하고 추측하지 않는다. 답변 말미에 참고 페이지를 표기한다. |
| F2-5 | `reject` | LLM 호출 없이 고정 안내 메시지를 반환한다: "저는 2040 서울도시기본계획 등 도시 계획과 관련된 질문에만 답변할 수 있습니다. 도시 계획에 대해 궁금한 점을 질문해 주세요." |
| F2-6 | 대화 맥락 | LangGraph checkpointer(`MemorySaver`)와 `thread_id=session_id`로 세션별 대화 이력을 유지한다(서버 재시작 시 초기화 허용). |
| F2-7 | 그래프 컴파일 | 애플리케이션 기동 시 1회 컴파일하여 재사용한다. |
| F2-9 | 검색 질문 재작성 | `classify`는 분류와 함께 대화 맥락을 반영한 검색 질문(`search_query`)을 구조화 출력으로 만든다. 이전 대화가 있는 후속 질문에만 재작성 질문으로 검색하고, 첫 질문은 원문으로 검색한다(재작성 시 일반어가 붙어 개요 페이지로 검색이 쏠리는 문제 방지). |
| F2-10 | 짧은 청크 제외 | `retrieve`는 50자 미만 청크(그림 제목 등)를 제외하고 상위 k개를 반환한다. |
| F2-11 | 출처 | 응답 `sources`는 답변의 "참고: p.X" 표기에서 실제로 인용한 페이지만 포함한다. "찾을 수 없습니다" 답변이면 빈 배열, 인용 표기가 없으면 검색된 청크 전체를 포함한다. |
| F2-12 | 대화 이력 길이 | LLM에는 최근 6개 메시지(3턴)만 이전 대화로 전달한다. |
| F2-8 | 기동 시 검증 | 기동 시 컬렉션 메타데이터의 `embedding_model`을 `.env` 설정값과 비교한다. 다르거나 기록이 없으면 오류 로그(기록이 없으면 `--reset` 재적재 안내)를 남기고 기동을 중단한다. 컬렉션 자체가 없으면(배치 미실행) 서버는 기동하고 채팅 요청에 503을 반환한다. 사용하는 ChromaDB 절대경로와 컬렉션명을 INFO 로그로 출력한다. |

**Generate 시스템 프롬프트 (초안)**
```
당신은 「2040 서울도시기본계획」 전문 안내 챗봇입니다.
아래 [참고 문서]의 내용만 근거로 사용자 질문에 한국어로 답변하세요.
- 문서에 없는 내용은 추측하지 말고 "문서에서 관련 내용을 찾을 수 없습니다"라고 답하세요.
- 핵심을 먼저 요약하고, 필요하면 항목으로 정리하세요.
- 답변 마지막에 "참고: p.X, p.Y" 형식으로 근거 페이지를 표기하세요.

[참고 문서]
{context}
```

#### 3.2.3 설정 (.env)

| 키 | 필수 | 기본값 | 설명 |
|---|---|---|---|
| `OPENAI_API_KEY` | ✅ | - | OpenAI API Key (배치·API 공용) |
| `OPENAI_CHAT_MODEL` | | `gpt-4o-mini` | 분류/생성용 Chat 모델 |
| `OPENAI_EMBEDDING_MODEL` | | `text-embedding-3-small` | 임베딩 모델 (배치와 API가 반드시 동일해야 함) |
| `CHROMA_DIR` | | `chroma_db` | ChromaDB 경로 (상대경로는 프로젝트 루트 기준) |
| `CHROMA_COLLECTION` | | `seoul_plan_2040` | 컬렉션명 |
| `RETRIEVER_TOP_K` | | `5` | 검색 청크 수 |

- `.env`는 프로젝트 루트의 파일 하나만 사용하며, `python-dotenv`로 소스 파일 위치 기준 경로를 계산해 로드한다(실행 위치 무관). Git에 커밋하지 않는다(`.gitignore` 등록).
- `OPENAI_CHAT_MODEL` 기본값은 구현 시작 시 OpenAI 제공 여부를 확인한다(REQ-10-5).
- API Key는 로그·응답에 절대 노출하지 않는다.

### 3.3 [F3] 웹 애플리케이션 (Spring Boot)

> **v1.2:** 화면은 React(`frontend/`)로 옮겼고 Spring Boot는 REST API만 제공한다. F3-1·F3-13은 requirements.md REQ-16-4·REQ-16-5로, F3-9의 `session_id` 전달 방식은 REQ-17-7로 대체한다. 나머지 화면 동작(F3-2~F3-17)은 React 앱이 그대로 따른다.

| ID | 요구사항 | 우선순위 |
|---|---|---|
| F3-1 | `GET /` 요청 시 home 화면(Thymeleaf `home.html`)을 렌더링한다. 화면은 home 하나만 구현한다. | 필수 |
| F3-2 | home 화면에는 서비스 소개(타이틀 "2040 서울도시기본계획 안내", 간단한 설명)를 표시한다. | 필수 |
| F3-3 | 화면 우측 하단에 고정(`position: fixed`)된 챗봇 링크(아이콘 + "챗봇 문의")를 표시한다. | 필수 |
| F3-4 | 링크 클릭 시 챗봇 창이 **모달 팝업** 형태로 열린다. 닫기(X) 버튼, ESC 키로 닫을 수 있다. | 필수 |
| F3-5 | 모달 구성: 헤더(제목·닫기), 메시지 목록(사용자 우측/봇 좌측 말풍선), 입력창 + 전송 버튼. | 필수 |
| F3-6 | 모달 최초 오픈 시 환영 메시지를 표시한다: "안녕하세요! 2040 서울도시기본계획에 대해 궁금한 점을 물어보세요." | 필수 |
| F3-7 | Enter로 전송, Shift+Enter로 줄바꿈. 빈 메시지는 전송하지 않는다. | 필수 |
| F3-8 | 응답 대기 중 로딩 표시(타이핑 인디케이터)를 보여주고 전송 버튼을 비활성화한다. | 필수 |
| F3-9 | 브라우저는 Spring Boot의 `POST /api/chat`을 호출하고, Spring Boot는 이를 FastAPI `POST /api/chat`으로 프록시한다(`RestClient`/`WebClient`, 타임아웃 60초). | 필수 |
| F3-10 | `session_id`는 브라우저에서 `crypto.randomUUID()`로 생성해 `sessionStorage`에 보관한다. 모달을 닫았다 열어도 대화 내용은 페이지 내에서 유지한다. | 필수 |
| F3-11 | 답변의 출처(`sources`) 페이지 정보를 봇 말풍선 하단에 작게 표시한다. | 권장 |
| F3-12 | FastAPI 호출 실패 시 봇 말풍선으로 오류 안내 메시지를 표시한다. | 필수 |
| F3-13 | 봇 응답은 XSS 방지를 위해 `textContent`로 렌더링한다(HTML 미해석). | 필수 |
| F3-14 | FastAPI 주소는 `application.yml`의 `chatbot.api.base-url`(기본 `http://localhost:8000`)로 설정한다. | 필수 |
| F3-15 | 모바일 화면(폭 < 768px)에서는 모달을 전체 화면으로 표시한다. | 권장 |
| F3-16 | 프록시 오류 변환: FastAPI 연결 실패 503, 응답 시간 초과 504, FastAPI 400/422 → 400, FastAPI 502/503은 같은 상태 코드와 안내 문구 전달, 그 밖의 오류 502. 응답 본문은 `{"detail": "..."}` 형식으로 통일한다. 입력 검증(빈 메시지, 1,000자 초과, 잘못된 UUID)은 프록시에서 먼저 400으로 거절한다. | 필수 |
| F3-17 | 모달은 `<dialog>`(`showModal`)로 구현한다. 배경 클릭으로도 닫히고, 한글 조합(IME) 중 Enter는 전송하지 않는다. 대화 내용은 `sessionStorage`에 보관해 새로고침 후에도 복원한다. 답변의 `**굵게**` 표기는 DOM 노드로 변환한다(`innerHTML` 미사용). | 필수 |

**화면 와이어프레임**

```
┌──────────────────────────────────────────────────────┐
│  2040 서울도시기본계획 안내                              │
│                                                      │
│  서울의 미래 도시 공간 계획을 챗봇에게 물어보세요.          │
│                                                      │
│                          ┌──────────────────────────┐│
│                          │ 서울도시계획 챗봇       [X] ││
│                          ├──────────────────────────┤│
│                          │ ┌──────────────────┐     ││
│                          │ │안녕하세요! ...     │     ││
│                          │ └──────────────────┘     ││
│                          │       ┌──────────────┐   ││
│                          │       │7대 목표는?    │   ││
│                          │       └──────────────┘   ││
│                          ├──────────────────────────┤│
│                          │ [질문을 입력하세요   ][전송]││
│                          └──────────────────────────┘│
│                                       (💬 챗봇 문의)  │
└──────────────────────────────────────────────────────┘
```

---

## 4. 비기능 요구사항

| 구분 | 요구사항 |
|---|---|
| 성능 | 도시 계획 질문 응답 시간 p95 10초 이내, off_topic 응답 2초 이내(분류 포함) |
| 정확성 | 답변은 검색된 문서 근거에 기반해야 하며, 근거 없는 내용(환각)을 생성하지 않는다 |
| 보안 | API Key는 `.env`로만 관리, 코드/로그/프론트엔드에 노출 금지. FastAPI는 내부 접근만 허용(브라우저 직접 호출 없음) |
| 신뢰성 | OpenAI 호출 타임아웃 30초, 재시도 최대 2회 |
| 로깅 | 요청별 session_id, category, 검색 청크 수, 응답 시간을 로깅(질문 원문은 DEBUG 레벨) |
| 호환성 | 최신 Chrome/Edge/Safari 지원 |
| 인코딩 | 모든 파일 입출력·콘솔 출력은 UTF-8. Python은 `PYTHONUTF8=1`로 실행 |
| 버전 | Python 3.13.18 (Miniconda `python-env-313` 환경), Java 21, Spring Boot 4.0.x, Gradle Wrapper |

---

## 5. 기술 스택 및 주요 라이브러리

| 영역 | 라이브러리 |
|---|---|
| 배치 | `pypdf`, `pymupdf`, `langchain-text-splitters`, `langchain-openai`, `chromadb`, `python-dotenv`, `pytest` |
| 챗봇 API | `fastapi`, `uvicorn`, `langgraph`, `langchain-openai`, `chromadb`(직접 사용, `langchain-chroma` 미사용), `pydantic`, `python-dotenv`, `pytest`, `httpx` |
| 웹 | Spring Boot 4.0.x: `spring-boot-starter-web`, `spring-boot-starter-thymeleaf`, `spring-boot-starter-test`, Vanilla JS, CSS |

- PDF 라이브러리는 배치에만 포함한다. Python 패키지는 Python 3.13 호환 버전으로 고정한다.

---

## 6. 실행 순서

1. 프로젝트 루트의 `.env`에 `OPENAI_API_KEY` 설정
2. Python 환경 활성화: `conda activate python-env-313` 후 `pip install -r batch/requirements.txt -r api/requirements.txt`
3. 추출 품질 검증: `python batch/ingest.py --inspect` → `batch/reports/inspect_report.md` 확인 후 설정 확정
4. 배치 적재: `python batch/ingest.py --reset --extractor pymupdf --exclude-pages 4-8` → `chroma_db/` 생성 확인
5. 챗봇 API 실행: `uvicorn app.main:app --port 8000` (`api/`에서)
6. 웹 실행: `./gradlew bootRun` (`backend/`에서, Windows는 `.\gradlew.bat bootRun`) → `http://localhost:8080` 접속
7. 우측 하단 "챗봇 문의" 클릭 → 모달에서 질문

---

## 7. 수용 기준 (Acceptance Criteria)

| # | 시나리오 | 기대 결과 |
|---|---|---|
| AC-1 | 배치 실행 | ChromaDB 컬렉션 `seoul_plan_2040`에 청크가 저장되고 각 청크에 `page` 메타데이터가 존재 |
| AC-2 | 배치 재실행 | 청크 수가 중복 증가하지 않음 |
| AC-3 | "2040 서울도시기본계획의 핵심 목표는?" | `category=urban_planning`, 문서 근거 답변 + 참고 페이지 표시 |
| AC-4 | "서울의 중심지 체계는 어떻게 바뀌나요?" → "그럼 교통 계획은?" | 후속 질문도 `urban_planning`으로 분류되어 문맥에 맞게 답변 |
| AC-5 | "오늘 점심 메뉴 추천해줘" / "파이썬 정렬 코드 짜줘" | `category=off_topic`, 도시 계획 관련 질문만 답변 가능하다는 안내 |
| AC-6 | 문서에 없는 도시 계획 질문 (예: "부산 도시계획은?") | 문서에서 관련 내용을 찾을 수 없다고 응답, 추측하지 않음 |
| AC-7 | home 화면 접속 | 우측 하단에 챗봇 링크 고정 표시 |
| AC-8 | 링크 클릭 / X 클릭 / ESC | 모달 열림 / 닫힘 / 닫힘, 재오픈 시 대화 유지 |
| AC-9 | FastAPI 중지 상태에서 질문 | 모달에 오류 안내 메시지 표시, 화면 깨짐 없음 |

> 추출 품질 검증, 임베딩 모델 검증, 실행 환경, 경로, 인코딩 관련 수용 기준(AC-10~17)은 [requirements.md](./requirements.md) 3장을 따른다.

---

## 8. 리스크 및 대응

| 리스크 | 대응 |
|---|---|
| PDF 내 표·도식·이미지 텍스트 추출 품질 저하 | `--inspect` 리포트로 검수, 필요 시 `pymupdf`로 교체·청크 크기 조정, 향후 OCR 도입 검토 |
| `pymupdf` AGPL-3.0 라이선스 | 현재 범위(로컬 실행)에서는 사용 허용. 외부 배포 시 `pypdf`만 사용하거나 상용 라이선스 검토 |
| 기본 Chat 모델(`gpt-4o-mini`) 제공 중단 | 구현 시작 시 확인, `.env`로 모델 교체(코드 변경 없음) |
| 배치·API 실행 위치 차이로 다른 ChromaDB 참조 | 경로를 프로젝트 루트 기준으로 해석, 기동 로그에 절대경로 출력 |
| 분류 오판(경계 질문: 부동산 시세, 서울 관광 등) | 분류 프롬프트에 경계 사례 예시 포함, 로그 기반 프롬프트 튜닝 |
| 배치/API 임베딩 모델 불일치로 검색 품질 저하 | 동일 `.env` 설정 공유, 컬렉션 메타데이터에 임베딩 모델명 기록 후 API 기동 시 검증 |
| OpenAI API 비용/지연 | 경량 Chat 모델 기본 사용, off_topic은 LLM 생성 없이 고정 응답 |
| 인메모리 세션으로 서버 재시작 시 대화 소실 | 현 범위에서 허용, 향후 `SqliteSaver` 등으로 확장 |

---

## 9. 향후 확장 (Backlog)
- SSE 기반 스트리밍 응답
- 하이브리드 검색(BM25 + 벡터) 및 리랭킹
- 다중 문서 적재 및 문서 버전 관리
- 대화 이력 영구 저장 및 피드백(👍/👎) 수집
