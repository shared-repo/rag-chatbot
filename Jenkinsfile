pipeline {
    // 어느 컴퓨터에서 실행할지: 사용 가능한 아무 곳 (여기서는 Jenkins 서버 자신)
    agent any

    // 언제 실행할지: 2분마다 GitHub에 새 커밋이 있는지 확인
    triggers {
        pollSCM('H/2 * * * *')
    }

    options {
        timestamps()                                    // 로그에 시간 표시
        buildDiscarder(logRotator(numToKeepStr: '10'))  // 빌드 기록은 최근 10개만 보관
        timeout(time: 40, unit: 'MINUTES')              // 40분 넘으면 강제 종료
        disableConcurrentBuilds()                       // 같은 작업이 동시에 두 번 돌지 않게
    }

    environment {
        CI          = 'true'              // Vitest 등 도구에 "CI 환경"임을 알림
        PYTHONUTF8  = '1'                 // REQ-15: Python 입출력 UTF-8
        LANG        = 'C.UTF-8'           // 콘솔 한글 깨짐 방지
    }

    stages {

        stage('환경 확인') {
            steps {
                sh 'java -version'
                sh 'node -v && npm -v'
                sh 'uv --version && uv python find 3.13'
                sh 'ls -al'
            }
        }

        stage('Batch (PDF 적재)') {
            steps {
                dir('batch') {
                    sh '''
                        rm -rf .venv
                        uv venv --python 3.13 .venv
                        . .venv/bin/activate
                        uv pip install -r requirements.txt
                        pytest -m "not integration" --junitxml=test-report.xml
                    '''
                }
                // PDF 추출 품질 검증 (임베딩·저장 없음 → OpenAI 비용 없음)
                sh '''
                    . batch/.venv/bin/activate
                    python batch/ingest.py --inspect --extractor pymupdf --exclude-pages 4-8
                '''
            }
            post {
                always {
                    junit allowEmptyResults: true, testResults: 'batch/test-report.xml'
                }
            }
        }

        stage('API (FastAPI + LangGraph)') {
            steps {
                dir('api') {
                    sh '''
                        rm -rf .venv
                        uv venv --python 3.13 .venv
                        . .venv/bin/activate
                        uv pip install -r requirements.txt
                        pytest --junitxml=test-report.xml
                    '''
                }
            }
            post {
                always {
                    junit allowEmptyResults: true, testResults: 'api/test-report.xml'
                }
            }
        }

        stage('Backend (Spring Boot)') {
            steps {
                dir('backend') {
                    sh 'chmod +x gradlew'
                    sh './gradlew clean test bootJar --no-daemon'
                }
            }
            post {
                always {
                    junit allowEmptyResults: true,
                          testResults: 'backend/build/test-results/test/*.xml'
                }
            }
        }

        stage('Frontend (React)') {
            steps {
                dir('frontend') {
                    sh 'npm ci'
                    sh 'npm run lint'
                    sh 'npm test -- --reporter=default --reporter=junit --outputFile.junit=test-report.xml'
                    sh 'npm run build'
                }
            }
            post {
                always {
                    junit allowEmptyResults: true, testResults: 'frontend/test-report.xml'
                }
            }
        }
    }

    // 파이프라인이 모두 끝난 뒤 실행
    post {
        success {
            archiveArtifacts artifacts: 'backend/build/libs/*.jar, frontend/dist/**, batch/reports/inspect_report.md',
                             allowEmptyArchive: true,
                             fingerprint: true
            echo '✅ 네 애플리케이션의 빌드와 테스트가 모두 성공했습니다!'
        }
        failure {
            echo '❌ 빌드 또는 테스트가 실패했습니다. Stage View에서 빨간 칸을 찾고 Console Output을 확인하세요.'
        }
    }
}
