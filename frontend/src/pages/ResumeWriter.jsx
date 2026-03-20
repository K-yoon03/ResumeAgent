import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { FileText, TrendingUp, Target, Lightbulb, Edit, ArrowRight, CheckCircle, AlertTriangle, RotateCcw, X, Clock, MessageSquare } from "lucide-react";
import { BASE_URL } from '../config';

const MAX_HISTORY = 3;
const RESUME_HISTORY_KEY = "resume_history";
const RESUME_CACHE_KEY = (jobPosting, experience) => {
  const text = jobPosting + experience;
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return `resume_${hash}`;
};
function ResumeWriter() {
  const location = useLocation();
  const navigate = useNavigate();

  const experience = location.state?.experience || "";
  const analysis = location.state?.analysis || "";
  const scoreData = location.state?.scoreData || null;

  const [resume, setResume] = useState("");
  const [loading, setLoading] = useState(false);
  const [jobPosting, setJobPosting] = useState("");
  const [jobForm, setJobForm] = useState({
    companyName: "", position: "", mainTasks: "",
    requirements: "", preferred: "", techStack: "",
    workPlace: "", employmentType: "", vision: "",
  });
  const [jobConfirmed, setJobConfirmed] = useState(false);
  const [jobMode, setJobMode] = useState(null);
  const [editableSections, setEditableSections] = useState(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [hasCache, setHasCache] = useState(() => {
    const h = sessionStorage.getItem(RESUME_HISTORY_KEY);
    return h ? JSON.parse(h).length > 0 : false;
  });

    useEffect(() => {
    if (editableSections) {
      document.querySelectorAll(".section-textarea").forEach(el => {
        el.style.height = "auto";
        el.style.height = el.scrollHeight + "px";
      });
    }
  }, [editableSections]);

  useEffect(() => {
    if (isConfirmed) {
      document.querySelectorAll(".confirmed-textarea").forEach(el => {
        el.style.height = "auto";
        el.style.height = el.scrollHeight + "px";
      });
    }
  }, [isConfirmed]);

  const savedResume = location.state?.savedResume;
  if (savedResume) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-gradient-to-br from-[var(--gradient-start)] via-[var(--gradient-mid)] to-[var(--gradient-end)]">
            <FileText className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-[var(--gradient-start)] via-[var(--gradient-mid)] to-[var(--gradient-end)] bg-clip-text text-transparent">
            {savedResume.title || "자기소개서"}
          </h1>
        </div>

        <Card className="border border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-5 w-5 text-[var(--gradient-mid)]" />
                자기소개서
              </CardTitle>
              <span className="text-xs text-muted-foreground">
                {savedResume.createdAt
                  ? new Date(savedResume.createdAt).toLocaleDateString("ko-KR")
                  : ""}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{savedResume.content}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => navigate("/my-resumes")}
          >
            ← 목록으로
          </Button>
          <Button
            className="flex-1 bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white hover:opacity-90"
            onClick={() => navigate("/interview", {
              state: { resume: savedResume.content }
            })}
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            면접 시작
          </Button>
        </div>
      </div>
    );
  }

  if (!experience && !analysis && !location.state?.savedResume) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center space-y-4">
        <h2 className="text-xl font-semibold text-foreground">데이터가 없습니다.</h2>
        <p className="text-muted-foreground">먼저 역량 분석을 진행해주세요.</p>
        <Button onClick={() => navigate("/analyze")} className="bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white">
          역량 분석하러 가기
        </Button>
      </div>
    );
  }

  const scoreCategories = scoreData ? [
    { name: "직무 적합도", score: scoreData.jobFit },
    { name: "성장 가능성", score: scoreData.growth },
    { name: "협업/소통 능력", score: scoreData.communication },
    { name: "실행력/추진력", score: scoreData.execution },
    { name: "경험 다양성", score: scoreData.diversity },
  ] : [];



  // ── 캐시/히스토리 ──────────────────────────

  const getHistory = () => JSON.parse(sessionStorage.getItem(RESUME_HISTORY_KEY) || "[]");

  const saveToHistory = (cacheKey, fullText, form, mode, posting) => {
    const history = getHistory();
    const preview = form.companyName
      ? `${form.companyName}${form.position ? " · " + form.position : ""}`
      : mode === "quick" ? "임의 회사" : "채용공고 없음";

    const resultPreview = fullText
      .replace(/#+\s*/g, "").replace(/\*+/g, "").replace(/\n+/g, " ").trim()
      .slice(0, 60) + "...";

    const newEntry = {
      key: cacheKey,
      timestamp: Date.now(),
      preview,
      resultPreview,
      savedJobForm: form,
      savedJobMode: mode,
      savedJobPosting: posting,
    };

    const filtered = history.filter(h => h.key !== cacheKey);
    const removedKeys = filtered.slice(MAX_HISTORY - 1).map(h => h.key);
    removedKeys.forEach(k => sessionStorage.removeItem(k));

    const updated = [newEntry, ...filtered].slice(0, MAX_HISTORY);
    sessionStorage.setItem(RESUME_HISTORY_KEY, JSON.stringify(updated));
    setHasCache(true);
  };

  const openHistory = () => {
    const history = getHistory();
    if (history.length === 0) {
      toast.error("이전 자소서 내용이 없습니다.");
      return;
    }
    setIsHistoryOpen(true);
  };

  const restoreFromHistory = (entry) => {
    const cached = sessionStorage.getItem(entry.key);
    if (!cached) {
      toast.error("해당 자소서를 찾을 수 없습니다.");
      return;
    }
    try {
      const { resume: r, editableSections: es } = JSON.parse(cached);
      if (entry.savedJobForm) setJobForm(entry.savedJobForm);
      if (entry.savedJobMode) setJobMode(entry.savedJobMode);
      if (entry.savedJobPosting) { setJobPosting(entry.savedJobPosting); setJobConfirmed(true); }
      if (r) setResume(r);
      if (es) setEditableSections(es);
      setIsConfirmed(false);
      setIsHistoryOpen(false);
      toast.success("이전 자소서를 불러왔습니다.");
    } catch {
      toast.error("불러오는데 실패했습니다.");
    }
  };

  const resetJobPosting = () => {
    setJobForm({ companyName: "", position: "", mainTasks: "", requirements: "", preferred: "", techStack: "", workPlace: "", employmentType: "", vision: "" });
    setJobPosting("");
    setJobConfirmed(false);
    setJobMode(null);
    toast.success("채용공고가 초기화되었습니다.");
  };

  const resetResume = () => {
    setResume("");
    setEditableSections(null);
    setIsConfirmed(false);
    toast.success("자소서가 초기화되었습니다.");
  };

  const clearHistory = () => {
    const history = getHistory();
    history.forEach(entry => sessionStorage.removeItem(entry.key));
    sessionStorage.removeItem(RESUME_HISTORY_KEY);
    setHasCache(false);
    setIsHistoryOpen(false);
    toast.success("이전 자소서 내용이 모두 삭제되었습니다.");
  };

  const formatTime = (ts) => {
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  // ── 채용공고 ──────────────────────────

  const handleJobFormChange = (e) => {
    setJobForm({ ...jobForm, [e.target.name]: e.target.value });
    e.target.style.height = "auto";
    e.target.style.height = e.target.scrollHeight + "px";
  };

  const confirmJobForm = () => {
    // 채용공고 예외처리 - 최소 회사명 또는 직무는 입력해야 함
    if (!jobForm.companyName && !jobForm.position && !jobForm.mainTasks) {
      toast.error("최소 회사명, 직무, 주요 업무 중 하나는 입력해주세요.");
      return;
    }
    const formatted = `
회사명: ${jobForm.companyName || "없음"}
직무/포지션: ${jobForm.position || "없음"}
주요 업무: ${jobForm.mainTasks || "없음"}
자격 요건: ${jobForm.requirements || "없음"}
우대 사항: ${jobForm.preferred || "없음"}
기술 스택: ${jobForm.techStack || "없음"}
근무지: ${jobForm.workPlace || "없음"}
고용 형태: ${jobForm.employmentType || "없음"}
회사 비전/문화: ${jobForm.vision || "없음"}
    `.trim();
    setJobPosting(formatted);
    setJobConfirmed(true);
    toast.success("채용공고가 입력되었습니다.");
  };

  // ── 자소서 생성 ──────────────────────────

  const parseResumeToSections = (text) => {
    const sectionTitles = ["성장 과정", "지원 동기", "직무 역량", "입사 후 포부"];
    const result = {};
    sectionTitles.forEach((title, i) => {
      const currentPattern = new RegExp(`${i + 1}\\.\\s*\\*{0,2}${title}\\*{0,2}`);
      const nextPattern = i < sectionTitles.length - 1
        ? new RegExp(`${i + 2}\\.\\s*\\*{0,2}${sectionTitles[i + 1]}\\*{0,2}`)
        : null;
      const startMatch = text.search(currentPattern);
      const endMatch = nextPattern ? text.search(nextPattern) : text.length;
      if (startMatch !== -1) {
        let content = text.slice(startMatch, endMatch !== -1 ? endMatch : text.length);
        content = content.replace(currentPattern, "").trim();
        result[title] = content;
      } else {
        result[title] = "";
      }
    });
    return result;
  };

  const generateResume = async () => {
    setResume("");
    setEditableSections(null);
    setIsConfirmed(false);
    setLoading(true);

    const cacheKey = RESUME_CACHE_KEY(jobPosting, experience);
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        const { resume: r, editableSections: es } = JSON.parse(cached);
        setResume(r);
        setEditableSections(es);
        setLoading(false);
        toast.success("이전에 생성한 자소서를 불러왔습니다.");
        return;
      } catch {
        sessionStorage.removeItem(cacheKey);
      }
    }

    const response = await fetch(`${BASE_URL}/api/resume/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ experience, analysis, jobPosting })
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let fullText = "";
    let done = false;

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
          if (text === "") {
            fullText += "\n";
            setResume(prev => prev + "\n");
          } else {
            fullText += text;
            setResume(prev => prev + text);
          }
        }
      }
    }

    const sections = parseResumeToSections(fullText);
    setEditableSections(sections);

    sessionStorage.setItem(cacheKey, JSON.stringify({
      resume: fullText,
      editableSections: sections,
    }));
    saveToHistory(cacheKey, fullText, jobForm, jobMode, jobPosting);
    setLoading(false);
  };

  const handleConfirm = async () => {
    const confirmed = Object.entries(editableSections)
      .map(([title, content], i) => `${i + 1}. **${title}**\n\n${content.replace(/\[AI\]|\[\/AI\]/g, "")}`)
      .join("\n\n");
    setResume(confirmed);
    setIsConfirmed(true);

    // 로그인 상태일 때만 저장
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      // 1. JobPosting 저장 (form 모드일 때만)
      let jobPostingId = null;
      if (jobMode === "form" && jobConfirmed) {
        const jpRes = await fetch(`${BASE_URL}/api/job-postings`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(jobForm)
        });
        if (jpRes.ok) {
          const jpData = await jpRes.json();
          jobPostingId = jpData.id;
        }
      }

      // 2. Resume 저장
      const title = jobForm.companyName
        ? `${jobForm.companyName}${jobForm.position ? " · " + jobForm.position : ""}`
        : "자기소개서";

      await fetch(`${BASE_URL}/api/resume/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          content: confirmed,
          title,
          assessmentId: location.state?.assessmentId || null,
          jobPostingId
        })
      });

      toast.success("자소서가 저장되었습니다.");
    } catch {
      toast.error("저장에 실패했습니다.");
    }
  };

  const inputClass = "w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--gradient-mid)]/50 focus:border-[var(--gradient-mid)] transition-all";
  const textareaClass = `${inputClass} resize-none overflow-hidden`;

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 space-y-8">

      {/* 헤더 */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center p-3 rounded-full bg-gradient-to-br from-[var(--gradient-start)] via-[var(--gradient-mid)] to-[var(--gradient-end)]">
          <FileText className="h-7 w-7 text-white" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-[var(--gradient-start)] via-[var(--gradient-mid)] to-[var(--gradient-end)] bg-clip-text text-transparent">
          역량 분석 및 자기소개서
        </h1>
        <p className="text-muted-foreground">AI가 분석한 당신의 역량과 맞춤형 자기소개서를 확인하세요</p>
      </div>

      <Tabs defaultValue="analysis" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="analysis">역량 분석</TabsTrigger>
          <TabsTrigger value="resume">자기소개서</TabsTrigger>
        </TabsList>

        {/* 역량 분석 탭 */}
        <TabsContent value="analysis" className="space-y-6 mt-6">
          {scoreData && (
            <Card className="border border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-5 w-5 text-[var(--gradient-mid)]" />
                  종합 역량 점수
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-8">
                  <div className="relative w-28 h-28 shrink-0">
                    <svg className="transform -rotate-90 w-28 h-28">
                      <circle cx="56" cy="56" r="48" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-muted" />
                      <circle cx="56" cy="56" r="48" stroke="url(#scoreGradient)" strokeWidth="8" fill="transparent"
                        strokeDasharray={`${2 * Math.PI * 48}`}
                        strokeDashoffset={`${2 * Math.PI * 48 * (1 - scoreData.overall / 100)}`}
                        className="transition-all duration-1000" />
                      <defs>
                        <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="var(--gradient-start)" />
                          <stop offset="50%" stopColor="var(--gradient-mid)" />
                          <stop offset="100%" stopColor="var(--gradient-end)" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-bold">{scoreData.overall}</span>
                    </div>
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    종합 역량 점수 <strong className="text-foreground">{scoreData.overall}점</strong>으로,{" "}
                    {scoreData.overall >= 80 ? "매우 우수한" : scoreData.overall >= 60 ? "양호한" : "보완이 필요한"} 수준입니다.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {scoreCategories.length > 0 && (
            <Card className="border border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Target className="h-5 w-5 text-[var(--gradient-mid)]" />
                  세부 역량 분석
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {scoreCategories.map(({ name, score }) => (
                  <div key={name} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{name}</span>
                      <span className="text-muted-foreground">{score}점</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[var(--gradient-start)] via-[var(--gradient-mid)] to-[var(--gradient-end)] transition-all duration-700"
                        style={{ width: `${score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {scoreData && (
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base text-green-600 dark:text-green-400">
                    <Lightbulb className="h-5 w-5" />강점
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {scoreData.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Badge variant="secondary" className="mt-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">{i + 1}</Badge>
                        <span className="text-sm">{s}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              <Card className="border border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base text-orange-600 dark:text-orange-400">
                    <Target className="h-5 w-5" />개선 포인트
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {scoreData.improvements.map((imp, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Badge variant="secondary" className="mt-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">{i + 1}</Badge>
                        <span className="text-sm">{imp}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}

          {analysis && (
            <Card className="border border-border/50">
              <CardHeader><CardTitle className="text-base">🔍 상세 분석 리포트</CardTitle></CardHeader>
              <CardContent>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{analysis}</ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          )}

          {!scoreData && (
            <Card className="border border-border/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-sm">
                  <AlertTriangle className="h-4 w-4" />역량 점수를 불러오지 못했습니다.
                </div>
                {analysis && (
                  <div className="prose prose-sm dark:prose-invert max-w-none mt-4">
                    <ReactMarkdown>{analysis}</ReactMarkdown>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 자기소개서 탭 */}
        <TabsContent value="resume" className="space-y-6 mt-6">

          {/* 채용공고 입력 */}
          <Card className="border border-border/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">채용공고 입력</CardTitle>
                  <CardDescription>채용공고를 입력하면 더 정확한 자소서가 생성됩니다</CardDescription>
                </div>
                <div className="flex items-center gap-0">
                <Button variant="outline" size="sm" onClick={openHistory} className="shrink-0">
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                  불러오기
                </Button>
                {jobMode && (
                  <Button variant="outline" size="sm" onClick={resetJobPosting} className="shrink-0 text-muted-foreground">
                    <X className="mr-1.5 h-3.5 w-3.5" />
                    초기화
                  </Button>
                )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!jobMode && (
                <>
                  <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    바로 만들기 시 모의 면접 진행이 불가능합니다.
                  </p>
                  <div className="flex gap-3">
                    <Button className="flex-1 bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white hover:opacity-90"
                      onClick={() => setJobMode("form")}>
                      📋 회사 정보 입력하고 만들기
                    </Button>
                    <Button variant="outline" className="flex-1" onClick={() => setJobMode("quick")}>
                      ⚡ 바로 만들기
                    </Button>
                  </div>
                </>
              )}

              {jobMode === "quick" && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">⚠️ 임의의 회사로 자기소개서가 제작됩니다.</p>
                  <Button variant="outline" size="sm" onClick={() => setJobMode(null)}>← 돌아가기</Button>
                </div>
              )}

              {jobMode === "form" && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">회사명, 직무, 주요 업무 중 최소 하나는 입력해주세요.</p>
                  {[
                    { name: "companyName", label: "🏢 회사명", type: "input", placeholder: "회사명" },
                    { name: "position", label: "💼 직무 / 포지션", type: "input", placeholder: "직무명" },
                    { name: "mainTasks", label: "📋 주요 업무", type: "textarea", placeholder: "주요 업무 내용" },
                    { name: "requirements", label: "✅ 자격 요건", type: "textarea", placeholder: "자격 요건" },
                    { name: "preferred", label: "⭐ 우대 사항", type: "textarea", placeholder: "우대 사항" },
                    { name: "techStack", label: "🛠 기술 스택", type: "input", placeholder: "기술 스택" },
                    { name: "workPlace", label: "📍 근무지", type: "input", placeholder: "근무지" },
                    { name: "employmentType", label: "📄 고용 형태", type: "input", placeholder: "정규직, 인턴 등" },
                    { name: "vision", label: "💡 회사 비전/문화", type: "textarea", placeholder: "회사 비전 및 문화" },
                  ].map(({ name, label, type, placeholder }) => (
                    <div key={name} className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">{label}</label>
                      {type === "input" ? (
                        <input type="text" name={name} value={jobForm[name]}
                          onChange={handleJobFormChange} placeholder={placeholder} className={inputClass} />
                      ) : (
                        <textarea name={name} value={jobForm[name]}
                          onChange={handleJobFormChange} placeholder={placeholder}
                          rows={2} className={textareaClass} />
                      )}
                    </div>
                  ))}
                  <div className="flex gap-3">
                    <Button className="flex-1 bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white hover:opacity-90"
                      onClick={confirmJobForm}>
                      ✅ 채용공고 입력 완료
                    </Button>
                    <Button variant="outline" onClick={() => setJobMode(null)}>← 돌아가기</Button>
                  </div>
                  {jobConfirmed && (
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm">
                      <CheckCircle className="h-4 w-4" />채용공고 입력 완료
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

{/* 자소서 생성 버튼 + 초기화 */}
          {jobMode && (
            <div className="flex gap-2">
              <Button
                className="flex-1 bg-gradient-to-r from-[var(--gradient-start)] via-[var(--gradient-mid)] to-[var(--gradient-end)] text-white hover:opacity-90"
                onClick={generateResume} disabled={loading}
              >
                <Edit className="mr-2 h-4 w-4" />
                {loading ? "AI가 작성 중입니다..." : "✍️ 자소서 생성하기"}
              </Button>
              {editableSections && (
                <Button variant="outline" size="sm" onClick={resetResume} className="shrink-0 text-muted-foreground">
                  <X className="mr-1.5 h-3.5 w-3.5" />
                  초기화
                </Button>
              )}
            </div>
          )}

          {/* 자소서 작성 중 / 검토 카드 - 하나로 통합 */}
          {((loading) || editableSections) && (
            <Card className="border border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Edit className="h-5 w-5 text-[var(--gradient-mid)]" />
                  {loading ? "✍️ 작성 중..." : "자기소개서 검토 및 수정"}
                </CardTitle>
                {!loading && (
                  <CardDescription>⚠️ 표시된 문장은 AI가 추가한 내용입니다. 검토 후 수정해주세요.</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{resume}</ReactMarkdown>
                  </div>
                ) : (
                  <>
                    {!isConfirmed && (
                      <>
                        {Object.entries(editableSections).map(([title, content]) => (
                          <div key={title} className="space-y-2">
                            <label className="text-sm font-semibold text-[var(--gradient-mid)]">📝 {title}</label>
                            <div
                              className="text-sm text-muted-foreground p-3 rounded-lg bg-muted/50 border border-dashed border-border leading-relaxed"
                              dangerouslySetInnerHTML={{
                                __html: content.replace(
                                  /\[AI\](.*?)\[\/AI\]/gs,
                                  '<span style="background:rgba(245,158,11,0.15);border-bottom:2px solid #f59e0b;padding:2px 4px;border-radius:4px;">⚠️ $1</span>'
                                )
                              }}
                            />
                            <textarea
                              className="section-textarea w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gradient-mid)]/50 focus:border-[var(--gradient-mid)] transition-all resize-none overflow-hidden"
                              value={content.replace(/\[AI\]|\[\/AI\]/g, "")}
                              onChange={(e) => setEditableSections(prev => ({ ...prev, [title]: e.target.value }))}
                              onInput={(e) => {
                                e.target.style.height = "auto";
                                e.target.style.height = e.target.scrollHeight + "px";
                              }}
                            />
                          </div>
                        ))}
                        <Button
                          className="w-full bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white hover:opacity-90"
                          onClick={handleConfirm}
                        >
                          ✅ 자소서 확정하기
                        </Button>
                      </>
                    )}
                    {isConfirmed && (
                      <>
                        <textarea
                          className="confirmed-textarea w-full px-4 py-3 rounded-lg border border-[var(--gradient-mid)]/30 bg-background text-foreground text-sm focus:outline-none resize-none overflow-hidden leading-relaxed"
                          value={Object.entries(editableSections)
                            .map(([title, content], i) =>
                              `${i + 1}. ${title}\n\n${content.replace(/\[AI\]|\[\/AI\]/g, "")}`
                            ).join("\n\n")}
                          readOnly
                        />
                        <Button variant="outline" className="w-full" onClick={() => setIsConfirmed(false)}>
                          ✏️ 다시 수정하기
                        </Button>
                      </>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* 면접 시작 배너 - 자소서 탭 안에 배치 */}
          {isConfirmed && !loading && (
            <Card className="border-2 border-[var(--gradient-mid)]/20 bg-gradient-to-br from-[var(--gradient-start)]/10 via-[var(--gradient-mid)]/10 to-[var(--gradient-end)]/10">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex flex-col justify-center">
                    <h3 className="text-lg font-semibold mb-1">다음 단계: 모의면접</h3>
                    <p className="text-sm text-muted-foreground">
                      작성한 자기소개서를 바탕으로 실전 면접을 연습해보세요
                    </p>
                  </div>
                  {jobPosting ? (
                    <Button
                      size="lg"
                      className="bg-gradient-to-r from-[var(--gradient-start)] via-[var(--gradient-mid)] to-[var(--gradient-end)] text-white hover:opacity-90 shrink-0"
                      onClick={() => navigate("/interview", { state: { resume, jobPosting, analysis } })}
                    >
                      모의면접 시작
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  ) : (
                    <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      채용공고 입력 시 면접 가능합니다
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* 히스토리 모달 */}
      {isHistoryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-lg mx-4 bg-card border border-border rounded-2xl shadow-2xl p-6">
            <button
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setIsHistoryOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-lg font-bold text-foreground mb-1">이전 자소서</h3>
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm text-muted-foreground">불러올 자소서를 선택해주세요</p>
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
}

export default ResumeWriter;