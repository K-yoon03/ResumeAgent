# CareerPilot

> AI 기반 취업 준비 자동화 플랫폼 — 경험을 벡터로, 직무 적합도를 수치로.

---

## 소개

CareerPilot은 취업 준비 전 과정을 AI로 자동화하는 플랫폼이다. 단순 이력서 교정 도구가 아니라, 사용자의 경험을 구조화하고 → 역량 벡터로 수치화하고 → 직무 적합도를 계산하고 → 면접까지 시뮬레이션하는 엔드투엔드 파이프라인을 제공한다.

핵심 차별점은 **경험 기반 역량 표현(Capability Vector)**이다. 사용자가 입력한 프로젝트·경험을 15개 역량 코드로 분류하고, 구인공고의 요구 역량과 코사인 유사도로 매칭한다. "스펙"이 아니라 "경험의 밀도"로 적합도를 판단한다.

---

## 기술 스택

### Backend

| 항목 | 선택 | 비고 |
|---|---|---|
| Framework | Spring Boot 3.4.3 | |
| Language | Java 17 | LTS |
| ORM | Spring Data JPA + Hibernate | |
| Auth | Spring Security + JWT | RefreshToken 전략 |
| DB (dev) | H2 file-based | `ddl-auto=update` |
| DB (prod) | PostgreSQL | OpenStack 배포 |
| Cache | Redis | Session, 프로젝트 캐싱 |
| LLM | OpenAI GPT-4o / 4o-mini | Vision OCR, 면접 파이프라인 |

### Frontend

| 항목 | 선택 |
|---|---|
| Framework | React 19 + Vite |
| UI | shadcn/ui + Tailwind CSS |
| 라우팅 | React Router v7 |
| 상태 관리 | AuthContext + sessionStorage |

### Infra

```
Nginx (proxy) → Spring Boot (app) → PostgreSQL + Redis (db)
```

- OpenStack 3-tier 아키텍처
- Rocky Linux 9 / Docker
- HTTPS: Nginx SSL termination

---

## 핵심 기능

### Capability Vector 매칭 엔진

```
사용자 경험 입력
    ↓
LLM Classifier → 15개 역량 코드로 분류
    ↓
[0.0, 0.8, 0.0, 0.6, ..., 0.3]  ← 15차원 벡터
    ↓
코사인 유사도 → 직무/공고 벡터와 비교
    ↓
적합도 점수 + 부족 역량 gap 리포트
```

User, Job Description, JobPosting 세 엔티티가 동일한 벡터 공간을 공유한다.

### AI 면접 파이프라인

```
AnswerClassifier (Depth/Complex/Empty 분류, temp=0.0, seed=42)
    ↓
DepthInterview (심층 꼬리 질문 생성)
    ↓
FinalScorer (STAR 프레임 기반 종합 평가)
```

- LLM temperature `0.0`, seed `42` 고정 → 재현 가능한 평가
- 입력 필드 8개 의미 구분 설계로 AI 오분류율 감소
- DepthAnswer DB 영속화, 세션 종료 후에도 이력 조회 가능

### Magic Paste + Vision OCR

채용공고 URL 또는 이미지 붙여넣기 → 자동 파싱

- 텍스트: HTML 스크래핑 + 정규화
- 이미지/스크린샷: GPT-4o-mini Vision base64 OCR
- 파싱 결과 JobPosting 엔티티 자동 매핑

### ResumeWriter — STAR 카드 플로우

- STAR(Situation-Task-Action-Result) 단계별 카드 UI
- 단계마다 AI Hint 1회 제공 (서버 추적)
- sessionStorage 캐싱으로 중복 API 호출 차단

### 역량 시각화 대시보드

- SVG 백분위 차트, 역량별 S~C- 등급
- AnimatedProgress 바, 낙관적 업데이트
- AuthContext 이벤트 드리븐 크레딧 갱신

---

## 시스템 아키텍처

```
[ Client ]
React 19 + Vite  /  shadcn + Tailwind  /  React Router  /  AuthContext
    ↓ HTTPS
[ Nginx ]
SSL termination  ·  /api/* → Spring Boot  ·  정적 파일 서빙
    ↓
[ Spring Boot 3.4.3 / Java 17 ]
JWT Filter → Controller → Service → Repository
    ↓
[ Data Layer ]
H2 (dev)  /  PostgreSQL (prod)  /  Redis (cache)
```

- LLM 호출은 서버 사이드 전용 — API 키 클라이언트 노출 없음
- 마이그레이션 전략: `ddl-auto=update` + nullable 컬럼 추가

---

## 프로젝트 상태

- [x] Capability Vector 설계 및 구현
- [x] AI 면접 파이프라인 (Classifier → DepthInterview → FinalScorer)
- [x] Magic Paste + Vision OCR
- [x] STAR 카드 기반 ResumeWriter
- [x] 역량 시각화 대시보드
- [ ] OpenStack 배포 완료 (진행 중)
- [ ] HTTPS 인증서 설정 (진행 중)

---

> Private Repository — 코드 열람은 별도 문의