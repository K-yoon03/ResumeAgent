#!/bin/bash
# cloud-init-tier3-db.sh
# Tier 3 (Database) 인스턴스 초기화

set -e

echo "🚀 Tier 3 (DB) 자동 설정 시작..."

# 1. 시스템 업데이트
apt update && apt upgrade -y

# 2. Docker 설치
curl -fsSL https://get.docker.com | sh
usermod -aG docker ubuntu

# 3. Docker Compose 설치
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# 4. 필수 패키지
apt install -y git vim htop net-tools ufw

# 5. 타임존
timedatectl set-timezone Asia/Seoul

# 6. 방화벽 설정
ufw allow from 10.0.2.0/24 to any port 5432  # PostgreSQL
ufw allow from 10.0.2.0/24 to any port 6379  # Redis
ufw allow 22/tcp
ufw --force enable

# 7. 데이터 디렉토리 생성
mkdir -p /data/postgres /data/redis
chown -R 999:999 /data/postgres
chown -R 1000:1000 /data/redis

# 8. Git Clone
cd /home/ubuntu
sudo -u ubuntu git clone https://github.com/your-username/career-pilot.git
cd career-pilot
sudo -u ubuntu cp .env.example .env

echo "✅ Tier 3 자동 설정 완료!"
echo "📌 다음 단계: SSH 접속 후 .env 파일 수정 필요"
