package com.kyoon.resumeagent.service;

import com.kyoon.resumeagent.DTO.JobMatchResult;
import com.kyoon.resumeagent.Entity.User;
import com.kyoon.resumeagent.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class JobChangeService {

    private final UserRepository userRepository;
    private final JobMatcherService jobMatcherService;

    private static final int MAX_DAILY_CHANGES = 3;

    /**
     * 오늘 직무 변경 가능한지 확인
     */
    public boolean canChangeJob(User user) {
        LocalDate today = LocalDate.now();

        // 날짜가 바뀌었으면 카운트 초기화
        if (user.getLastJobChangeDate() == null ||
                !user.getLastJobChangeDate().equals(today)) {
            return true;
        }

        // 오늘 3회 미만이면 가능
        return user.getJobChangeCount() < MAX_DAILY_CHANGES;
    }

    /**
     * 남은 변경 횟수 조회
     */
    public int getRemainingChanges(User user) {
        LocalDate today = LocalDate.now();

        if (user.getLastJobChangeDate() == null ||
                !user.getLastJobChangeDate().equals(today)) {
            return MAX_DAILY_CHANGES;
        }

        return MAX_DAILY_CHANGES - user.getJobChangeCount();
    }

    /**
     * 직무 변경 실행
     */
    @Transactional
    public JobMatchResult changeJob(User user, String desiredJobText) throws Exception {
        // 1. 변경 가능 여부 확인
        if (!canChangeJob(user)) {
            throw new IllegalStateException("직무는 하루에 3번까지만 변경할 수 있습니다.");
        }

        // 2. JobMatcher 호출
        JobMatchResult matchResult = jobMatcherService.matchJob(desiredJobText);

        // 3. User 업데이트
        updateUserJob(user, desiredJobText, matchResult);

        // 4. 변경 횟수 증가
        incrementChangeCount(user);

        // 5. 저장
        userRepository.save(user);

        return matchResult;
    }

    /**
     * User 직무 정보 업데이트
     */
    private void updateUserJob(User user, String inputText, JobMatchResult matchResult) {
        user.setDesiredJobText(inputText);
        user.setMappedJobCode(matchResult.jobCode());
        user.setIsTemporaryJob(matchResult.isTemporary());
        user.setJobMatchType(matchResult.matchType().name());
        user.setJobMatchConfidence(matchResult.confidence());
        user.setJobMappedAt(LocalDateTime.now());
    }

    /**
     * 변경 횟수 증가
     */
    private void incrementChangeCount(User user) {
        LocalDate today = LocalDate.now();

        // 날짜가 바뀌었으면 초기화
        if (user.getLastJobChangeDate() == null ||
                !user.getLastJobChangeDate().equals(today)) {
            user.setJobChangeCount(1);
            user.setLastJobChangeDate(today);
        } else {
            user.setJobChangeCount(user.getJobChangeCount() + 1);
        }
    }
}