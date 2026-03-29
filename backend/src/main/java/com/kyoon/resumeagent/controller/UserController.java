package com.kyoon.resumeagent.controller;

import com.kyoon.resumeagent.DTO.ChangeJobRequest;
import com.kyoon.resumeagent.DTO.ChangeJobResponse;
import com.kyoon.resumeagent.DTO.JobMatchResult;
import com.kyoon.resumeagent.Entity.User;
import com.kyoon.resumeagent.repository.UserRepository;
import com.kyoon.resumeagent.service.JobChangeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
public class UserController {

    private final JobChangeService jobChangeService;
    private final UserRepository userRepository;

    /**
     * 직무 매칭 조회만 (저장 안 함)
     * POST /api/user/job/match
     */
    @PostMapping("/job/match")
    public ResponseEntity<?> matchJob(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody ChangeJobRequest request) {
        try {
            User user = userRepository.findByEmail(userDetails.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found"));
            com.kyoon.resumeagent.DTO.JobMatchResult matchResult =
                    jobChangeService.matchJobOnly(request.desiredJob());
            int remaining = jobChangeService.getRemainingChanges(user);
            return ResponseEntity.ok(new ChangeJobResponse(matchResult, remaining, "매칭 완료"));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(new ErrorResponse("직무 조회 중 오류가 발생했습니다."));
        }
    }

    /**
     * 직무 변경 (1일 3회 제한)
     * PUT /api/user/job
     */
    @PutMapping("/job")
    public ResponseEntity<?> changeJob(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody ChangeJobRequest request) {

        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
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
            System.err.println("❌ changeJob 실패: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                    .body(new ErrorResponse("직무 변경 중 오류가 발생했습니다."));
        }
    }

    /**
     * 직무 직접 저장 (ExperienceMatcher 결과 저장용, 횟수 제한 없음)
     * PUT /api/user/job/direct
     */
    @PutMapping("/job/direct")
    public ResponseEntity<?> setJobDirect(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody DirectJobRequest request) {

        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        try {
            user.setMappedJobCode(request.jobCode());
            user.setDesiredJobText(request.jobName());
            user.setIsTemporaryJob(false);
            userRepository.save(user);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    record DirectJobRequest(String jobCode, String jobName) {}
    @GetMapping("/job/remaining-changes")
    public ResponseEntity<RemainingChangesResponse> getRemainingChanges(
            @AuthenticationPrincipal UserDetails userDetails) {

        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

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