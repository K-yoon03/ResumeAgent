# =============================================================
#  CareerPilot Backend — Multi-stage Dockerfile
#  위치: backend/Dockerfile
#  빌드 컨텍스트: backend/
# =============================================================

# ── Stage 1: Build ────────────────────────────────────────────
FROM eclipse-temurin:17-jdk-alpine AS builder

WORKDIR /build

# 의존성 캐싱: gradle 파일만 먼저 복사 (소스 변경 시 의존성 재다운로드 방지)
COPY gradlew .
COPY gradle gradle
COPY build.gradle settings.gradle ./
RUN chmod +x gradlew && ./gradlew dependencies --no-daemon || true

# 소스 복사 후 빌드
COPY src src
RUN ./gradlew bootJar --no-daemon -x test

# ── Stage 2: Runtime ──────────────────────────────────────────
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# 헬스체크용 wget 설치 (alpine은 기본 없음)
RUN apk add --no-cache wget

# 비루트 사용자 생성 (보안)
RUN addgroup -S spring && adduser -S spring -G spring

# 빌드 결과물만 복사
COPY --from=builder /build/build/libs/*.jar app.jar
RUN chown spring:spring app.jar

# 로그 디렉토리 (compose volume과 매칭)
RUN mkdir -p /app/logs && chown spring:spring /app/logs

USER spring

EXPOSE 8080

# JVM 옵션 — 컨테이너 메모리 인식
ENV JAVA_OPTS="-Xms256m -Xmx512m -XX:+UseContainerSupport"
ENV SPRING_PROFILES_ACTIVE=prod

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]