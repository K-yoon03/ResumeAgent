#!/bin/bash
# cloud-init-tier2-app.sh
# Tier 2 (App) 인스턴스 초기화

set -e

echo "🚀 Tier 2 (App) 자동 설정 시작..."

# 1. 시스템 업데이트
apt update && apt upgrade -y

# 2. Docker 설치
curl -fsSL https://get.docker.com | sh
usermod -aG docker ubuntu

# 3. Docker Compose 설치
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# 4. 필수 패키지
apt install -y git vim htop net-tools curl ufw

# 5. 타임존
timedatectl set-timezone Asia/Seoul

# 6. 방화벽 설정 (Tier 1 Proxy에서만 접근)
# 주의: PROXY_IP는 나중에 수동으로 설정 필요
# ufw allow from PROXY_IP to any port 8080
ufw allow 22/tcp
ufw --force enable

# 7. Git Clone
cd /home/ubuntu
sudo -u ubuntu git clone https://github.com/your-username/career-pilot.git
cd career-pilot
sudo -u ubuntu cp .env.example .env

# 8. 스왑 메모리 (2GB)
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

echo "✅ Tier 2 자동 설정 완료!"
echo "📌 다음 단계:"
echo "1. .env 파일에 Tier 3 DB IP 입력"
echo "2. 방화벽에 Tier 1 IP 추가: sudo ufw allow from PROXY_IP to any port 8080"
echo "3. docker-compose up -d"
