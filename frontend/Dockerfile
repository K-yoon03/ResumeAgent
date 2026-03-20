# 1단계: 빌드
FROM node:20-alpine AS builder
WORKDIR /app

# package.json 먼저 복사 → npm install 캐싱
COPY package.json package-lock.json ./
RUN npm install

# 소스 복사 후 빌드
COPY . .
RUN npm run build

# 2단계: Nginx로 서빙
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
