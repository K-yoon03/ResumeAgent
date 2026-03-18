package com.kyoon.resumeagent.Component;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
public class JwtUtil {

    @Value("${jwt.secret}")
    private String secret;

    private final long EXPIRATION = 1000 * 60 * 60 * 24;

    private SecretKey getKey() {
        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public String generateToken(String email) {
        return Jwts.builder()
                .subject(email)          // setSubject → subject
                .issuedAt(new Date())    // setIssuedAt → issuedAt
                .expiration(new Date(System.currentTimeMillis() + EXPIRATION)) // setExpiration → expiration
                .signWith(getKey())
                .compact();
    }

    public String extractEmail(String token) {
        return Jwts.parser()             // parserBuilder() → parser()
                .verifyWith(getKey())    // setSigningKey → verifyWith
                .build()
                .parseSignedClaims(token) // parseClaimsJws → parseSignedClaims
                .getPayload()            // getBody → getPayload
                .getSubject();
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parser()
                    .verifyWith(getKey())
                    .build()
                    .parseSignedClaims(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}