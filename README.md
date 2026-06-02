# CareerPilot
> AI 기반 취업 준비 자동화 플랫폼 — 경험을 역량 수준으로, 직무 적합도를 수치로.

---

## 소개

CareerPilot은 취업 준비 전 과정을 AI로 자동화하는 플랫폼이다. 단순 이력서 교정 도구가 아니라, 사용자의 경험을 구조화하고 → NCS 기반 역량 코드로 분류하고 → O*NET Level Scale Anchors 기준으로 수준을 판정하고 → 면접까지 시뮬레이션하는 엔드투엔드 파이프라인을 제공한다.

핵심 차별점은 **경험 기반 역량 수준 판정 엔진**이다. 사용자가 입력한 경험을 NCS 45개 직군 × 123개 역량 코드로 분류하고, O*NET Level Scale Anchors를 기준으로 L1~L4 수준을 자동 판정한다. "스펙"이 아니라 "경험의 깊이와 범위"로 직무 적합도를 계산한다.

---

## 기술 스택

### Backend

| 항목 | 선택 | 비고 |
|---|---|---|
| Framework | Spring Boot 3.4.3 | |
| Language | Java 17 | LTS |
| ORM | Spring Data JPA + Hibernate | |
| Auth | Spring Security + JWT | RefreshToken 전략 |
| AI | Spring AI 1.1.0 | ChatClient, Advisor |
| LLM | gpt-5.4-mini / gpt-5.4-nano | 생성/피드백 vs 분류/판단 역할 분리 |
| DB (dev) | PostgreSQL + pgvector | capability_anchors 임베딩 저장 |
| DB (prod) | PostgreSQL + pgvector | OpenStack 배포 |
| Vector | pgvector (cosine similarity) | 역량 앵커 RAG 검색 |
| Payment | PortOne V2 | 크레딧 결제 |

### Frontend

| 항목 | 선택 |
|---|---|
| Framework | React 19 + Vite |
| UI | shadcn/ui + Tailwind CSS |
| 라우팅 | React Router v7 |
| 상태 관리 | AuthContext + sessionStorage |

### Infra

```
Nginx (proxy) → Spring Boot (app) → PostgreSQL + pgvector (db)
```

- OpenStack 3-tier 아키텍처 (Rocky Linux 9)
- Tier1: Nginx (10.0.3.217) / Tier2: App (10.0.4.97) / Tier3: DB (10.0.1.193)
- Docker 컨테이너 배포
- HTTPS: Nginx SSL termination (Let's Encrypt, 설정 진행 중)

---

## 핵심 기능

### 역량 수준 판정 엔진

```
사용자 경험 입력
    ↓
LLM Analyzer (분류기) → NCS 45개 직군 × 123개 역량 코드로 분류
    ↓
pgvector 코사인 유사도 → O*NET Level Scale Anchors 기반 앵커 검색
    ↓
L1 / L2 / L3 / L4 수준 자동 판정
    ↓
totalScore = depthScore × (0.7 + coverage × 0.3)
    ↓
TECHNICIAN / PROFESSIONER 등급 + 부족 역량 gap 리포트
```

- depthScore(깊이) × coverage(범위) 2축 복합 점수 구조로 점수 역전율 약 40% → 7%로 감소
- L3+ 비율 ≥ 50% 시 PROFESSIONER 판정
- 엄격한 레벨별 점수 범위: L1(10~40), L2(41~65), L3(66~85), L4(86~100)

### AI 면접 파이프라인

```
AnswerClassifier (Depth/Complex/Empty 분류, temp=0.0, seed=42)
    ↓
DepthInterview (심층 꼬리 질문 생성, 경험별 점수 누적)
    ↓
FinalScorer (STAR 프레임 기반 종합 평가)
```

- LLM temperature `0.0`, seed `42` 고정 → 재현 가능한 평가
- `submit-one` 엔드포인트로 경험별 점수 실시간 업데이트
- DepthAnswer DB 영속화, 세션 종료 후에도 이력 조회 가능
- Hallucination 대응: evidence 출처·품질 기반 레벨 상한 제어

### Magic Paste + Vision OCR

채용공고 URL 또는 이미지 붙여넣기 → 자동 파싱

- 텍스트: HTML 스크래핑 + 정규화
- 이미지/스크린샷: GPT-4o-mini Vision base64 OCR
- 파싱 결과 JobPosting 엔티티 자동 매핑 + 역량 벡터 생성

### ResumeWriter — STAR 카드 플로우

- STAR(Situation-Task-Action-Result) 단계별 카드 UI
- 단계마다 AI Hint 1회 제공 (서버 추적)
- sessionStorage 캐싱으로 중복 API 호출 차단

### 역량 시각화 대시보드

- 4-category 분리: 핵심역량 / 공통역량 / 미확인 역량 / 비핵심 역량
- SVG 백분위 차트, 역량별 S~C- 등급
- AnimatedProgress 바, 낙관적 업데이트
- AuthContext 이벤트 드리븐 크레딧 갱신

### 크레딧 결제 시스템

- PortOne V2 연동 (월 100건 이하 무료)
- `CreditInterceptor` 정규식 경로 매칭으로 기능별 차등 과금
- 결제 흐름: `POST /api/payments/prepare` → PortOne SDK → `POST /api/payments/confirm` (서버 검증)
- 사업자등록 및 PG 심사 완료

| 기능 | 크레딧 |
|---|---|
| 심층 인터뷰 시작 | 3cr |
| 자소서 생성 | 2cr |
| 모의면접 | 2cr |
| 역량 로드맵 | 1cr |
| JD 분석 | 1cr |
| 자소서 평가 | 1cr |

---

## 시스템 아키텍처

```
[ Client ]
React 19 + Vite  /  shadcn + Tailwind  /  React Router v7  /  AuthContext
    ↓ HTTPS
[ Nginx ]
SSL termination  ·  /api/* → Spring Boot  ·  정적 파일 서빙
    ↓
[ Spring Boot 3.4.3 / Java 17 ]
JWT Filter → Controller → Service → Repository
Spring AI 1.1.0 (ChatClient, .st 프롬프트)
    ↓
[ Data Layer ]
PostgreSQL + pgvector (prod)  /  PortOne V2 (payment)
```

- LLM 호출은 서버 사이드 전용 — API 키 클라이언트 노출 없음
- gpt-5.4-mini: 생성·피드백 / gpt-5.4-nano: 분류·판단 역할 분리
- RAG: capability_anchors 123개 코드 임베딩 → pgvector 코사인 유사도 검색

---

## RAG 데이터 구조

- `capability_anchors` v4: 123개 역량 코드
- O*NET Level Scale Anchors (LV2/LV4/LV6) 기반 L1~L4 앵커 텍스트
- `failure_condition` + `example` 필드 포함
- NCS 45개 직군 직무군 분류 (`JobCapabilityProfile`)
- isCore: ESCO reuse_level 참조

---

## 프로젝트 상태

- [x] 역량 수준 판정 엔진 (NCS/O*NET/pgvector 기반)
- [x] AI 면접 파이프라인 (Classifier → DepthInterview → FinalScorer)
- [x] Magic Paste + Vision OCR
- [x] STAR 카드 기반 ResumeWriter
- [x] 역량 시각화 대시보드
- [x] PortOne V2 크레딧 결제 연동
- [x] JWT + Google OAuth2 인증
- [ ] OpenStack 배포 완료 (진행 중)
- [x] HTTPS 인증서 설정

---

> Private Repository — 코드 열람은 별도 문의
