import { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Sparkles, GraduationCap, Briefcase, Award, FileText, ArrowRight, X, AlertTriangle, Calendar, RotateCcw, Clock, Target, Lock, CheckCircle2, AlertCircle, HelpCircle, PenLine, SkipForward, MessageCircle, Languages, BookOpen } from "lucide-react";
import { BASE_URL } from '../config';
import jobCodeMap from '../MappingTable/JobCodeMap.json';
import { useAuth } from '@/context/AuthContext';

const CACHE_VERSION = "v5";
const MAX_HISTORY = 3;
const HISTORY_KEY = `analysis_history_${CACHE_VERSION}`;
const CACHE_KEY = (text) => {
  let hash = 0;
  for (let i = 0; i < text.length; i++) { hash = (hash << 5) - hash + text.charCodeAt(i); hash |= 0; }
  return `analysis_${CACHE_VERSION}_${hash}`;
};

const Analyzer = () => {
  const navigate = useNavigate();
  const { user, refreshCredits, refreshUser } = useAuth();
  const [targetJob, setTargetJob] = useState("");
  const [structForm, setStructForm] = useState({
    age: "", school: "", major: "", career: "", certifications: "", skills: "", language: "", extra: ""
  });
  const [noneChecked, setNoneChecked] = useState({
    age: false, school: false, major: false, career: false, certifications: false, skills: false, language: false, extra: false
  });
  const [savedAssessmentId, setSavedAssessmentId] = useState(null);
  const [scoreData, setScoreData] = useState(null);
  const scoreDataRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(""); // "matching" | "analyzing"
  const [showResult, setShowResult] = useState(false);
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);
  const [skippedItems, setSkippedItems] = useState([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [tempJobInput, setTempJobInput] = useState("");
  const [rewriteHint, setRewriteHint] = useState(null);
  const [jobMatchModal, setJobMatchModal] = useState(null); // { jobCode, jobName, matchType }
  const [pendingExperience, setPendingExperience] = useState(null);
  const [saveAsDesired, setSaveAsDesired] = useState(false);
  const [selectedJobCode, setSelectedJobCode] = useState(null); // 모달에서 선택한 직무
  const [selectedJobName, setSelectedJobName] = useState(null);
  const [hasCache, setHasCache] = useState(() => {
    const h = sessionStorage.getItem(HISTORY_KEY);
    return h ? JSON.parse(h).length > 0 : false;
  });

  const saveToHistory = (cacheKey, scoreDataVal, form, noneCheckedVal, targetJobVal, assessmentId) => {
    const history = JSON.parse(sessionStorage.getItem(HISTORY_KEY) || "[]");
    const previewParts = [];
    if (targetJobVal) previewParts.push(`목표: ${targetJobVal}`);
    if (form.school) previewParts.push(`학교: ${form.school.slice(0, 15)}`);
    if (form.career) previewParts.push(`경력: ${form.career.slice(0, 20)}...`);
    const newEntry = { key: cacheKey, timestamp: Date.now(), preview: previewParts.join(" · ") || "입력 내용 없음", savedForm: form, savedNoneChecked: noneCheckedVal, savedTargetJob: targetJobVal, savedAssessmentId: assessmentId, email: user?.email };
    const filtered = history.filter(h => h.key !== cacheKey);
    const updated = [newEntry, ...filtered].slice(0, MAX_HISTORY);
    filtered.slice(MAX_HISTORY - 1).forEach(h => sessionStorage.removeItem(h.key));
    sessionStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    setHasCache(true);
  };

  const getHistory = () => {
    const history = JSON.parse(sessionStorage.getItem(HISTORY_KEY) || "[]");
    // 현재 유저 이메일과 다른 캐시는 제외
    return history.filter(h => !h.email || h.email === user?.email);
  };

  const restoreFromHistory = (entry) => {
    const cached = sessionStorage.getItem(entry.key);
    if (!cached) { toast.error("해당 분석 내용을 찾을 수 없습니다."); return; }
    try {
      const { scoreData: s } = JSON.parse(cached);
      if (entry.savedForm) setStructForm(entry.savedForm);
      if (entry.savedNoneChecked) setNoneChecked(entry.savedNoneChecked);
      if (entry.savedTargetJob) setTargetJob(entry.savedTargetJob);
      if (s) { setScoreData(s); scoreDataRef.current = s; setShowResult(true); }
      if (entry.savedAssessmentId) setSavedAssessmentId(entry.savedAssessmentId);
      setIsHistoryOpen(false);
      toast.success("분석 내용을 불러왔습니다.");
    } catch { toast.error("불러오는데 실패했습니다."); }
  };

  const resetInput = () => {
    setTargetJob("");
    setStructForm({ age: "", school: "", major: "", career: "", certifications: "", skills: "", language: "", extra: "" });
    setNoneChecked({ age: false, school: false, major: false, career: false, certifications: false, skills: false, language: false, extra: false });
    setScoreData(null); scoreDataRef.current = null;
    setShowResult(false); setShowSignupPrompt(false); setSkippedItems([]); setRewriteHint(null);
    toast.success("초기화되었습니다.");
  };

  const clearHistory = () => {
    getHistory().forEach(entry => sessionStorage.removeItem(entry.key));
    sessionStorage.removeItem(HISTORY_KEY);
    setIsHistoryOpen(false); setHasCache(false);
    toast.success("이전 분석 내용이 모두 삭제되었습니다.");
  };

  const formatTime = (ts) => {
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const handleStructChange = (e) => {
    setStructForm({ ...structForm, [e.target.name]: e.target.value });
    if (e.target.tagName === "TEXTAREA") { e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }
  };

  const handleNoneCheck = (field) => {
    const next = !noneChecked[field];
    setNoneChecked(prev => ({ ...prev, [field]: next }));
    if (next) setStructForm(prev => ({ ...prev, [field]: "" }));
  };

  const buildQuestion = () => {
    const lines = [];
    if (targetJob) lines.push(`목표 직무: ${targetJob}`);
    const fields = [
      { key: "age", label: "나이" },
      { key: "school", label: "학교" },
      { key: "major", label: "전공" },
      { key: "career", label: "경력 및 경험" },
      { key: "certifications", label: "자격증" },
      { key: "skills", label: "보유 직무역량" },
      { key: "language", label: "어학" },
      { key: "extra", label: "기타" },
    ];
    fields.forEach(({ key, label }) => {
      if (noneChecked[key]) lines.push(`${label}: 없음`);
      else if (structForm[key]) lines.push(`${label}: ${structForm[key]}`);
    });
    return lines.join("\n");
  };

  const isWeak = () => {
    const filled = ["career", "certifications", "skills", "language"].filter(
      k => !noneChecked[k] && structForm[k].trim().length > 0
    );
    return filled.length < 1;
  };

  const handleJobModalConfirm = async () => {
    if (!tempJobInput.trim()) { toast.error("희망 직무를 입력해주세요!"); return; }
    setIsJobModalOpen(false);
    await askAi(tempJobInput.trim());
  };

  const handleStartAnalysis = async () => {
    const question = buildQuestion();
    if (question.trim().length < 10) { toast.error("최소 하나 이상의 항목을 입력해주세요!"); return; }
    const token = localStorage.getItem("token");
    if (!token) { askAi(); return; }

    // 희망직무 있는 사람 → match-job 백그라운드 호출 후 모달
    if (user?.mappedJobCode) {
      setLoading(true);
      setLoadingStep("matching");
      try {
        const res = await fetch(`${BASE_URL}/api/assessments/match-job`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ experience: question }),
        });
        const match = res.ok ? await res.json() : null;
        const hintJobName = match && !match.noMatch && match.jobCode !== user.mappedJobCode
          ? match.jobName : null;
        const hintJobCode = match && !match.noMatch && match.jobCode !== user.mappedJobCode
          ? match.jobCode : null;
        setJobMatchModal({
          jobCode: user.mappedJobCode,
          jobName: jobCodeMap[user.mappedJobCode] || user.mappedJobCode,
          noMatch: false,
          reason: null,
          hintJobName,
          hintJobCode,
          fromMapped: true,
        });
      } catch {
        setJobMatchModal({
          jobCode: user.mappedJobCode,
          jobName: jobCodeMap[user.mappedJobCode] || user.mappedJobCode,
          noMatch: false,
          reason: null,
          hintJobName: null,
          hintJobCode: null,
          fromMapped: true,
        });
      } finally {
        setLoading(false);
        setLoadingStep("");
      }
      return;
    }

    // 희망직무 없는 사람 → ExperienceMatcher
    setLoading(true);
    setLoadingStep("matching");
    try {
      const res = await fetch(`${BASE_URL}/api/assessments/match-job`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ experience: question }),
      });
      if (!res.ok) throw new Error();
      const match = await res.json();
      setJobMatchModal({
        jobCode: match.jobCode,
        jobName: match.jobName,
        noMatch: match.noMatch,
        reason: match.reason,
        fromMapped: false,
      });
    } catch {
      askAi();
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
  };

  const confirmJobMatch = async (jobCode) => {
    const jobName = jobCodeMap[jobCode] || jobCode;
    setJobMatchModal(null);
    setSelectedJobCode(jobCode);
    setSelectedJobName(jobName);
    const token = localStorage.getItem("token");
    if (token && saveAsDesired) {
      try {
        await fetch(`${BASE_URL}/api/user/job/direct`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ jobCode, jobName }),
        });
        await refreshUser();
      } catch {}
    }
    setSaveAsDesired(false);
    await askAi(null, jobCode);
  };

  const askAi = async (overrideJobText = null, confirmedJobCode = null) => {
    const question = buildQuestion();
    if (question.trim().length < 10) { toast.error("최소 하나 이상의 항목을 입력해주세요!"); return; }
    const token = localStorage.getItem("token");
    if (token && !user?.mappedJobCode && !overrideJobText) { overrideJobText = user?.desiredJobText ?? ""; }

    const cacheKey = CACHE_KEY(question);
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        const { scoreData: cachedScore } = JSON.parse(cached);
        setScoreData(cachedScore); scoreDataRef.current = cachedScore; setShowResult(true); return;
      } catch { sessionStorage.removeItem(cacheKey); }
    }

    setLoading(true); setLoadingStep("analyzing"); setScoreData(null); scoreDataRef.current = null; setSkippedItems([]); setRewriteHint(null);

    try {
      if (!token) {
        const res = await fetch(`${BASE_URL}/api/v1/agent/analyze`, { method: "POST", headers: { "Content-Type": "text/plain" }, body: question });
        if (!res.ok) throw new Error("분석 실패");
        const reader = res.body.getReader(); const decoder = new TextDecoder("utf-8"); let result = "";
        while (true) { const { value, done } = await reader.read(); if (done) break; result += decoder.decode(value, { stream: true }); }
        setShowSignupPrompt(true); setShowResult(true);
        toast.info("전체 결과를 보려면 가입이 필요합니다!"); return;
      }

      const res = await fetch(`${BASE_URL}/api/assessments/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ jobCode: confirmedJobCode ?? undefined, experience: question }),
      });
      if (!res.ok) {
        if (res.status === 400) {
          toast.error("희망 직무를 먼저 설정해주세요!", { description: "마이페이지에서 희망 직무를 설정한 후 다시 시도해주세요." });
          return;
        }
        const e = await res.json(); throw new Error(e.message || "분석 실패");
      }
      const data = await res.json();
      const parsedScoreData = JSON.parse(data.scoreData);
      setScoreData(parsedScoreData); scoreDataRef.current = parsedScoreData;
      setSavedAssessmentId(data.id); setShowResult(true);
      sessionStorage.setItem(cacheKey, JSON.stringify({ scoreData: parsedScoreData }));
      saveToHistory(cacheKey, parsedScoreData, structForm, noneChecked, targetJob, data.id);
      await refreshCredits();
      toast.success("역량 분석이 완료되었습니다!");
    } catch (err) {
      console.error("Analysis error:", err);
      toast.error(err.message || "분석 중 오류가 발생했습니다.");
    } finally { setLoading(false); }
  };

  const handleSkip = (itemName) => setSkippedItems(prev => [...prev, itemName]);

  const fieldNameMap = {
    career: "career", certifications: "certifications",
    skills: "skills", language: "language", extra: "extra"
  };

  const handleRewrite = (field = "skills", hint = null) => {
    setRewriteHint(hint ? { field, hint } : null);
    setTimeout(() => {
      const el = document.querySelector(`[name="${field}"]`);
      if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); el.focus(); }
    }, 100);
  };

  const goToDepthInterview = () => {
    if (!scoreData || !savedAssessmentId) return;
    const depthComps = (scoreData.competencyResults || []).filter(c => c.status === "depth" && !skippedItems.includes(c.name));
    const complexComps = (scoreData.competencyResults || []).filter(c => c.status === "complex" && !skippedItems.includes(c.name));
    navigate("/depth-interview", {
      state: {
        assessmentId: savedAssessmentId,
        experiences: scoreData.experiences || [],
        depthItems: depthComps.map(c => c.name),
        complexItems: complexComps.map(c => ({ name: c.name, reason: c.reason })),
        jobCode: user?.mappedJobCode,
        jobName: jobCodeMap[user?.mappedJobCode] ?? user?.desiredJobText ?? "",
      }
    });
  };

  const structFields = [
    { name: "age", label: "나이", icon: Calendar, placeholder: "예: 25", type: "input" },
    { name: "school", label: "학교", icon: GraduationCap, placeholder: "예: ○○대학교", type: "input" },
    { name: "major", label: "전공", icon: BookOpen, placeholder: "예: 컴퓨터소프트웨어공학과", type: "input" },
    { name: "career", label: "경력 및 경험", icon: Briefcase, placeholder: "프로젝트, 인턴십, 아르바이트, 졸업논문, 동아리 활동 등", type: "textarea" },
    { name: "certifications", label: "자격증", icon: Award, placeholder: "예: 정보처리기사, SQLD, 전산세무회계 2급", type: "textarea" },
    { name: "skills", label: "보유 직무역량", icon: Sparkles, placeholder: "예: Spring Boot, Python, Figma, Excel, PhotoShop", type: "textarea" },
    { name: "language", label: "어학", icon: Languages, placeholder: "예: TOEIC 850, JLPT N2, OPIc AL", type: "textarea" },
    { name: "extra", label: "기타", icon: FileText, placeholder: "위 항목에 해당하지 않는 내용을 자유롭게 작성하세요", type: "textarea" },
  ];

  const inputClass = "w-full px-4 py-2.5 rounded-lg border border-input text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--gradient-mid)]/50 focus:border-[var(--gradient-mid)] transition-all";

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center p-3 rounded-full bg-gradient-to-br from-[var(--gradient-start)] via-[var(--gradient-mid)] to-[var(--gradient-end)]">
          <Sparkles className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-[var(--gradient-start)] via-[var(--gradient-mid)] to-[var(--gradient-end)] bg-clip-text text-transparent">AI 역량 분석</h1>
        <p className="text-lg text-muted-foreground">당신의 경험을 AI가 분석하고 역량을 평가합니다</p>
        <div className="flex items-center justify-center gap-3">
          {hasCache && (
            <Button variant="outline" size="sm" onClick={() => setIsHistoryOpen(true)} className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />이전 분석 불러오기
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={resetInput} className="flex items-center gap-1.5">
            <RotateCcw className="h-4 w-4" />초기화
          </Button>
        </div>
      </div>

      <Card className="border border-border/50 shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">✏️ 경험 입력</CardTitle>
          <CardDescription>각 항목에 맞게 작성해주세요. 없는 항목은 체크박스를 선택하면 됩니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {user?.mappedJobCode && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-[var(--gradient-mid)]/10 border border-[var(--gradient-mid)]/20">
              <Target className="h-4 w-4 text-[var(--gradient-mid)] shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">평가 직무</p>
                <p className="text-sm font-medium text-foreground truncate">
                  {selectedJobName || jobCodeMap[user.mappedJobCode] || user.mappedJobCode}
                  {!selectedJobCode && user.desiredJobText && user.desiredJobText !== jobCodeMap[user.mappedJobCode] && (
                    <span className="text-xs text-muted-foreground ml-1">({user.desiredJobText})</span>
                  )}
                </p>
              </div>
              {user.isTemporaryJob && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">임시</span>}
            </div>
          )}

          <div className="border-t border-border/40" />

          {structFields.map(({ name, label, icon: Icon, placeholder, type }) => (
            <div key={name} className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium flex items-center gap-2 text-foreground">
                  <Icon className="h-4 w-4 text-[var(--gradient-mid)]" />{label}
                </label>
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
                  <input type="checkbox" checked={noneChecked[name]} onChange={() => handleNoneCheck(name)} className="w-3.5 h-3.5 accent-[var(--gradient-mid)]" />없음
                </label>
              </div>
              {type === "input" ? (
                <input type="text" name={name} value={noneChecked[name] ? "" : structForm[name]} onChange={handleStructChange}
                  placeholder={noneChecked[name] ? "없음으로 처리됩니다" : placeholder} disabled={noneChecked[name]}
                  className={`${inputClass} ${noneChecked[name] ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50" : "bg-background text-foreground"}`} />
              ) : (
                <textarea name={name} value={noneChecked[name] ? "" : structForm[name]} onChange={handleStructChange}
                  placeholder={noneChecked[name] ? "없음으로 처리됩니다" : placeholder} disabled={noneChecked[name]} rows={3}
                  className={`${inputClass} resize-none overflow-hidden ${noneChecked[name] ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50" : "bg-background text-foreground"}`} />
              )}
              {rewriteHint?.field === name && (
                <p className="text-xs text-[var(--gradient-mid)] mt-1 pl-1 animate-pulse">
                  💡 {rewriteHint.hint}
                </p>
              )}
            </div>
          ))}

          {isWeak() && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />경력, 자격증, 직무역량, 어학 중 최소 하나는 입력해주세요!
            </div>
          )}

          <Button className="w-full bg-gradient-to-r from-[var(--gradient-start)] via-[var(--gradient-mid)] to-[var(--gradient-end)] text-white hover:opacity-90 transition-opacity" onClick={handleStartAnalysis} disabled={loading}>
            {loading ? (
              <>
                <svg className="animate-spin mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                {loadingStep === "matching" ? "직무를 파악하는 중..." : "AI가 분석 중입니다..."}
              </>
            ) : (
              <><Sparkles className="mr-2 h-4 w-4" />분석 시작하기</>
            )}
          </Button>
        </CardContent>
      </Card>

      {showResult && (
        <Card className="border border-border/50 shadow-lg relative">
          {showSignupPrompt && (
            <div className="absolute inset-0 backdrop-blur-sm bg-background/80 z-10 flex flex-col items-center justify-center rounded-lg p-8">
              <Lock className="h-12 w-12 text-[var(--gradient-mid)] mb-4" />
              <h3 className="text-xl font-bold mb-2">전체 결과를 확인하세요!</h3>
              <p className="text-sm text-muted-foreground mb-6 text-center">가입하고 역량별 상세 점수와<br />맞춤 자기소개서를 받아보세요</p>
              <Link to="/register">
                <Button size="lg" className="bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)]">
                  가입하고 계속하기<ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          )}

          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">🔍 역량 분석 결과</CardTitle>
            <CardDescription>부족한 항목을 보완하면 더 정확한 평가를 받을 수 있어요</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(scoreData?.competencyResults || [])
              .filter((comp) => comp.status !== "empty" || comp.field === "certifications" || comp.field === "language")
              .map((comp) => {
              const isDepth = comp.status === "depth";
              const isEmpty = comp.status === "empty";
              const isComplex = comp.status === "complex";
              const isSkipped = skippedItems.includes(comp.name);

              return (
                <div key={comp.name} className={`p-4 rounded-xl border transition-all ${
                  isSkipped ? "border-border/30 opacity-50" :
                  isComplex ? "border-blue-500/30 bg-blue-500/5" :
                  isDepth ? "border-purple-500/30 bg-purple-500/5" :
                  isEmpty ? "border-amber-500/30 bg-amber-500/5" :
                  "border-green-500/30 bg-green-500/5"
                }`}>
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 mt-0.5">
                      {isSkipped ? <SkipForward className="h-4 w-4 text-muted-foreground" /> :
                       isComplex ? <HelpCircle className="h-4 w-4 text-blue-500" /> :
                       isDepth ? <MessageCircle className="h-4 w-4 text-purple-500" /> :
                       isEmpty ? <AlertCircle className="h-4 w-4 text-amber-500" /> :
                       <CheckCircle2 className="h-4 w-4 text-green-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{comp.name}</p>
                      {!isComplex && <p className="text-xs text-muted-foreground mt-0.5">{comp.reason}</p>}
                      {isDepth && !isSkipped && (
                        <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">심층 분석에서 확인할게요!</p>
                      )}
                      {isComplex && !isSkipped && (() => {
                        const ci = (scoreData.complexItems || []).find(c => c.name === comp.name);
                        return ci?.certName
                          ? <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">💡 {ci.certName}에 대해 이야기하고 싶어요!</p>
                          : <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">💡 이 항목에 대해 이야기하고 싶어요!</p>;
                      })()}
                      {isEmpty && !isSkipped && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">있다면 적어줄래요?</p>
                      )}
                      {isEmpty && !isSkipped && (
                        <div className="flex gap-2 mt-2">
                          <button onClick={() => handleRewrite(comp.field || "skills", comp.rewriteHint)}
                            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border border-[var(--gradient-mid)]/40 text-[var(--gradient-mid)] hover:bg-[var(--gradient-mid)]/10 transition-colors">
                            <PenLine className="h-3 w-3" />다시쓰기
                          </button>
                          <button onClick={() => handleSkip(comp.name)}
                            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors">
                            <SkipForward className="h-3 w-3" />건너뛰기
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {scoreData && !showSignupPrompt && (
              <Button className="w-full mt-4 bg-gradient-to-r from-[var(--gradient-start)] via-[var(--gradient-mid)] to-[var(--gradient-end)] text-white hover:opacity-90" onClick={goToDepthInterview}>
                심층 분석 시작하기<ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {jobMatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-sm mx-4 bg-card border border-border rounded-2xl shadow-2xl p-8">

            {jobMatchModal.noMatch ? (
              /* NO_MATCH 케이스 */
              <>
                <div className="inline-flex items-center justify-center p-3 rounded-full bg-amber-500/20 mb-4">
                  <AlertCircle className="h-6 w-6 text-amber-500" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-1">직무를 찾지 못했어요</h3>
                <p className="text-sm text-muted-foreground mb-5">{jobMatchModal.reason || "입력하신 경험과 맞는 직무 그룹이 없어요. 아래에서 직접 선택해주세요."}</p>
                <select
                  className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-[var(--gradient-mid)]/50"
                  defaultValue=""
                  onChange={(e) => e.target.value && confirmJobMatch(e.target.value)}
                >
                  <option value="" disabled>직무 그룹 선택...</option>
                  {Object.entries(jobCodeMap).map(([code, name]) => (
                    <option key={code} value={code}>{name}</option>
                  ))}
                </select>
                <label className="flex items-center gap-2 text-sm text-muted-foreground mb-4 cursor-pointer">
                  <input type="checkbox" checked={saveAsDesired} onChange={(e) => setSaveAsDesired(e.target.checked)} className="rounded" />
                  희망직무로 저장
                </label>
                <Button variant="outline" className="w-full" onClick={() => setJobMatchModal(null)}>취소</Button>
              </>
            ) : jobMatchModal.fromMapped ? (
              /* 희망직무 설정된 케이스 */
              <>
                <div className="inline-flex items-center justify-center p-3 rounded-full bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] mb-4">
                  <Briefcase className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-1">이 직무로 평가할게요!</h3>
                <p className="text-2xl font-bold bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] bg-clip-text text-transparent my-4">
                  {jobMatchModal.jobName}
                </p>
                {jobMatchModal.hintJobName && (
                  <button
                    onClick={() => confirmJobMatch(jobMatchModal.hintJobCode)}
                    className="w-full text-left text-xs bg-[var(--gradient-mid)]/10 border border-[var(--gradient-mid)]/20 hover:bg-[var(--gradient-mid)]/20 rounded-lg px-3 py-2 mb-4 text-muted-foreground transition-colors cursor-pointer"
                  >
                    💡 입력하신 경험 기준으로는{" "}
                    <span className="font-bold text-sm bg-gradient-to-r from-[var(--gradient-start)] via-[var(--gradient-mid)] to-[var(--gradient-end)] bg-clip-text text-transparent">
                      {jobMatchModal.hintJobName}
                    </span>
                    {" "}이 잘 어울려요! →
                  </button>
                )}
                <div className="space-y-2">
                  <Button
                    className="w-full bg-gradient-to-r from-[var(--gradient-start)] via-[var(--gradient-mid)] to-[var(--gradient-end)] text-white hover:opacity-90"
                    onClick={() => confirmJobMatch(jobMatchModal.jobCode)}
                  >
                    시작하기
                  </Button>
                  <select
                    className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gradient-mid)]/50"
                    defaultValue=""
                    onChange={(e) => e.target.value && confirmJobMatch(e.target.value)}
                  >
                    <option value="" disabled>다른 직무로 변경...</option>
                    {Object.entries(jobCodeMap).map(([code, name]) => (
                      <option key={code} value={code}>{name}</option>
                    ))}
                  </select>
                  <Button variant="outline" className="w-full" onClick={() => setJobMatchModal(null)}>취소</Button>
                </div>
              </>
            ) : (
              /* 자동 추론 케이스 */
              <>
                <div className="inline-flex items-center justify-center p-3 rounded-full bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] mb-4">
                  <Briefcase className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-1">이 직무로 평가할게요!</h3>
                <p className="text-2xl font-bold bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] bg-clip-text text-transparent my-4">
                  {jobMatchModal.jobName}
                </p>
                {jobMatchModal.reason && (
                  <p className="text-sm text-muted-foreground mb-3">{jobMatchModal.reason}</p>
                )}
                <label className="flex items-center gap-2 text-sm text-muted-foreground mb-4 cursor-pointer">
                  <input type="checkbox" checked={saveAsDesired} onChange={(e) => setSaveAsDesired(e.target.checked)} className="rounded" />
                  희망직무로 저장
                </label>
                <div className="space-y-2">
                  <Button
                    className="w-full bg-gradient-to-r from-[var(--gradient-start)] via-[var(--gradient-mid)] to-[var(--gradient-end)] text-white hover:opacity-90"
                    onClick={() => confirmJobMatch(jobMatchModal.jobCode)}
                  >
                    시작하기
                  </Button>
                  <select
                    className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gradient-mid)]/50"
                    defaultValue=""
                    onChange={(e) => e.target.value && confirmJobMatch(e.target.value)}
                  >
                    <option value="" disabled>다른 직무로 변경...</option>
                    {Object.entries(jobCodeMap).map(([code, name]) => (
                      <option key={code} value={code}>{name}</option>
                    ))}
                  </select>
                  <Button variant="outline" className="w-full" onClick={() => setJobMatchModal(null)}>취소</Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {isHistoryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-lg mx-4 bg-card border border-border rounded-2xl shadow-2xl p-6">
            <button className="absolute top-4 right-4 text-muted-foreground hover:text-foreground" onClick={() => setIsHistoryOpen(false)}><X className="h-5 w-5" /></button>
            <h3 className="text-lg font-bold text-foreground mb-1">이전 분석 내용</h3>
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm text-muted-foreground">불러올 분석을 선택해주세요 (최대 3개)</p>
              <Button variant="ghost" size="sm" onClick={clearHistory} className="text-muted-foreground hover:text-destructive text-xs">전체 삭제</Button>
            </div>
            <div className="space-y-3">
              {getHistory().map((entry, idx) => (
                <button key={entry.key} onClick={() => restoreFromHistory(entry)}
                  className="w-full text-left p-4 rounded-xl border border-border hover:border-[var(--gradient-mid)]/50 hover:bg-[var(--gradient-mid)]/5 transition-all group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--gradient-mid)]/15 text-[var(--gradient-mid)]">{idx + 1}번째 최근</span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{formatTime(entry.timestamp)}</span>
                      </div>
                      <p className="text-sm font-medium text-foreground truncate">{entry.preview}</p>
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