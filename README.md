# CareerPilot - AI 취업 도우미

AI 기반 자기소개서 분석, 이력서 생성, 모의 면접을 제공하는 종합 취업 지원 플랫폼

## 🚀 빠른 시작

```bash
# 1. 클론
git clone https://github.com/your-username/career-pilot.git
cd career-pilot

# 2. 환경변수 설정
cp .env.example .env
nano .env  # 실제 값 입력

# 3. Docker로 실행
docker-compose up -d

# 4. 접속
http://localhost
```

## 📋 배포 가이드

### Tier 3 (DB) - 먼저 실행!
```bash
docker-compose -f docker-compose-db.yml up -d
```

### Tier 2 (App) - .env에 Tier 3 IP 입력 후
```bash
docker-compose up -d
```

상세한 가이드는 [DEPLOY.md](./DEPLOY.md) 참조