import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowRight, X, CheckCircle2, MessageCircle, SkipForward, Sparkles, ChevronRight } from "lucide-react";
import { BASE_URL } from '../config';
import { useAuth } from '@/context/AuthContext';

const PLACEHOLDERS = [
  "자유롭게 이야기해줘요 😊",
  "이 이야기가 진짜 궁금했어요 :)",
  "어떤 경험이었는지 들려줄래요!",
  "편하게 말해줘도 돼요 :)",
  "오, 이 부분 더 알고 싶어요!",
  "어떻게 됐는지 궁금한데요?",
  "솔직하게 털어놔줘요 ㅎㅎ",
];

const DepthInterview = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const {
    assessmentId,
    experiences = [],
    complexItems = [],
    jobCode,
    jobName,
  } = location.state || {};

  const [selectedExperiences, setSelectedExperiences] = useState(
    experiences.map(e => ({ name: e, selected: true }))
  );
  const [phase, setPhase] = useState("select");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [queue, setQueue] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [allAnswers, setAllAnswers] = useState([]);

  const toggleExperience = (idx) => {
    setSelectedExperiences(prev => prev.map((e, i) => i === idx ? { ...e, selected: !e.selected } : e));
  };

  const startInterview = async () => {
    const activeExperiences = selectedExperiences.filter(e => e.selected).map(e => ({ type: "experience", name: e.name }));
    const activeComplex = complexItems.map(i => ({ type: "complex", name: i.name, reason: i.reason }));
    const fullQueue = [...activeExperiences, ...activeComplex];
    if (fullQueue.length === 0) { toast.error("분석할 항목이 없어요!"); return; }
    setQueue(fullQueue);
    setCurrentIdx(0);
    setPhase("interview");
    await loadQuestions(fullQueue[0]);
  };

  const loadQuestions = async (item) => {
    setLoadingQuestions(true);
    setQuestions([]);
    setAnswers([]);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/api/assessments/depth/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ assessmentId, itemName: item.name, itemType: item.type, reason: item.reason ?? null, jobCode, jobName }),
      });
      if (!res.ok) throw new Error("질문 생성 실패");
      const data = await res.json();
      setQuestions(data.questions.map(q => ({ question: q })));
      setAnswers(new Array(data.questions.length).fill(""));
    } catch (err) {
      toast.error(err.message || "질문을 불러오지 못했어요");
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleAnswerChange = (idx, value) => {
    setAnswers(prev => { const next = [...prev]; next[idx] = value; return next; });
  };

  const handleNext = async () => {
    const item = queue[currentIdx];
    const answeredQna = questions.map((q, i) => ({ question: q.question, answer: answers[i] || "" }));
    const newAnswers = [...allAnswers, { itemName: item.name, type: item.type, qna: answeredQna }];
    setAllAnswers(newAnswers);
    if (currentIdx + 1 >= queue.length) {
      await submitFinalScore(newAnswers);
    } else {
      const nextIdx = currentIdx + 1;
      setCurrentIdx(nextIdx);
      await loadQuestions(queue[nextIdx]);
    }
  };

  const handleSkip = async () => {
    if (currentIdx + 1 >= queue.length) {
      await submitFinalScore(allAnswers);
    } else {
      const nextIdx = currentIdx + 1;
      setCurrentIdx(nextIdx);
      await loadQuestions(queue[nextIdx]);
    }
  };

  const submitFinalScore = async (answers) => {
    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/api/assessments/${assessmentId}/final`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ depthAnswers: answers }),
      });
      if (!res.ok) throw new Error("최종 평가 실패");
      toast.success("심층 분석이 완료됐어요!");
      navigate("/my-assessments", { state: { highlightId: assessmentId } });
    } catch (err) {
      toast.error(err.message || "최종 평가 중 오류가 발생했어요");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "w-full px-4 py-2.5 rounded-lg border border-input text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--gradient-mid)]/50 focus:border-[var(--gradient-mid)] transition-all bg-background text-foreground resize-none";

  if (phase === "select") {
    return (
      <div className="max-w-2xl mx-auto space-y-6 p-6">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-gradient-to-br from-[var(--gradient-start)] via-[var(--gradient-mid)] to-[var(--gradient-end)]">
            <MessageCircle className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[var(--gradient-start)] via-[var(--gradient-mid)] to-[var(--gradient-end)] bg-clip-text text-transparent">심층 분석</h1>
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
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">{item.reason}</p>
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

  if (phase === "interview") {
    const currentItem = queue[currentIdx];
    const progress = (currentIdx / queue.length) * 100;
    const canProceed = answers[questions.length - 1]?.trim().length > 0;

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
                currentItem.type === "experience" ? "bg-green-500/10 text-green-600 dark:text-green-400" :
                "bg-blue-500/10 text-blue-600 dark:text-blue-400"
              }`}>
                {currentItem.type === "experience" ? "경험" : "확인 필요"}
              </div>
            </div>
            <CardTitle className="text-lg mt-1">{currentItem.name}</CardTitle>
            {currentItem.reason && <CardDescription>{currentItem.reason}</CardDescription>}
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
                    <p className="text-sm font-medium text-foreground leading-relaxed">{q.question}</p>
                  </div>
                  <textarea
                    value={answers[idx] || ""}
                    onChange={(e) => handleAnswerChange(idx, e.target.value)}
                    placeholder={PLACEHOLDERS[idx % PLACEHOLDERS.length]}
                    rows={idx === questions.length - 1 ? 4 : 3}
                    className={inputClass}
                  />
                </div>
              ))
            )}

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1 gap-1.5 text-muted-foreground" onClick={handleSkip} disabled={submitting}>
                <SkipForward className="h-4 w-4" />건너뛰기
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white hover:opacity-90 gap-1.5"
                onClick={handleNext}
                disabled={loadingQuestions || submitting || !canProceed}
              >
                {submitting ? "저장 중..." : currentIdx + 1 >= queue.length ? "완료" : "다음"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
};

export default DepthInterview;