package com.kyoon.resumeagent.controller;

import com.kyoon.resumeagent.DTO.ChangeJobRequest;
import com.kyoon.resumeagent.DTO.ChangeJobResponse;
import com.kyoon.resumeagent.DTO.JobMatchResult;
import com.kyoon.resumeagent.Entity.User;
import com.kyoon.resumeagent.service.JobChangeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
public class UserController {

    private final JobChangeService jobChangeService;

    /**
     * 직무 변경 (1일 3회 제한)
     * PUT /api/user/job
     */
    @PutMapping("/job")
    public ResponseEntity<?> changeJob(
            @AuthenticationPrincipal User user,
            @RequestBody ChangeJobRequest request) {

        try {
            // 직무 변경 실행
            JobMatchResult matchResult = jobChangeService.changeJob(user, request.desiredJob());

            // 남은 횟수 계산
            int remaining = jobChangeService.getRemainingChanges(user);

            // 응답 생성
            ChangeJobResponse response = new ChangeJobResponse(
                    matchResult,
                    remaining,
                    "직무가 성공적으로 변경되었습니다."
            );

            return ResponseEntity.ok(response);

        } catch (IllegalStateException e) {
            // 1일 3회 초과
            return ResponseEntity.status(429)
                    .body(new ErrorResponse(e.getMessage()));

        } catch (Exception e) {
            // 기타 오류
            return ResponseEntity.internalServerError()
                    .body(new ErrorResponse("직무 변경 중 오류가 발생했습니다."));
        }
    }

    /**
     * 남은 변경 횟수 조회
     * GET /api/user/job/remaining-changes
     */
    @GetMapping("/job/remaining-changes")
    public ResponseEntity<RemainingChangesResponse> getRemainingChanges(
            @AuthenticationPrincipal User user) {

        int remaining = jobChangeService.getRemainingChanges(user);

        return ResponseEntity.ok(new RemainingChangesResponse(
                remaining,
                3 - remaining,  // 사용한 횟수
                3               // 최대 횟수
        ));
    }

    // 에러 응답 DTO
    record ErrorResponse(String message) {}

    // 남은 횟수 응답 DTO
    record RemainingChangesResponse(
            int remaining,
            int used,
            int max
    ) {}
}