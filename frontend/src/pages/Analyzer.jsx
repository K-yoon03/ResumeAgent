import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Sparkles, GraduationCap, Briefcase, Award, FileText, ArrowRight, X, AlertTriangle, Calendar, Save, RotateCcw, Clock, Target } from "lucide-react";
import { BASE_URL } from '../config';
import { useAuth } from '@/hooks/useAuth';

const MAX_HISTORY = 3;
const HISTORY_KEY = "analysis_history";
const CACHE_KEY = (text) => {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return `analysis_${hash}`;
};

const Analyzer = ({ setGlobalExperience, setGlobalAnalysis }) => {
  const navigate = useNavigate();

  const [targetJob, setTargetJob] = useState("");
  const [structForm, setStructForm] = useState({
    age: "", education: "", career: "", skills: "", story: "",
  });
  const [noneChecked, setNoneChecked] = useState({
    age: false, education: false, career: false, skills: false, story: false,
  });
  const [savedAssessmentId, setSavedAssessmentId] = useState(null);
  const [answer, setAnswer] = useState("");
  const [scoreData, setScoreData] = useState(null);
  const scoreDataRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [showWriterButton, setShowWriterButton] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hasCache, setHasCache] = useState(
    () => {
      const h = sessionStorage.getItem(HISTORY_KEY);
      return h ? JSON.parse(h).length > 0 : false;
    }
  );

  const saveToHistory = (cacheKey, fullText, scoreDataVal, form, noneCheckedVal, targetJobVal) => {
    const history = JSON.parse(sessionStorage.getItem(HISTORY_KEY) || "[]");

    const previewParts = [];
    if (targetJobVal) previewParts.push(`목표: ${targetJobVal}`);
    if (form.age) previewParts.push(`나이: ${form.age}`);
    if (form.education) previewParts.push(`학력: ${form.education.slice(0, 15)}`);
    if (form.career) previewParts.push(`경력: ${form.career.slice(0, 20)}...`);

    const resultPreview = fullText
      .replace(/#+\s*/g, "")
      .replace(/\*+/g, "")
      .replace(/\n+/g, " ")
      .trim()
      .slice(0, 60) + "...";

    const newEntry = {
      key: cacheKey,
      timestamp: Date.now(),
      preview: previewParts.join(" · ") || "입력 내용 없음",
      resultPreview,
      savedForm: form,
      savedNoneChecked: noneCheckedVal,
      savedTargetJob: targetJobVal,
    };

    const filtered = history.filter(h => h.key !== cacheKey);
    const updated = [newEntry, ...filtered].slice(0, MAX_HISTORY);
    const removedKeys = filtered.slice(MAX_HISTORY - 1).map(h => h.key);
    removedKeys.forEach(k => sessionStorage.removeItem(k));

    sessionStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    setHasCache(true);
  };

  const restoreFromHistory = (entry) => {
    const cached = sessionStorage.getItem(entry.key);
    if (!cached) {
      toast.error("해당 분석 내용을 찾을 수 없습니다.");
      return;
    }
    try {
      const { answer: a, scoreData: s } = JSON.parse(cached);
      if (entry.savedForm) setStructForm(entry.savedForm);
      if (entry.savedNoneChecked) setNoneChecked(entry.savedNoneChecked);
      if (entry.savedTargetJob) setTargetJob(entry.savedTargetJob);
      if (a) setAnswer(a);
      if (s) { setScoreData(s); scoreDataRef.current = s; }
      setIsHistoryOpen(false);
      toast.success("분석 내용을 불러왔습니다.");
      setShowWriterButton(true);
    } catch {
      toast.error("불러오는데 실패했습니다.");
    }
  };

  const getHistory = () => JSON.parse(sessionStorage.getItem(HISTORY_KEY) || "[]");

  const openHistory = () => {
    const history = getHistory();
    if (history.length === 0) {
      toast.error("이전 분석 내용이 없습니다.");
      return;
    }
    setIsHistoryOpen(true);
  };

  const resetInput = () => {
    setTargetJob("");
    setStructForm({ age: "", education: "", career: "", skills: "", story: "" });
    setNoneChecked({ age: false, education: false, career: false, skills: false, story: false });
    setAnswer("");
    setScoreData(null);
    scoreDataRef.current = null;
    setSaved(false);
    setShowWriterButton(false);
    toast.success("초기화되었습니다.");
  };

  const clearHistory = () => {
    const history = getHistory();
    history.forEach(entry => sessionStorage.removeItem(entry.key));
    sessionStorage.removeItem(HISTORY_KEY);
    setIsHistoryOpen(false);
    toast.success("이전 분석 내용이 모두 삭제되었습니다.");
  };

  const formatTime = (ts) => {
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const handleStructChange = (e) => {
    setStructForm({ ...structForm, [e.target.name]: e.target.value });
    if (e.target.tagName === "TEXTAREA") {
      e.target.style.height = "auto";
      e.target.style.height = e.target.scrollHeight + "px";
    }
  };

  const handleNoneCheck = (field) => {
    const next = !noneChecked[field];
    setNoneChecked(prev => ({ ...prev, [field]: next }));
    if (next) setStructForm(prev => ({ ...prev, [field]: "" }));
  };

  const buildQuestion = () => {
    const getValue = (field, label) => {
      if (noneChecked[field]) return `${label}: 없음`;
      return structForm[field] ? `${label}: ${structForm[field]}` : null;
    };
    return [
      targetJob ? `목표 직무/분야: ${targetJob}` : null,
      getValue("age", "나이"),
      getValue("education", "학력"),
      getValue("career", "경력 및 경험"),
      getValue("skills", "보유 스킬 및 자격증"),
      getValue("story", "자기소개"),
    ].filter(Boolean).join("\n");
  };

  const isWeak = () => {
    return Object.keys(structForm).filter(k =>
      !noneChecked[k] && structForm[k].trim().length > 0
    ).length < 2;
  };

const askAi = async () => {
    const question = buildQuestion();
    if (question.trim().length < 10) {
      toast.error("최소 하나 이상의 항목을 입력해주세요!");
      return;
    }

    const cacheKey = CACHE_KEY(question);
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        const { answer: cachedAnswer, scoreData: cachedScore } = JSON.parse(cached);
        setAnswer(cachedAnswer);
        setScoreData(cachedScore);
        scoreDataRef.current = cachedScore;
        setIsModalOpen(true);
        return;
      } catch {
        sessionStorage.removeItem(cacheKey);
      }
    }
 
    setLoading(true);
    setAnswer("");
    setScoreData(null);
    scoreDataRef.current = null;
    setSaved(false);
    let fullText = "";
 
    const token = localStorage.getItem("token");
 
    try {
      const [analysisRes] = await Promise.all([
        fetch(`${BASE_URL}/api/v1/agent/analyze`, {
          method: "POST",
          headers: { 
            "Content-Type": "text/plain",
            "Authorization": `Bearer ${token}`
          },
          body: question,
        }),
        fetch(`${BASE_URL}/api/v1/agent/score`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ experience: question }),
        })
          .then(r => r.json())
          .then(data => { setScoreData(data); scoreDataRef.current = data; })
          .catch(() => {})
      ]);

      if (!analysisRes.ok) throw new Error("네트워크 응답에 문제가 있습니다.");

      const reader = analysisRes.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let buffer = "";

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (line.startsWith("data:")) {
            const text = line.slice(5);
            if (text.trim() === "[DONE]") { done = true; break; }
            fullText += text;
            setAnswer(prev => prev + text);
          } else if (line === "" || line === "\r") {
            fullText += "\n";
            setAnswer(prev => prev.endsWith("\n\n") ? prev : prev + "\n");
          }
        }
      }
      
      if (fullText.includes("[REJECT]")) {
        setAnswer(fullText.replace("[REJECT]", "⚠️ **내용을 보강해 주세요:**\n\n"));
      } else {
        // 🔥 성공! 크레딧 갱신!
        refreshCredits();
        
        sessionStorage.setItem(cacheKey, JSON.stringify({
          answer: fullText,
          scoreData: scoreDataRef.current,
        }));
        saveToHistory(cacheKey, fullText, scoreDataRef.current, structForm, noneChecked, targetJob);

        sessionStorage.setItem("pendingAssessment", JSON.stringify({
          experience: buildQuestion(),
          analysis: fullText,
          scoreData: JSON.stringify(scoreDataRef.current),
        }));

        setIsModalOpen(true);
      }
    } catch (error) {
      toast.error("에러가 발생했습니다: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const goToWriter = async () => {
    const question = buildQuestion();
    if (setGlobalExperience) setGlobalExperience(question);
    if (setGlobalAnalysis) setGlobalAnalysis(answer);

    let assessmentId = savedAssessmentId;

    if (!saved) {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const res = await fetch(`${BASE_URL}/api/assessments`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
              experience: question,
              analysis: answer,
              scoreData: scoreData ? JSON.stringify(scoreData) : null
            })
          });
          if (res.ok) {
            const data = await res.json();
            assessmentId = data.id;  // ← 지역 변수 업데이트
            setSavedAssessmentId(data.id);
            setSaved(true);
          }
        } catch {
          // 저장 실패해도 자소서 작성은 진행
        }
      }
    }

    // ← 여기가 핵심! assessmentId가 제대로 설정된 후 navigate
    navigate("/resume-writer", {
      state: {
        experience: question,
        analysis: answer,
        scoreData,
        assessmentId  // ← 이제 data.id가 들어감!
      }
    });
  };

  const saveAssessment = async () => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/login"); return; }
    try {
      const res = await fetch(`${BASE_URL}/api/assessments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          experience: buildQuestion(),
          analysis: answer,
          scoreData: scoreData ? JSON.stringify(scoreData) : null
        })
      });
      const data = await res.json();
      setSavedAssessmentId(data.id);
      setSaved(true);
      toast.success("저장되었습니다!");
    } catch {
      toast.error("저장에 실패했습니다.");
    }
  };

  const structFields = [
    { name: "age", label: "나이", icon: Calendar, placeholder: "예: 25", type: "input" },
    { name: "education", label: "학력", icon: GraduationCap, placeholder: "예: 서울대학교 컴퓨터공학과 졸업", type: "input" },
    { name: "career", label: "경력 및 경험", icon: Briefcase, placeholder: "예: IT 스타트업에서 인턴 경험 6개월, 팀 프로젝트 3회 등", type: "textarea" },
    { name: "skills", label: "보유 스킬 및 자격증", icon: Award, placeholder: "예: Python, JavaScript, AWS, 정보처리기사 등", type: "textarea" },
    { name: "story", label: "자신의 이야기", icon: FileText, placeholder: "성장 배경, 가치관, 목표 등 자유롭게 작성하세요", type: "textarea" },
  ];

  const inputClass = "w-full px-4 py-2.5 rounded-lg border border-input text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--gradient-mid)]/50 focus:border-[var(--gradient-mid)] transition-all";

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">

      {/* 헤더 */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center p-3 rounded-full bg-gradient-to-br from-[var(--gradient-start)] via-[var(--gradient-mid)] to-[var(--gradient-end)]">
          <Sparkles className="h-7 w-7 text-white" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-[var(--gradient-start)] via-[var(--gradient-mid)] to-[var(--gradient-end)] bg-clip-text text-transparent">
          나의 역량을 분석해보세요
        </h1>
        <p className="text-muted-foreground text-base">
          당신의 스펙과 경험을 입력하면 AI가 종합적으로 분석하여<br />
          당신만의 강점을 찾아드립니다
        </p>
      </div>

      {/* 입력 카드 */}
      <Card className="border border-border/50 shadow-lg">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">기본 정보 입력</CardTitle>
              <CardDescription>자세히 작성할수록 더 정확한 분석 결과를 받을 수 있습니다</CardDescription>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={openHistory} className="shrink-0">
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                이전 내용 불러오기
              </Button>
              <Button variant="outline" size="sm" onClick={resetInput} className="shrink-0 text-muted-foreground">
                <X className="mr-1.5 h-3.5 w-3.5" />
                초기화
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">

          {/* 목표 직무 */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2 text-foreground">
              <Target className="h-4 w-4 text-[var(--gradient-mid)]" />
              목표 직무/분야
              <span className="text-xs text-muted-foreground font-normal">(선택)</span>
            </label>
            <input
              type="text"
              value={targetJob}
              onChange={(e) => setTargetJob(e.target.value)}
              placeholder="예: 백엔드 개발자, 데이터 분석가, 마케터 등"
              className={`${inputClass} bg-background text-foreground`}
            />
            <p className="text-xs text-muted-foreground pl-1">
              목표 직무를 입력하면 해당 관점에서 맞춤 분석과 조언을 받을 수 있어요
            </p>
          </div>

          <div className="border-t border-border/40" />

          {/* 구조화 입력 필드 */}
          {structFields.map(({ name, label, icon: Icon, placeholder, type }) => (
            <div key={name} className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium flex items-center gap-2 text-foreground">
                  <Icon className="h-4 w-4 text-[var(--gradient-mid)]" />
                  {label}
                </label>
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={noneChecked[name]}
                    onChange={() => handleNoneCheck(name)}
                    className="w-3.5 h-3.5 accent-[var(--gradient-mid)]"
                  />
                  없음
                </label>
              </div>
              {type === "input" ? (
                <input
                  type="text" name={name}
                  value={noneChecked[name] ? "" : structForm[name]}
                  onChange={handleStructChange}
                  placeholder={noneChecked[name] ? "없음으로 처리됩니다" : placeholder}
                  disabled={noneChecked[name]}
                  className={`${inputClass} ${noneChecked[name] ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50" : "bg-background text-foreground"}`}
                />
              ) : (
                <textarea
                  name={name}
                  value={noneChecked[name] ? "" : structForm[name]}
                  onChange={handleStructChange}
                  placeholder={noneChecked[name] ? "없음으로 처리됩니다" : placeholder}
                  disabled={noneChecked[name]}
                  rows={3}
                  className={`${inputClass} resize-none overflow-hidden ${noneChecked[name] ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50" : "bg-background text-foreground"}`}
                />
              )}
            </div>
          ))}

          {isWeak() && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              내용이 너무 짧거나 부족할 경우 AI가 분석을 거부할 수 있습니다.
            </div>
          )}

          <Button
            className="w-full bg-gradient-to-r from-[var(--gradient-start)] via-[var(--gradient-mid)] to-[var(--gradient-end)] text-white hover:opacity-90 transition-opacity"
            onClick={askAi}
            disabled={loading}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {loading ? "AI가 분석 중입니다..." : "분석 시작하기"}
          </Button>
        </CardContent>
      </Card>

      {/* 분석 결과 */}
      {(answer || loading) && (
        <Card className="border border-border/50 shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                🔍 AI 역량 분석 결과
              </CardTitle>
              {answer && !loading && (
                <Button
                  variant="outline" size="sm"
                  onClick={saveAssessment}
                  disabled={saved}
                  className={saved ? "text-green-600 border-green-300" : ""}
                >
                  <Save className="mr-1.5 h-3.5 w-3.5" />
                  {saved ? "저장됨" : "저장하기"}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none min-h-[200px]">
              {answer ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{answer}</ReactMarkdown>
              ) : (
                <div className="flex items-center justify-center h-48 text-muted-foreground text-sm border-2 border-dashed border-border rounded-lg">
                  AI가 데이터를 분석하며 리포트를 작성하고 있습니다...
                </div>
              )}
            </div>
            {showWriterButton && (
              <Button
                className="w-full mt-6 bg-gradient-to-r from-[var(--gradient-start)] via-[var(--gradient-mid)] to-[var(--gradient-end)] text-white hover:opacity-90"
                onClick={goToWriter}
              >
                ✍️ 자소서 작성하러 가기
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* 분석 완료 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-sm mx-4 bg-card border border-border rounded-2xl shadow-2xl p-8 text-center">
            <button
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setIsModalOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
            <div className="inline-flex items-center justify-center p-3 rounded-full bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] mb-4">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">분석 완료!</h3>
            <p className="text-sm text-muted-foreground mb-6">
              분석 결과를 같이 확인하며<br />자기소개서도 작성해볼까요?
            </p>
            <div className="space-y-3">
              <Button
                className="w-full bg-gradient-to-r from-[var(--gradient-start)] via-[var(--gradient-mid)] to-[var(--gradient-end)] text-white hover:opacity-90"
                onClick={goToWriter}
              >
                자소서 작성하기
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button variant="outline" className="w-full"
                onClick={() => { setIsModalOpen(false); setShowWriterButton(true); }}>
                분석부터 읽어볼래요
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 히스토리 선택 모달 */}
      {isHistoryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-lg mx-4 bg-card border border-border rounded-2xl shadow-2xl p-6">
            <button
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setIsHistoryOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-lg font-bold text-foreground mb-1">이전 분석 내용</h3>
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm text-muted-foreground">불러올 분석을 선택해주세요 (최대 3개)</p>
              <Button variant="ghost" size="sm" onClick={clearHistory}
                className="text-muted-foreground hover:text-destructive text-xs">
                전체 삭제
              </Button>
            </div>
            <div className="space-y-3">
              {getHistory().map((entry, idx) => (
                <button
                  key={entry.key}
                  onClick={() => restoreFromHistory(entry)}
                  className="w-full text-left p-4 rounded-xl border border-border hover:border-[var(--gradient-mid)]/50 hover:bg-[var(--gradient-mid)]/5 transition-all group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--gradient-mid)]/15 text-[var(--gradient-mid)]">
                          {idx + 1}번째 최근
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(entry.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-foreground truncate">{entry.preview}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{entry.resultPreview}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-[var(--gradient-mid)] transition-colors shrink-0 mt-1" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Analyzer;