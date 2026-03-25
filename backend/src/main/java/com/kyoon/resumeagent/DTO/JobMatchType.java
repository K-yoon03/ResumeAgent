package com.kyoon.resumeagent.DTO;

public enum JobMatchType {
    EXACT_MATCH,      // 정확 매칭 (80% 이상)
    SIMILAR_MATCH,    // 유사 직무 추천 (50~80%)
    CATEGORY_MATCH,   // 대분류 임시 매칭 (50% 미만)
    NO_MATCH          // 완전 실패 (거의 없음)
}