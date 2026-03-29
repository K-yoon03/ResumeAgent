import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowRight, X, CheckCircle2, MessageCircle, SkipForward, Sparkles, ChevronRight, AlertCircle } from "lucide-react";
import { BASE_URL } from '../config';

const PLACEHOLDERS = [
  "자유롭게 이야기해줘요 😊",
  "이 이야기가 진짜 궁금했어요 :)",
  "어떤 경험이었는지 들려줄래요!",
  "편하게 말해줘도 돼요 :)",
  "오, 이 부분 더 알고 싶어요!",
];

const DepthInterview = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    assessmentId,
    experiences = [],
    complexItems = [],
    jobCode,
  } = location.state || {};

  const [selectedExperiences, setSelectedExperiences] = useState(
    experiences.map(e => ({ name: typeof e === 'string' ? e : e.name, selected: true }))
  );

  const [phase, setPhase] = useState("select"); // select | interview | followup | submitting
  const [currentIdx, setCurrentIdx] = useState(0);
  const [queue, setQueue] = useState([]);

  // 현재 경험 질문/답변
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // 추가 질문
  const [followUpQuestion, setFollowUpQuestion] = useState(null);
  const [followUpAnswer, setFollowUpAnswer] = useState("");
  const [analyzeResult, setAnalyzeResult] = useState(null);
  const [loadingFollowUp, setLoadingFollowUp] = useState(false);

  // 전체 완료된 항목 데이터
  const [allItems, setAllItems] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const toggleExperience = (idx) => {
    setSelectedExperiences(prev => prev.map((e, i) => i === idx ? { ...e, selected: !e.selected } : e));
  };

  const startInterview = async () => {
    const activeExperiences = selectedExperiences.filter(e => e.selected).map(e => ({ type: "experience", name: e.name }));
    const activeComplex = complexItems.map(i => ({ type: "complex", name: i.name }));
    const fullQueue = [...activeExperiences, ...activeComplex];
    if (fullQueue.length === 0) { toast.error("분석할 항목이 없어요!"); return; }
    setQueue(fullQueue);
    setCurrentIdx(0);
    setPhase("interview");
    await loadBaseQuestions(fullQueue[0]);
  };

  const loadBaseQuestions = async (item) => {
    setLoadingQuestions(true);
    setQuestions([]);
    setAnswers([]);
    setFollowUpQuestion(null);
    setFollowUpAnswer("");
    setAnalyzeResult(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/api/assessments/${assessmentId}/interview/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ itemName: item.name }),
      });
      if (!res.ok) throw new Error("질문 생성 실패");
      const data = await res.json();
      setQuestions(data.questions);
      setAnswers(new Array(data.questions.length).fill(""));
    } catch (err) {
      toast.error(err.message || "질문을 불러오지 못했어요");
    } finally {
      setLoadingQuestions(false);
    }
  };

  // Base 답변 완료 → 분석 → 추가질문 여부 판단
  const handleBaseAnswersDone = async () => {
    const item = queue[currentIdx];
    const qna = questions.map((q, i) => ({ question: q, answer: answers[i] || "" }));

    setLoadingFollowUp(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/api/assessments/${assessmentId}/interview/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ itemName: item.name, qna }),
      });
      if (!res.ok) throw new Error();
      const analysis = await res.json();
      setAnalyzeResult(analysis);

      if (analysis.needsFollowUp && analysis.followUpTarget) {
        // 추가 질문 생성
        const followRes = await fetch(`${BASE_URL}/api/assessments/${assessmentId}/interview/followup`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            itemName: item.name,
            followUpTarget: analysis.followUpTarget,
            weakReason: analysis.weakReasons?.[analysis.followUpTarget] || "",
          }),
        });
        if (followRes.ok) {
          const followData = await followRes.json();
          setFollowUpQuestion(followData.question);
          setPhase("followup");
          return;
        }
      }

      // 추가 질문 불필요 → 바로 다음으로
      await proceedToNext(item.name, qna, null);
    } catch {
      // 분석 실패해도 계속 진행
      await proceedToNext(item.name, questions.map((q, i) => ({ question: q, answer: answers[i] || "" })), null);
    } finally {
      setLoadingFollowUp(false);
    }
  };

  // 추가 질문 답변 완료
  const handleFollowUpDone = async () => {
    const item = queue[currentIdx];
    const qna = questions.map((q, i) => ({ question: q, answer: answers[i] || "" }));
    if (followUpAnswer.trim()) {
      qna.push({ question: followUpQuestion, answer: followUpAnswer });
    }
    setPhase("interview");
    await proceedToNext(item.name, qna, null);
  };

  const handleSkipFollowUp = async () => {
    const item = queue[currentIdx];
    const qna = questions.map((q, i) => ({ question: q, answer: answers[i] || "" }));
    setPhase("interview");
    await proceedToNext(item.name, qna, null);
  };

  const proceedToNext = async (itemName, qna, _unused) => {
    const newItems = [...allItems, { itemName, qna }];
    setAllItems(newItems);

    if (currentIdx + 1 >= queue.length) {
      await submitFinal(newItems);
    } else {
      const nextIdx = currentIdx + 1;
      setCurrentIdx(nextIdx);
      setPhase("interview");
      await loadBaseQuestions(queue[nextIdx]);
    }
  };

  const handleSkip = async () => {
    const item = queue[currentIdx];
    await proceedToNext(item.name, [], null);
  };

  const submitFinal = async (items) => {
    setSubmitting(true);
    setPhase("submitting");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/api/assessments/${assessmentId}/interview/final`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) throw new Error("최종 평가 실패");
      toast.success("심층 분석이 완료됐어요!");
      navigate("/my-assessments", { state: { highlightId: assessmentId } });
    } catch (err) {
      toast.error(err.message || "최종 평가 중 오류가 발생했어요");
      setPhase("interview");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "w-full px-4 py-2.5 rounded-lg border border-input text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--gradient-mid)]/50 focus:border-[var(--gradient-mid)] transition-all bg-background text-foreground resize-none";

  // ── 경험 선택 화면 ──
  if (phase === "select") {
    return (
      <div className="max-w-2xl mx-auto space-y-6 p-6">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-gradient-to-br from-[var(--gradient-start)] via-[var(--gradient-mid)] to-[var(--gradient-end)]">
            <MessageCircle className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[var(--gradient-start)] via-[var(--gradient-mid)] to-[var(--gradient-end)] bg-clip-text text-transparent">심층 인터뷰</h1>
          <p className="text-muted-foreground text-sm">이야기 나눠볼 경험들을 선택해줘요!</p>
        </div>

        {selectedExperiences.length > 0 && (
          <Card className="border border-border/50 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />경험 / 활동
              </CardTitle>
              <CardDescription>분석에 포함할 경험을 선택하세요</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {selectedExperiences.map((exp, idx) => (
                <button key={idx} onClick={() => toggleExperience(idx)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                    exp.selected ? "border-[var(--gradient-mid)]/40 bg-[var(--gradient-mid)]/5" : "border-border/50 opacity-50"
                  }`}>
                  <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
                    exp.selected ? "border-[var(--gradient-mid)] bg-[var(--gradient-mid)]" : "border-muted-foreground"
                  }`}>
                    {exp.selected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <span className="text-sm font-medium text-foreground">{exp.name}</span>
                  {!exp.selected && <X className="h-3.5 w-3.5 text-muted-foreground ml-auto" />}
                </button>
              ))}
            </CardContent>
          </Card>
        )}

        {complexItems.length > 0 && (
          <Card className="border border-amber-500/30 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />추가로 확인할 것들
              </CardTitle>
              <CardDescription>AI가 더 알고 싶어하는 부분이에요</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {complexItems.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-xl border border-blue-500/20 bg-blue-500/5">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-foreground font-medium">{item.name}</span>
                    {item.reason && <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">{item.reason}</p>}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Button className="w-full bg-gradient-to-r from-[var(--gradient-start)] via-[var(--gradient-mid)] to-[var(--gradient-end)] text-white hover:opacity-90" onClick={startInterview}>
          시작하기<ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    );
  }

  // ── 로딩/제출 화면 ──
  if (phase === "submitting") {
    return (
      <div className="max-w-2xl mx-auto p-6 flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Sparkles className="h-12 w-12 text-[var(--gradient-mid)] animate-pulse" />
        <p className="text-lg font-semibold text-foreground">데이터를 분석하고 있어요...</p>
        <p className="text-sm text-muted-foreground">역량 점수를 계산하고 있습니다</p>
      </div>
    );
  }

  // ── 인터뷰 화면 ──
  const currentItem = queue[currentIdx];
  if (!currentItem) return null;
  const progress = (currentIdx / queue.length) * 100;
  const canProceed = answers.some(a => a.trim().length > 0);

  // ── 추가 질문 화면 ──
  if (phase === "followup" && followUpQuestion) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 p-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{currentIdx + 1} / {queue.length}</span>
            <span>{Math.round(progress)}% 완료</span>
          </div>
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <Card className="border border-amber-500/30 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">조금 더 알려주세요</span>
            </div>
            <CardTitle className="text-lg mt-1">{currentItem.name}</CardTitle>
            {analyzeResult?.weakReasons?.[analyzeResult.followUpTarget] && (
              <CardDescription>{analyzeResult.weakReasons[analyzeResult.followUpTarget]}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <ChevronRight className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-foreground leading-relaxed">{followUpQuestion}</p>
              </div>
              <textarea
                value={followUpAnswer}
                onChange={(e) => setFollowUpAnswer(e.target.value)}
                placeholder="편하게 말해줘도 돼요 :)"
                rows={4}
                className={inputClass}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1 gap-1.5 text-muted-foreground" onClick={handleSkipFollowUp}>
                <SkipForward className="h-4 w-4" />건너뛰기
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white hover:opacity-90 gap-1.5"
                onClick={handleFollowUpDone}
              >
                {currentIdx + 1 >= queue.length ? "완료" : "다음"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{currentIdx + 1} / {queue.length}</span>
          <span>{Math.round(progress)}% 완료</span>
        </div>
        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <Card className="border border-border/50 shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
              currentItem.type === "experience"
                ? "bg-green-500/10 text-green-600 dark:text-green-400"
                : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
            }`}>
              {currentItem.type === "experience" ? "경험" : "확인 필요"}
            </div>
          </div>
          <CardTitle className="text-lg mt-1">{currentItem.name}</CardTitle>
        </CardHeader>

        <CardContent className="space-y-5">
          {loadingQuestions ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
              <Sparkles className="h-4 w-4 mr-2 animate-pulse" />질문을 준비하고 있어요...
            </div>
          ) : (
            questions.map((q, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 text-[var(--gradient-mid)] shrink-0 mt-0.5" />
                  <p className="text-sm font-medium text-foreground leading-relaxed">{q}</p>
                </div>
                <textarea
                  value={answers[idx] || ""}
                  onChange={(e) => {
                    const next = [...answers];
                    next[idx] = e.target.value;
                    setAnswers(next);
                  }}
                  placeholder={PLACEHOLDERS[idx % PLACEHOLDERS.length]}
                  rows={idx === questions.length - 1 ? 4 : 3}
                  className={inputClass}
                />
              </div>
            ))
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1 gap-1.5 text-muted-foreground" onClick={handleSkip} disabled={loadingFollowUp}>
              <SkipForward className="h-4 w-4" />건너뛰기
            </Button>
            <Button
              className="flex-1 bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white hover:opacity-90 gap-1.5"
              onClick={handleBaseAnswersDone}
              disabled={loadingQuestions || loadingFollowUp || !canProceed}
            >
              {loadingFollowUp ? "분석 중..." : currentIdx + 1 >= queue.length ? "완료" : "다음"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DepthInterview;