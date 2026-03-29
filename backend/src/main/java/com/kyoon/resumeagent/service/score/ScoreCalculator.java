package com.kyoon.resumeagent.service.score;

import com.kyoon.resumeagent.Capability.CapabilityCode;

import java.util.Map;

public interface ScoreCalculator {

    /**
     * 역량 코드별 점수 계산 (0.0 ~ 1.0)
     *
     * @param capCode        계산할 역량 코드
     * @param status         Analyzer 분류 결과 (depth / complex / empty)
     * @param skills         사용자가 보유한 기술 키워드 목록
     * @param evidence       DepthInterview 답변에서 추출된 증거
     * @return 0.0 ~ 1.0 사이의 점수
     */
    double calculate(CapabilityCode capCode, String status, java.util.List<String> skills, EvidenceResult evidence);
}
