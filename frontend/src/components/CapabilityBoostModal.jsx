import { useState, useEffect } from "react";
import { X, ChevronRight, Sparkles, TrendingUp, Coins, CheckCircle2, Circle, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { BASE_URL } from "../config";
import { toast } from "sonner";

const LEVEL_LABELS = { L1: "입문", L2: "기본", L3: "심화", L4: "전문", NONE: "미보유" };
const LEVEL_COLORS = {
  L1: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  L2: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  L3: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
  L4: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
  NONE: "bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-400",
};

// view 상태
// "main"        : 초기 화면 (힌트 + 버튼)
// "roadmap"     : 로드맵 체크리스트
// "input"       : 경험 입력 화면
// "loading"     : 서버 처리 중 (로딩 애니메이션)
// "success"     : 완료 애니메이션
// "result"      : 결과 화면

export default function CapabilityBoostModal({ capCode, currentLevel, assessmentId, onClose, onComplete }) {
  const [view, setView] = useState("main");
  const [hint, setHint] = useState(null);
  const [roadmap, setRoadmap] = useState(null);
  const [loadingHint, setLoadingHint] = useState(true);
  const [loadingRoadmap, setLoadingRoadmap] = useState(false);
  const [checkedIndexes, setCheckedIndexes] = useState([]);
  const [experienceText, setExperienceText] = useState("");
  const [completeResult, setCompleteResult] = useState(null);

  useEffect(() => {
    fetchHint();
    fetchExistingRoadmap();
  }, [capCode, currentLevel]);

  // 완료 애니메이션 → 잠시 후 result로 전환
  useEffect(() => {
    if (view === "success") {
      const t = setTimeout(() => setView("result"), 2000);
      return () => clearTimeout(t);
    }
  }, [view]);

  const fetchExistingRoadmap = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${BASE_URL}/api/capability/roadmap?assessmentId=${assessmentId}&capCode=${capCode}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        setRoadmap(await res.json());
        setCheckedIndexes([]);
      }
    } catch { /* 무시 */ }
  };

  const fetchHint = async () => {
    setLoadingHint(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${BASE_URL}/api/capability/hint?capCode=${capCode}&currentLevel=${currentLevel}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) setHint(await res.json());
    } catch { toast.error("힌트를 불러오지 못했어요"); }
    finally { setLoadingHint(false); }
  };

  const fetchRoadmap = async () => {
    setLoadingRoadmap(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/api/capability/roadmap`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ assessmentId, capCode, currentLevel }),
      });
      if (res.status === 402) { toast.error("크레딧이 부족해요"); return; }
      if (!res.ok) throw new Error();
      setRoadmap(await res.json());
      setCheckedIndexes([]);
      setView("roadmap");
    } catch { toast.error("로드맵 생성에 실패했어요"); }
    finally { setLoadingRoadmap(false); }
  };

  const toggleCheck = (idx) =>
    setCheckedIndexes(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);

  // 체크박스 완료 → 경험 입력 화면으로
  const handleChecklistDone = () => {
    setView("input");
  };

  // 경험 입력 후 분석
  const handleAnalyzeExperience = async () => {
    if (!experienceText.trim()) { toast.error("경험을 입력해주세요"); return; }

    setView("loading"); // 로딩 애니메이션 시작

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/api/capability/analyze-experience`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ assessmentId, capCode, experienceText }),
      });
      if (!res.ok) throw new Error();
      const result = await res.json();
      setCompleteResult(result);
      setView("success"); // 완료 애니메이션
      if (onComplete) onComplete(result, false);
    } catch {
      setView("input");
      toast.error("분석에 실패했어요");
    }
  };

  return (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm isolate">
    <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden mx-4">

        {/* 헤더 */}
        {view !== "loading" && view !== "success" && (
          <div className="flex items-center justify-between p-5 border-b border-border bg-card">
            <div>
              <h2 className="font-bold text-base">{hint?.description || capCode}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${LEVEL_COLORS[currentLevel] || ""}`}>
                  현재 {LEVEL_LABELS[currentLevel] || currentLevel}
                </span>
                {hint?.nextLevel && (
                  <>
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${LEVEL_COLORS[hint.nextLevel] || ""}`}>
                      목표 {LEVEL_LABELS[hint.nextLevel]}
                    </span>
                  </>
                )}
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ── main: 힌트 + 버튼 ── */}
        {view === "main" && (
          <div className="p-5 space-y-5 overflow-y-auto max-h-[70vh]">
            {loadingHint ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4 animate-pulse" />힌트 불러오는 중...
              </div>
            ) : hint && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-purple-500" />
                  {currentLevel === "NONE"
                    ? "이 역량을 처음 시작하려면?"
                    : hint.nextLevel ? `${LEVEL_LABELS[hint.nextLevel]} 달성하려면?` : "최고 레벨"
                  }
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed bg-muted/40 rounded-xl p-3">{hint.hint}</p>
                {hint.criteria?.length > 0 && (
                  <ul className="space-y-1.5">
                    {hint.criteria.map((c, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0 mt-1.5" />
                        {c}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2 border-t border-border">
              <Button variant="outline" className="w-full" onClick={() => setView("input")}>
                경험 직접 작성하기
              </Button>
              {roadmap ? (
                <Button variant="outline" className="w-full" onClick={() => setView("roadmap")}>
                  로드맵 보기
                </Button>
              ) : (
                <Button
                  className="w-full bg-gradient-to-r from-[#6366f1] to-[#a78bfa] text-white hover:opacity-90 gap-2"
                  onClick={fetchRoadmap}
                  disabled={loadingRoadmap}
                >
                  <Coins className="h-4 w-4" />
                  {loadingRoadmap ? "생성 중..." : "맞춤 로드맵 생성 · 1cr"}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* ── roadmap: 체크리스트 ── */}
        {view === "roadmap" && roadmap && (
          <div className="p-5 space-y-4 overflow-y-auto max-h-[70vh]">
            <p className="text-sm text-muted-foreground leading-relaxed">{roadmap.analysis}</p>
            {roadmap.specificFeedback && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm text-amber-700 dark:text-amber-300">
                {roadmap.specificFeedback}
              </div>
            )}
            {roadmap.roadmap?.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">완료한 항목을 체크해주세요</p>
                {roadmap.roadmap.map((step, i) => (
                  <button
                    key={i}
                    onClick={() => toggleCheck(i)}
                    className={`w-full text-left flex items-start gap-2.5 p-3 rounded-xl border transition-all ${
                      checkedIndexes.includes(i) ? "border-purple-500/40 bg-purple-500/5" : "border-border/50 bg-muted/20"
                    }`}
                  >
                    {checkedIndexes.includes(i)
                      ? <CheckCircle2 className="h-4 w-4 text-purple-500 shrink-0 mt-0.5" />
                      : <Circle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    }
                    <div className="flex flex-col gap-0.5">
                      <span className={`text-sm font-medium ${checkedIndexes.includes(i) ? "text-foreground" : "text-muted-foreground"}`}>
                        {step.action}
                      </span>
                      {step.checkpoint && (
                        <span className="text-xs text-muted-foreground leading-relaxed">
                          {step.checkpoint}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
            {roadmap.estimatedScoreUp > 0 && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-sm text-green-600 dark:text-green-400 font-medium">
                <TrendingUp className="h-4 w-4 shrink-0" />
                이 내용을 보완하면 약 +{roadmap.estimatedScoreUp}점 상승이 예상됩니다!
              </div>
            )}
            <div className="flex flex-col gap-2 pt-2 border-t border-border">
              <Button
                className="w-full bg-gradient-to-r from-[#6366f1] to-[#a78bfa] text-white hover:opacity-90 disabled:opacity-40"
                onClick={handleChecklistDone}
                disabled={checkedIndexes.length === 0}
              >
                {checkedIndexes.length > 0
                  ? `작성하러 가기 (${checkedIndexes.length}/${roadmap.roadmap?.length || 0})`
                  : "항목을 선택해주세요"
                }
              </Button>
              <button onClick={() => setView("main")} className="text-xs text-muted-foreground hover:text-foreground transition-colors py-1">
                뒤로
              </button>
            </div>
          </div>
        )}

        {/* ── input: 경험 작성 ── */}
        {view === "input" && (
          <div className="p-5 space-y-4">
            <p className="text-sm text-muted-foreground">
              {hint?.description || capCode}와 관련된 경험을 직접 작성해주세요.
            </p>
            <textarea
              value={experienceText}
              onChange={e => setExperienceText(e.target.value)}
              placeholder={`예: ${hint?.description || "이 역량"} 관련 경험을 구체적으로 작성해주세요...`}
              rows={6}
              className="w-full text-sm rounded-xl border border-border bg-muted/30 p-3 resize-none focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setView(roadmap ? "roadmap" : "main")}>
                뒤로
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-[#6366f1] to-[#a78bfa] text-white hover:opacity-90"
                onClick={handleAnalyzeExperience}
                disabled={!experienceText.trim()}
              >
                분석하기
              </Button>
            </div>
          </div>
        )}

        {/* ── loading: 서버 처리 중 ── */}
        {view === "loading" && (
          <div className="flex flex-col items-center justify-center gap-6 py-16 px-6">
            <div className="relative flex items-center justify-center">
              <div className="w-24 h-24 rounded-full border-4 border-purple-500/20" />
              <div
                className="w-24 h-24 rounded-full border-4 border-t-purple-500 border-r-transparent border-b-transparent border-l-transparent absolute"
                style={{ animation: "spin 1s linear infinite" }}
              />
              <Sparkles className="h-8 w-8 text-purple-400 absolute animate-pulse" />
            </div>
            <div className="text-center space-y-1">
              <p className="font-semibold text-foreground">분석 중...</p>
              <p className="text-sm text-muted-foreground">역량을 평가하고 있어요</p>
            </div>
          </div>
        )}

        {/* ── success: 완료 애니메이션 ── */}
        {view === "success" && (
          <div className="flex flex-col items-center justify-center gap-6 py-16 px-6">
            <div className="relative flex items-center justify-center">
              <div className="w-24 h-24 rounded-full border-4 border-green-500/30 absolute animate-ping" style={{ animationDuration: "1.5s" }} />
              <div className="w-20 h-20 rounded-full border-4 border-green-500 absolute" />
              <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-green-500"
                  viewBox="0 0 52 52"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path
                    d="M14 26 L22 34 L38 18"
                    style={{
                      strokeDasharray: 40,
                      strokeDashoffset: 0,
                      animation: "drawCheck 0.6s ease-in-out forwards",
                    }}
                  />
                </svg>
              </div>
            </div>
            <p className="text-xl font-bold text-foreground">반영됐어요!</p>
          </div>
        )}

        {/* ── result: 결과 화면 ── */}
        {view === "result" && (
          <div className="flex flex-col items-center gap-5 p-8">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <div className="text-center space-y-2">
              <p className="text-lg font-bold text-foreground">반영됐어요!</p>
              <p className="text-sm text-muted-foreground">
                {completeResult?.improved
                  ? `+${completeResult.scoreAfter - completeResult.scoreBefore}점 상승했어요!`
                  : currentLevel === "NONE"
                    ? "역량이 새로 반영됐어요!"
                    : "이미 해당 역량이 충분히 반영되어 있어요."
                }
              </p>
            </div>
            <Button variant="outline" className="w-full" onClick={onClose}>확인</Button>
          </div>
        )}

      </div>

      <style>{`
        @keyframes drawCheck {
          from { stroke-dashoffset: 40; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}