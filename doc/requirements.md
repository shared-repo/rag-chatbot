# 요구사항 정의서: 2040 서울도시기본계획 RAG 챗봇

| 항목 | 내용 |
|---|---|
| 문서 버전 | v1.9 |
| 작성일 | 2026-11-03 (v1.7·v1.9: 2026-11-19) |
| 관련 문서 | [PRD.md](./PRD.md) |
| 변경 사항 | v1.1: PRD v1.0의 확인 필요 사항(사용 모델, PDF 추출 품질 검증) 확정 반영<br>v1.2: Python 실행 환경(3.13.18, conda `python-env-313`) 확정 반영<br>v1.3: REQ-12-5 수정 — PDF 라이브러리는 배치 의존성에만 포함<br>v1.4: 검토 결과 반영 — 문서 우선순위, 임베딩 모델 기록 누락 처리, 검증 리포트 청크 통계, 경로 기준(REQ-13), Java/Spring Boot 환경(REQ-14), 인코딩(REQ-15), 확인 사항·리스크 추가<br>v1.5: Spring Boot 4.x 유지 확정, PRD v1.1 반영 완료 표기<br>v1.6: 목차 페이지 제외(REQ-11-9), 추출·청크 확정 설정 기록<br>v1.7: React 프론트엔드 분리(REQ-16), 회원가입·로그인(REQ-17), MariaDB 사용자 저장소(REQ-18) 추가. REQ-07·REQ-08 변경<br>v1.8: 폴더 이름 변경 — `api/` → `api/`, `backend/` → `backend/` (경로는 폴더 깊이 기준이라 동작 변화 없음)<br>v1.9: Java 버전 변경 — Java 17 → **Java 21**(LTS), toolchain 21 (REQ-14-1, REQ-14-4) |

