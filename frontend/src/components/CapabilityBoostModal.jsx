import { useState, useEffect } from "react";
import { X, ChevronRight, Sparkles, TrendingUp, Coins, CheckCircle2, Circle } from "lucide-react";
import { Button } from "./ui/button";
import { useNavigate } from "react-router-dom";
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

export default function CapabilityBoostModal({ capCode, currentLevel, assessmentId, onClose, onComplete }) {
  const navigate = useNavigate();
  const [hint, setHint] = useState(null);
  const [roadmap, setRoadmap] = useState(null);
  const [loadingHint, setLoadingHint] = useState(true);
  const [loadingRoadmap, setLoadingRoadmap] = useState(false);

  // 체크리스트
  const [checkedIndexes, setCheckedIndexes] = useState([]);
  const [completing, setCompleting] = useState(false);
  const [completeResult, setCompleteResult] = useState(null);

  // 경험 추가 재분석
  const [showExperienceInput, setShowExperienceInput] = useState(false);
  const [experienceText, setExperienceText] = useState("");
  const [analyzingExperience, setAnalyzingExperience] = useState(false);

  useEffect(() => {
    fetchHint();
    fetchExistingRoadmap();
  }, [capCode, currentLevel]);

  const fetchExistingRoadmap = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${BASE_URL}/api/capability/roadmap?assessmentId=${assessmentId}&capCode=${capCode}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setRoadmap(data);
        setCheckedIndexes([]);
      }
      // 404면 기존 없음 → 생성 버튼 표시
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
      const data = await res.json();
      setRoadmap(data);
      setCheckedIndexes([]); // 기본 unchecked
    } catch { toast.error("로드맵 생성에 실패했어요"); }
    finally { setLoadingRoadmap(false); }
  };

  const toggleCheck = (idx) => {
    setCheckedIndexes(prev =>
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  const handleAnalyzeExperience = async () => {
    if (!experienceText.trim()) { toast.error("경험을 입력해주세요"); return; }
    setAnalyzingExperience(true);
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
      setShowExperienceInput(false);
      if (onComplete) onComplete();
    } catch { toast.error("분석에 실패했어요"); }
    finally { setAnalyzingExperience(false); }
  };

  const handleComplete = async () => {
    if (!roadmap?.roadmapId) return;
    if (checkedIndexes.length === 0) { toast.error("완료한 항목을 하나 이상 선택해주세요"); return; }
    setCompleting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/api/capability/roadmap/${roadmap.roadmapId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ checkedIndexes }),
      });
      if (!res.ok) throw new Error();
      const result = await res.json();
      setCompleteResult(result);
      if (onComplete) onComplete();
    } catch { toast.error("완료 처리에 실패했어요"); }
    finally { setCompleting(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto">

        {/* 헤더 */}
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card rounded-t-2xl">
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

        <div className="p-5 space-y-5">

          {/* 완료 결과 */}
          {completeResult && (
            <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-500/10 space-y-3">
              <p className="text-sm font-semibold text-purple-400">
                {completeResult.message}
              </p>
              <Button
                className="w-full bg-gradient-to-r from-[#6366f1] to-[#a78bfa] text-white hover:opacity-90"
                onClick={() => {
                  setCompleteResult(null);
                  setShowExperienceInput(true);
                }}
              >
                이 경험을 직접 적어볼까요? →
              </Button>
            </div>
          )}

          {/* 하드코딩 힌트 */}
          {loadingHint ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4 animate-pulse" />힌트 불러오는 중...
            </div>
          ) : hint && !completeResult && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-purple-500" />
                {currentLevel === "NONE"
                  ? "이 역량을 처음 시작하려면?"
                  : hint.nextLevel ? `${LEVEL_LABELS[hint.nextLevel]} 달성하려면?` : "최고 레벨"
                }
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed bg-muted/40 rounded-xl p-3">
                {hint.hint}
              </p>
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

          {/* 맞춤 로드맵 + 체크리스트 */}
          {roadmap && !completeResult && (
            <div className="space-y-3 border-t border-border pt-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />맞춤 분석 결과
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{roadmap.analysis}</p>
              {roadmap.specificFeedback && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm text-amber-700 dark:text-amber-300">
                  {roadmap.specificFeedback}
                </div>
              )}

              {/* 체크리스트 */}
              {roadmap.roadmap?.length > 0 && (
                <div className="space-y-2 pt-1">
                  <p className="text-xs text-muted-foreground">완료한 항목을 체크해주세요</p>
                  {roadmap.roadmap.map((step, i) => (
                    <button
                      key={i}
                      onClick={() => toggleCheck(i)}
                      className={`w-full text-left flex items-start gap-2.5 p-3 rounded-xl border transition-all ${
                        checkedIndexes.includes(i)
                          ? "border-purple-500/40 bg-purple-500/5"
                          : "border-border/50 bg-muted/20"
                      }`}
                    >
                      {checkedIndexes.includes(i)
                        ? <CheckCircle2 className="h-4 w-4 text-purple-500 shrink-0 mt-0.5" />
                        : <Circle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      }
                      <span className={`text-sm ${checkedIndexes.includes(i) ? "text-foreground" : "text-muted-foreground"}`}>
                        {step}
                      </span>
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
            </div>
          )}

          {/* 버튼 영역 */}
          {!completeResult && (
            <div className="flex flex-col gap-2 pt-2 border-t border-border">
              {!roadmap ? (
                <>
                  {showExperienceInput ? (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">추가한 경험을 직접 입력해주세요</p>
                      <textarea
                        value={experienceText}
                        onChange={e => setExperienceText(e.target.value)}
                        placeholder={`예: ${hint?.description || "이 역량과 관련된"} 경험을 직접 수행한 내용을 작성해주세요...`}
                        rows={4}
                        className="w-full text-sm rounded-xl border border-border bg-muted/30 p-3 resize-none focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1" onClick={() => setShowExperienceInput(false)}>
                          취소
                        </Button>
                        <Button
                          className="flex-1 bg-gradient-to-r from-[#6366f1] to-[#a78bfa] text-white hover:opacity-90"
                          onClick={handleAnalyzeExperience}
                          disabled={analyzingExperience || !experienceText.trim()}
                        >
                          {analyzingExperience ? "분석 중..." : "분석하기"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setShowExperienceInput(true)}
                      >
                        경험 추가하고 재분석
                      </Button>
                      <Button
                        className="w-full bg-gradient-to-r from-[#6366f1] to-[#a78bfa] text-white hover:opacity-90 gap-2"
                        onClick={fetchRoadmap}
                        disabled={loadingRoadmap}
                      >
                        <Coins className="h-4 w-4" />
                        {loadingRoadmap ? "생성 중..." : "맞춤 로드맵 생성 · 1cr"}
                      </Button>
                    </>
                  )}
                </>
              ) : (
                <div className="space-y-2">
                  <Button
                    className="w-full bg-gradient-to-r from-[#6366f1] to-[#a78bfa] text-white hover:opacity-90 disabled:opacity-40"
                    onClick={handleComplete}
                    disabled={completing || checkedIndexes.length !== roadmap.roadmap?.length}
                  >
                    {completing ? "반영 중..." : checkedIndexes.length === roadmap.roadmap?.length
                      ? "완료하기"
                      : `완료하기 (${checkedIndexes.length}/${roadmap.roadmap?.length || 0} 완료 필요)`
                    }
                  </Button>
                  <button
                    onClick={() => { setRoadmap(null); setCheckedIndexes([]); }}
                    className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
                  >
                    로드맵 재생성 · 1cr
                  </button>
                </div>
              )}
            </div>
          )}

          {completeResult && (
            <Button variant="outline" className="w-full" onClick={onClose}>닫기</Button>
          )}
        </div>
      </div>
    </div>
  );
}