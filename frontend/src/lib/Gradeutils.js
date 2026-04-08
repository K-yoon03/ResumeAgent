/**
 * gradeUtils.js
 * 등급 기준, 색상, 멘트 공통 유틸
 * 사용: DashboardPage.jsx, MyAssessments.jsx
 */

export const getGrade = (score) => {
  if (score >= 75) return "S";
  if (score >= 70) return "A+";
  if (score >= 65) return "A";
  if (score >= 60) return "B+";
  if (score >= 55) return "B";
  if (score >= 50) return "B-";
  if (score >= 45) return "C+";
  if (score >= 40) return "C";
  return "C-";
};

// 게이지/뱃지 색상 (tailwind className) — 5구간
export const getGradeColor = (grade) => {
  if (grade === "S")                          return "from-yellow-400 to-orange-500";
  if (grade === "A+" || grade === "A")        return "from-green-400 to-emerald-500";
  if (grade === "B+" || grade === "B" || grade === "B-") return "from-blue-400 to-cyan-500";
  if (grade === "C+" || grade === "C")        return "from-violet-400 to-purple-500";
  return "from-gray-400 to-gray-500"; // C-
};

// 게이지 hex 색상 (SVG용) — 5구간
export const getGradeHex = (grade) => {
  if (grade === "S")                          return "#f59e0b";
  if (grade === "A+" || grade === "A")        return "#10b981";
  if (grade === "B+" || grade === "B" || grade === "B-") return "#3b82f6";
  if (grade === "C+" || grade === "C")        return "#8b5cf6";
  return "#94a3b8"; // C-
};

// TECHNICIAN/PROFESSIONER + grade 조합 멘트
export const getGradeMent = (grade, tier) => {
  const isPro = tier === "PROFESSIONER";
  const mentMap = {
    S:    isPro ? "최고 수준의 전문가예요 🏆" : "놀라운 성장이에요 🚀",
    "A+": isPro ? "전문가 수준이에요 🎯"       : "한 걸음 더 나아가고 있어요 💪",
    A:    isPro ? "탄탄한 전문 역량이에요 ✨"   : "꾸준히 성장하고 있어요 📈",
    "B+": isPro ? "전문성을 갖추고 있어요 👍"   : "기초가 탄탄해요 🌱",
    B:    isPro ? "좋은 역량을 보유했어요 😊"   : "잘 성장하고 있어요 📈",
    "B-": isPro ? "역량을 발전시키고 있어요 🔥" : "가능성이 보여요 💡",
    "C+": isPro ? "더 도전해보세요 🎯"          : "기초를 다져가고 있어요 🌿",
    C:    isPro ? "꾸준한 노력이 필요해요 📚"   : "차근차근 나아가고 있어요 🐢",
    "C-": isPro ? "새로운 도전을 시작해요 🌅"   : "지금부터 시작이에요 🌅",
  };
  return mentMap[grade] ?? "역량을 키워나가고 있어요";
};

// 게이지 fill 값 (0~100, 점수 그대로 사용)
export const scoreToFill = (score) => Math.min(Math.max(score, 0), 100);