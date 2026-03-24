#!/bin/bash
# cloud-init-tier1-proxy.sh
# Tier 1 (Nginx Proxy) 인스턴스 초기화

set -e

echo "🚀 Tier 1 (Proxy) 자동 설정 시작..."

# 1. 시스템 업데이트
apt update && apt upgrade -y

# 2. Nginx 설치
apt install -y nginx certbot python3-certbot-nginx

# 3. 필수 패키지
apt install -y git vim htop net-tools curl ufw

# 4. 타임존
timedatectl set-timezone Asia/Seoul

# 5. 방화벽 설정
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
ufw allow 22/tcp   # SSH
ufw --force enable

# 6. Nginx 시작
systemctl enable nginx
systemctl start nginx

# 7. Git Clone (설정 파일용)
cd /home/ubuntu
sudo -u ubuntu git clone https://github.com/your-username/career-pilot.git

echo "✅ Tier 1 자동 설정 완료!"
echo "📌 다음 단계:"
echo "1. Nginx 설정 파일 작성"
echo "2. sudo cp /home/ubuntu/career-pilot/scripts/nginx/careerpilot.conf /etc/nginx/sites-available/"
echo "3. sudo ln -s /etc/nginx/sites-available/careerpilot /etc/nginx/sites-enabled/"
echo "4. sudo nginx -t && sudo systemctl reload nginx"