> **문서 우선순위:** 이 문서와 [PRD.md](./PRD.md)의 내용이 다르면 **이 문서를 따른다.** PRD v1.0과 달라진 항목은 [4. PRD 대비 변경 사항](#4-prd-대비-변경-사항)에 정리했다.

---

## 1. 요구사항 목록

| ID | 구분 | 요구사항 |
|---|---|---|
| REQ-00 | 데이터 | RAG에서 사용할 데이터는 `data-files/2040_seoul_plan.pdf` 파일로 한다. |
| REQ-01 | 배치 | 위 파일을 ChromaDB에 저장하는 Python 기반 배치 프로그램을 구현한다. |
| REQ-02 | 챗봇 API | 챗봇의 대화 처리는 FastAPI 기반 서비스로 개발한다. |
| REQ-03 | 챗봇 API | 도시 계획 관련 질문은 ChromaDB에서 데이터를 검색하고 그 결과로 응답을 생성한다. |
| REQ-04 | 챗봇 API | 도시 계획과 관련 없는 질문에는 도시 계획 관련 질문에만 답변할 수 있다는 응답을 생성한다. |
| REQ-05 | 챗봇 API | 챗봇은 LangGraph를 사용해서 구현한다. |
| REQ-06 | 챗봇 API | 생성형 AI는 ChatGPT(OpenAI) API를 사용하며, API Key는 `.env` 파일의 `OPENAI_API_KEY`를 사용한다. |
| REQ-07 | 웹 | ~~챗봇의 화면 처리는 Spring Boot 기반 웹 애플리케이션으로 구현한다.~~ → **v1.7 변경:** 화면은 React 애플리케이션이, 인증·챗봇 프록시 API는 Spring Boot가 담당한다(REQ-16). |
| REQ-08 | 웹 | ~~웹 애플리케이션은 home 화면만 구현한다.~~ → **v1.7 변경:** home, 로그인, 회원가입 화면을 구현한다(REQ-16-2). |
| REQ-09 | 웹 | 화면 우측 하단의 링크를 클릭하면 챗봇이 모달 팝업 형식의 창으로 표시된다. |
| **REQ-10** | **모델 (확정)** | 사용 모델을 아래와 같이 확정한다. 모델명은 `.env`로 변경할 수 있다. |
| **REQ-11** | **배치 (확정)** | 적재 전에 PDF 텍스트 추출 품질을 검증하고, 결과에 따라 추출 방식과 청크 설정을 조정한다. |
| **REQ-12** | **실행 환경 (확정)** | Python 3.13.18과 로컬 Miniconda의 `python-env-313` 환경을 사용한다. |
| **REQ-13** | **경로 (확정)** | `.env`, ChromaDB 저장소 등 공유 파일 경로는 실행 위치와 관계없이 프로젝트 루트 기준으로 결정한다. |
| **REQ-14** | **웹 실행 환경 (확정)** | Java 21과 Spring Boot 4.0.x를 사용하고, 빌드는 Gradle Wrapper로 한다. |
| **REQ-15** | **인코딩 (확정)** | 모든 파일 입출력과 콘솔 출력은 UTF-8을 사용한다. |
| **REQ-16** | **프론트엔드 분리 (확정)** | Thymeleaf 화면을 React 애플리케이션(`frontend/`)으로 분리하고, Spring Boot(`backend/`)는 REST API만 제공한다. |
| **REQ-17** | **회원 (확정)** | 회원가입·로그인·로그아웃 기능을 제공하고, 로그인한 사용자만 챗봇을 사용한다. |
| **REQ-18** | **DB (확정)** | 사용자 정보는 로컬 Docker로 실행하는 MariaDB에 저장한다. |

---

## 2. 확정 사항 상세

### 2.1 REQ-10 사용 모델

| 용도 | 모델 | `.env` 키 | 비고 |
|---|---|---|---|
| 질문 분류 / 답변 생성 | `gpt-4o-mini` | `OPENAI_CHAT_MODEL` | 비용·응답 속도 우선의 경량 모델 |
| 임베딩 (배치·검색 공용) | `text-embedding-3-small` | `OPENAI_EMBEDDING_MODEL` | 1536차원, 한국어 지원 |

| ID | 요구사항 |
|---|---|
| REQ-10-1 | 배치와 챗봇 API는 반드시 **같은 임베딩 모델**을 사용해야 한다. |
| REQ-10-2 | 배치는 ChromaDB 컬렉션 메타데이터에 `embedding_model`을 기록한다. |
| REQ-10-3 | 챗봇 API는 기동 시 컬렉션의 `embedding_model`과 `.env` 설정값을 비교하고, 다르면 오류 로그를 남긴 뒤 기동을 중단한다. |
| REQ-10-4 | 컬렉션 메타데이터에 `embedding_model`이 **없으면** "배치를 `--reset` 옵션으로 다시 실행하라"는 오류 로그를 남기고 기동을 중단한다. |
| REQ-10-5 | 구현을 시작할 때 `gpt-4o-mini`를 OpenAI에서 계속 제공하는지 확인한다. 제공이 중단되었거나 중단 예정이면 같은 등급의 경량 모델로 기본값을 바꾸고 이 문서를 갱신한다. |

**`.env` 예시**
```dotenv
OPENAI_API_KEY=sk-...
OPENAI_CHAT_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

### 2.2 REQ-11 PDF 추출 품질 검증

| ID | 요구사항 |
|---|---|
| REQ-11-1 | 배치 프로그램에 검증 모드(`--inspect`)를 제공한다. 이 모드는 ChromaDB에 저장하지 않고, 임베딩 API도 호출하지 않으며, 추출·분할 결과만 분석한다. |
| REQ-11-2 | 검증 모드는 `batch/reports/inspect_report.md`에 다음을 출력한다.<br>① 실행 설정: 추출기, `chunk_size`, `chunk_overlap`<br>② 페이지별 추출 글자 수와 앞부분 200자<br>③ 청크 통계: 전체 청크 수, 평균·최소·최대 길이<br>④ 샘플 청크 5개(무작위, 시드 고정)의 전문과 페이지 번호 |
| REQ-11-3 | 추출 글자 수가 50자 미만인 페이지는 "저품질 페이지"로 표시하고, 전체 대비 비율을 요약에 출력한다. |
| REQ-11-4 | 기본 추출기는 `pypdf`로 한다. 저품질 페이지 비율이 20%를 넘거나 표·다단 텍스트가 깨지면 `pymupdf`로 바꾼다(`--extractor pypdf\|pymupdf` 옵션 제공). |
| REQ-11-5 | 청크 설정 기본값은 `chunk_size=1000`, `chunk_overlap=200`으로 한다. 샘플 청크에서 문단이 중간에 잘리거나 표가 많으면 `chunk_size`를 500~800으로 줄여 다시 검증한다. |
| REQ-11-6 | 검증 결과로 확정한 추출기와 청크 설정은 사람이 `batch/reports/inspect_report.md` 하단의 "확정 설정" 항목에 기록한다. |
| REQ-11-7 | 이미지로만 이루어진 페이지(OCR이 필요한 페이지)는 이번 범위에서 제외하고 경고 로그만 남긴다. |
| REQ-11-8 | 적재 모드는 사용한 추출기와 청크 설정을 컬렉션 메타데이터(`extractor`, `chunk_size`, `chunk_overlap`, `exclude_pages`)에도 기록한다. |
| REQ-11-9 | 목차처럼 검색 품질을 떨어뜨리는 페이지는 `--exclude-pages`(예: `4-8,12`)로 적재에서 제외한다. 검증 리포트에는 "제외(설정)"으로 표시하고, 제외 페이지가 바뀌면 `--reset`으로 다시 적재해야 한다. |

**검증 및 적재 절차**
```bash
# 1) 추출 품질 검증 (ChromaDB 저장·임베딩 호출 없음)
python batch/ingest.py --inspect --extractor pypdf

# 2) 리포트 확인 후 필요 시 추출기/청크 설정을 바꿔 재검증
#    (아래 값은 예시이며, 실제 값은 검증 결과에 따라 결정)
python batch/ingest.py --inspect --extractor pymupdf --chunk-size 800

# 3) 확정된 설정으로 적재 (예시)
python batch/ingest.py --reset --extractor pymupdf --chunk-size 800
```

**확정 설정 (2026-11-03 검증 결과)**

| 항목 | 값 | 근거 |
|---|---|---|
| 추출기 | `pymupdf` | pypdf와 품질 동일, 약 40배 빠름 |
| chunk_size / chunk_overlap | 1000 / 200 | 평균 청크 664자, 문단 단위 분할 양호 |
| 제외 페이지 | `4-8` | 목차·표목차·그림목차가 검색 상위에 노출됨 |

```bash
python batch/ingest.py --reset --extractor pymupdf --exclude-pages 4-8
```

### 2.3 REQ-12 Python 실행 환경

| ID | 요구사항 |
|---|---|
| REQ-12-1 | Python 버전은 **3.13.18**을 사용한다. |
| REQ-12-2 | 로컬에 설치된 Miniconda의 **`python-env-313`** 환경(`C:\Users\ohchi\.conda\envs\python-env-313`)을 사용한다. 별도 venv는 만들지 않는다. |
| REQ-12-3 | 배치와 챗봇 API는 모두 `python-env-313` 환경에서 실행한다. |
| REQ-12-4 | 패키지는 `python-env-313` 환경에만 설치하고, conda `base` 환경에는 설치하지 않는다. |
| REQ-12-5 | `batch/requirements.txt`, `api/requirements.txt`에 각 컴포넌트의 의존성을 명시하고, 모든 패키지는 Python 3.13과 호환되는 버전으로 고정한다. PDF 라이브러리(`pypdf`, `pymupdf`)는 `batch/requirements.txt`에만 포함한다(챗봇 API는 PDF를 읽지 않음). |

**환경 준비 및 실행**
```bash
# 환경 활성화
conda activate python-env-313
python --version   # Python 3.13.18 확인

# 의존성 설치
pip install -r batch/requirements.txt
pip install -r api/requirements.txt

# 배치 실행 (프로젝트 루트에서)
python batch/ingest.py --inspect

# 챗봇 API 실행 (api/ 에서)
uvicorn app.main:app --port 8000
```

> 환경을 활성화하지 않고 실행할 때는 `conda run -n python-env-313 python ...` 형식을 사용한다.

### 2.4 REQ-13 경로 기준

배치는 프로젝트 루트에서, 챗봇 API는 `api/` 폴더에서 실행하므로 상대경로를 실행 위치 기준으로 해석하면 두 프로그램이 서로 다른 ChromaDB를 보게 된다. 이를 막기 위해 다음을 따른다.

| ID | 요구사항 |
|---|---|
| REQ-13-1 | 배치와 챗봇 API는 소스 파일 위치(`Path(__file__)`)로 프로젝트 루트를 계산한다. 현재 작업 디렉터리(cwd)에 의존하지 않는다. |
| REQ-13-2 | `.env`는 프로젝트 루트의 `.env` 하나만 사용한다. |
| REQ-13-3 | `CHROMA_DIR`, `--pdf`, `--chroma-dir` 등 경로 설정값이 상대경로이면 **프로젝트 루트 기준**으로 해석한다. 절대경로이면 그대로 사용한다. |
| REQ-13-4 | 배치와 챗봇 API는 기동 시 실제로 사용하는 ChromaDB 절대경로와 컬렉션명을 INFO 로그로 출력한다. |

### 2.5 REQ-14 웹 실행 환경

| ID | 요구사항 |
|---|---|
| REQ-14-1 | JDK는 로컬에 설치된 **Java 21**(21.0.7 LTS)을 사용한다. (v1.9: Java 17 → 21 변경) |
| REQ-14-2 | Spring Boot는 **4.0.x**의 최신 패치 버전을 사용한다. 정확한 버전은 프로젝트 생성 시 `build.gradle`에 고정한다(2026-11-03 생성: **4.0.9**, Gradle Wrapper 9.8.2). |
| REQ-14-3 | 빌드 도구는 Gradle이며, 로컬에 Gradle이 설치되어 있지 않으므로 **Gradle Wrapper**(`gradlew`, `gradlew.bat`, `gradle/wrapper/`)를 프로젝트에 포함한다. |
| REQ-14-4 | `build.gradle`에 Java toolchain 21을 지정한다. |

**실행**
```bash
# backend/ 에서 (Windows PowerShell은 .\gradlew.bat)
./gradlew bootRun     # http://localhost:8080
./gradlew test
```

### 2.6 REQ-15 인코딩

| ID | 요구사항 |
|---|---|
| REQ-15-1 | Python에서 파일을 열 때는 항상 `encoding="utf-8"`을 지정한다(리포트, 로그 파일, `.env` 등). |
| REQ-15-2 | Python 프로세스는 `PYTHONUTF8=1` 환경 변수를 설정하고 실행한다(Windows 콘솔 한글 깨짐 방지). conda 환경 변수로 등록한다: `conda env config vars set PYTHONUTF8=1 -n python-env-313` |
| REQ-15-3 | Spring Boot의 응답·템플릿·소스 파일은 UTF-8을 사용한다(`build.gradle`의 `compileJava.options.encoding = 'UTF-8'`). |

### 2.7 REQ-16 프론트엔드 분리

| ID | 요구사항 |
|---|---|
| REQ-16-1 | React 애플리케이션은 `frontend/`에 둔다. 언어는 **JavaScript(JSX)**, 빌드 도구는 **Vite**, 라우팅은 **React Router**를 사용한다. 로컬 환경은 Node.js v24.20.0, npm 11.19.0이다. |
| REQ-16-2 | 화면은 home(`/`), 로그인(`/login`), 회원가입(`/signup`) 세 개다. 챗봇은 home의 모달로 유지하며 F3-2~F3-17의 동작(우측 하단 링크, `<dialog>`, ESC·배경 클릭 닫기, IME 처리, sessionStorage 복원, 출처 표시, 오류 안내)을 그대로 따른다. |
| REQ-16-3 | 브라우저는 Spring Boot의 `/api/*`만 호출한다. 개발 시에는 Vite 개발 서버(:5173)가 `/api`를 `http://localhost:8080`으로 프록시해 같은 출처로 동작한다(CORS 설정 없음). |
| REQ-16-4 | Spring Boot는 화면을 렌더링하지 않는다. Thymeleaf 템플릿·정적 리소스·`HomeController`를 제거한다(F3-1 대체). |
| REQ-16-5 | 봇 응답은 React 텍스트 노드로 렌더링하고 `dangerouslySetInnerHTML`을 쓰지 않는다(F3-13 대체). `**굵게**`는 `<strong>` 요소로 변환한다. |

**실행**
```bash
# frontend/ 에서
npm install
npm run dev      # http://localhost:5173 (Spring Boot :8080 실행 필요)
npm test
npm run build    # frontend/dist 생성
```

### 2.8 REQ-17 회원가입·로그인

| ID | 요구사항 |
|---|---|
| REQ-17-1 | 회원 정보는 **아이디(이메일), 비밀번호, 닉네임**이다. 이메일 소유 확인(인증 메일) 과정은 두지 않는다. |
| REQ-17-2 | 입력 검증: 이메일 형식·255자 이하, 비밀번호 8~64자(UTF-8 72바이트 이하, BCrypt 제한), 닉네임 2~20자. 이메일은 앞뒤 공백을 지우고 소문자로 바꿔 저장·비교한다. 이미 가입된 이메일은 409로 거절한다. |
| REQ-17-3 | 비밀번호는 BCrypt 해시로만 저장한다. 평문 비밀번호를 로그·응답에 남기지 않는다. |
| REQ-17-4 | 인증은 **서버 세션 쿠키** 방식(Spring Security)이다. 세션 쿠키 `JSESSIONID`는 HttpOnly, SameSite=Lax이며, 로그인 성공 시 세션 ID를 새로 발급한다(세션 고정 공격 방지). |
| REQ-17-5 | 상태를 바꾸는 요청(POST 등)은 CSRF 토큰을 요구한다. 서버는 `XSRF-TOKEN` 쿠키로 토큰을 내려주고, 프론트엔드는 `X-XSRF-TOKEN` 헤더로 보낸다. 토큰이 없거나 틀리면 403. |
| REQ-17-6 | `POST /api/chat`은 로그인한 사용자만 호출할 수 있다. 미인증 요청은 401 `{"detail": "로그인이 필요합니다."}`로 거절한다. 프론트엔드는 로그인하지 않은 사용자가 "챗봇 문의"를 누르면 로그인 화면으로 보내고, 로그인 후 home으로 돌아와 챗봇을 연다. |
| REQ-17-7 | Spring Boot는 FastAPI에 보내는 `session_id`를 **사용자 ID와 브라우저의 `session_id`로 만든 이름 기반 UUID**로 바꿔, 다른 사용자가 같은 `session_id`를 보내도 대화 맥락이 섞이지 않게 한다. 브라우저에는 원래 `session_id`를 돌려준다. FastAPI(`api`)는 변경하지 않는다. |
| REQ-17-8 | 로그아웃하면 서버 세션을 무효화하고, 브라우저의 대화 내용(sessionStorage)을 지운다. 대화 내용은 사용자별 키로 보관한다. |
| REQ-17-9 | 모든 오류 응답은 `{"detail": "..."}` 형식이다(F3-16과 같음). |

**API**

| 메서드 | 경로 | 인증 | 요청 | 응답 |
|---|---|---|---|---|
| GET | `/api/auth/csrf` | 불필요 | — | 204, `XSRF-TOKEN` 쿠키 발급 |
| POST | `/api/auth/signup` | 불필요 | `{"email", "password", "nickname"}` | 201 `{"id", "email", "nickname"}` / 400 / 409 |
| POST | `/api/auth/login` | 불필요 | `{"email", "password"}` | 200 `{"id", "email", "nickname"}` + 세션 쿠키 / 400 / 401 |
| POST | `/api/auth/logout` | 필요 | — | 204 |
| GET | `/api/auth/me` | 필요 | — | 200 `{"id", "email", "nickname"}` / 401 |
| POST | `/api/chat` | 필요 | 기존과 같음 (PRD 3.2.1) | 기존과 같음 + 401 |

회원가입에 성공하면 자동 로그인하지 않고 로그인 화면으로 이동한다.

### 2.9 REQ-18 사용자 DB (MariaDB)

| ID | 요구사항 |
|---|---|
| REQ-18-1 | 로컬 Docker로 실행 중인 MariaDB를 사용한다: `localhost:3306`, 데이터베이스 `ragchatbot`. |
| REQ-18-2 | 접속 정보는 프로젝트 루트 `.env`의 `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`로만 설정한다(`application.yml`에 비밀번호를 쓰지 않는다). Spring Boot는 `spring.config.import: optional:file:../.env[.properties]`로 읽으므로 `backend/`에서 실행한다. 같은 이름의 OS 환경 변수가 있으면 그 값이 우선한다. |
| REQ-18-3 | 스키마는 Flyway 마이그레이션(`backend/src/main/resources/db/migration/V*.sql`)으로 만든다. JPA는 `ddl-auto: validate`만 사용한다. 테이블 문자셋은 `utf8mb4`. |
| REQ-18-4 | 테스트는 H2 인메모리 DB(MariaDB 호환 모드)로 실행해 MariaDB 없이도 통과해야 한다(CI 대비). |

**`.env` 추가 항목**
```dotenv
DB_URL=jdbc:mariadb://localhost:3306/ragchatbot
DB_USERNAME=humanfullstack
DB_PASSWORD=...
```

**`users` 테이블**

| 컬럼 | 타입 | 제약 |
|---|---|---|
| `id` | BIGINT | PK, AUTO_INCREMENT |
| `email` | VARCHAR(255) | NOT NULL, UNIQUE |
| `password_hash` | VARCHAR(100) | NOT NULL (BCrypt) |
| `nickname` | VARCHAR(50) | NOT NULL |
| `created_at` | DATETIME(6) | NOT NULL |

---

## 3. 수용 기준 추가

| # | 시나리오 | 기대 결과 |
|---|---|---|
| AC-10 | `--inspect` 실행 | ChromaDB 저장과 임베딩 호출이 없고 `inspect_report.md`가 생성됨. 리포트에 실행 설정, 페이지별 글자 수, 저품질 페이지 비율, 청크 통계, 샘플 청크가 포함됨 |
| AC-11 | 배치와 API의 임베딩 모델을 다르게 설정한 뒤 API 기동 | 모델 불일치 오류 로그를 남기고 기동이 중단됨 |
| AC-12 | `.env`에서 `OPENAI_CHAT_MODEL` 변경 | 코드 수정 없이 변경된 모델로 응답 생성 |
| AC-13 | `conda activate python-env-313` 후 `python --version` | `Python 3.13.18` 출력, 배치와 챗봇 API가 이 환경에서 정상 실행 |
| AC-14 | 컬렉션 메타데이터에 `embedding_model`이 없는 상태에서 API 기동 | 배치 재적재 안내 오류 로그를 남기고 기동이 중단됨 |
| AC-15 | 프로젝트 루트에서 배치 실행 후 `api/`에서 API 실행 | 두 프로그램의 기동 로그에 같은 ChromaDB 절대경로가 출력되고, API가 정상 검색함 |
| AC-16 | `backend/`에서 `./gradlew build` (Gradle 미설치 PC) | Wrapper가 Gradle을 내려받아 빌드 성공 |
| AC-17 | Windows 콘솔에서 배치·API 실행 | 로그와 `inspect_report.md`의 한글이 깨지지 않음 |
| AC-18 | 회원가입(이메일·비밀번호·닉네임) | `users` 테이블에 소문자 이메일과 BCrypt 해시가 저장되고 로그인 화면으로 이동 |
| AC-19 | 이미 가입된 이메일(대소문자만 다른 경우 포함)로 회원가입 | 409, "이미 가입된 이메일입니다." 표시 |
| AC-20 | 로그인하지 않고 "챗봇 문의" 클릭 / `/api/chat` 직접 호출 | 로그인 화면으로 이동 / 401 |
| AC-21 | 로그인 후 "챗봇 문의"에서 질문 | 기존과 같이 답변·출처 표시 (AC-3~9 유지) |
| AC-22 | 로그아웃 | 세션 무효화, 대화 내용 삭제, 이후 `/api/chat` 401 |
| AC-23 | CSRF 토큰 없이 `POST /api/auth/login` 또는 `/api/chat` 호출 | 403 |
| AC-24 | 두 사용자가 같은 `session_id`로 질문 | FastAPI에는 서로 다른 `session_id`가 전달되어 대화 맥락이 섞이지 않음 |
| AC-25 | MariaDB 없이 `./gradlew test` | H2로 모든 테스트 통과 |

> 그 밖의 기능·비기능 요구사항, API 명세, 화면 설계, 수용 기준(AC-1~9)은 [PRD.md](./PRD.md)를 따른다.

---

## 4. PRD 대비 변경 사항

PRD v1.0에서 아래 항목을 이 문서의 내용으로 대체했으며, **PRD v1.1 본문에 모두 반영되었다.**

| PRD 위치 | PRD v1.0 내용 | 변경 내용 | 근거 |
|---|---|---|---|
| 3.1 CLI 옵션 | `--inspect`, `--extractor` 없음 | 두 옵션 추가 | REQ-11-1, REQ-11-4 |
| 3.1 F1-5, 3.2.3 `CHROMA_DIR` | 상대경로 `chroma_db` (기준 미정) | 프로젝트 루트 기준으로 해석 | REQ-13 |
| 3.2.3 설정 | 임베딩 모델 일치 여부 검증 방식 없음 | 컬렉션 메타데이터 비교, 기록 없으면 기동 중단 | REQ-10-2~4 |
| 4. 비기능 – 버전 | Python 3.11+, Java 17+, Spring Boot 3.x | Python 3.13.18, Java 21, Spring Boot 4.0.x | REQ-12, REQ-14 |
| 6. 실행 순서 | conda 환경 활성화 단계 없음 | `conda activate python-env-313` 후 실행 | REQ-12 |
| 1.3 범위 외 | 회원가입/로그인, home 이외 화면 제외 | 회원가입·로그인 추가, 화면 3개 (v1.7) | REQ-16, REQ-17 |
| 2.1~2.3 구성 | Spring Boot가 Thymeleaf 화면 + 프록시 | React(`frontend/`) + Spring Boot REST API + MariaDB (v1.7) | REQ-16, REQ-18 |
| 3.3 F3-1, F3-13 | Thymeleaf home, `textContent` 렌더링 | React 화면, React 텍스트 노드 렌더링 (v1.7) | REQ-16-4, REQ-16-5 |
| 3.3 F3-9 | 프록시는 받은 `session_id`를 그대로 전달 | 사용자별 UUID로 바꿔 전달 (v1.7) | REQ-17-7 |

---

## 5. 리스크 및 확인 사항

| 항목 | 내용 | 대응 |
|---|---|---|
| `gpt-4o-mini` 제공 여부 | 오래된 모델이라 제공이 중단될 수 있음 | 구현을 시작할 때 확인(REQ-10-5). `.env`로 바꿀 수 있어 코드 변경은 필요 없음 |
| `pymupdf` 라이선스 | AGPL-3.0 라이선스. 학습·내부용은 문제없으나, 외부 배포·서비스 공개 시 소스 공개 의무가 생길 수 있음 | 현재 범위(로컬 실행)에서는 사용 허용. 외부 배포 계획이 생기면 `pypdf`만 사용하거나 상용 라이선스를 검토 |
| Spring Boot 4.x 호환성 | 3.x 대비 일부 API·의존성 변경. 4.x 사용은 확정 사항 | Spring Initializr로 프로젝트를 생성하고, 사용하는 스타터만 최소로 포함 |
| 기존 DB에 테이블이 있는 경우 | `ragchatbot` DB가 비어 있지 않으면 Flyway가 기동을 중단함 | 빈 DB 사용을 원칙으로 한다. 기존 테이블이 있으면 확인 후 정리 |
| 세션 저장소 | 서버 메모리 세션이라 Spring Boot 재시작 시 로그아웃됨 | 현 범위에서 허용. 필요 시 Spring Session JDBC로 확장 |
