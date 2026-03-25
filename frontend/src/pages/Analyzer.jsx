import { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Sparkles, GraduationCap, Briefcase, Award, FileText, ArrowRight, X, AlertTriangle, Calendar, Save, RotateCcw, Clock, Target, Lock } from "lucide-react";
import { BASE_URL } from '../config';
import { useAuth } from '@/context/AuthContext';

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
  const { user, refreshCredits } = useAuth();  // 🔥 user 추가

  const [targetJob, setTargetJob] = useState("");
  const [selectedJobCode, setSelectedJobCode] = useState("CP001");  // 🔥 추가
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
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);  // 🔥 추가
  const [saved, setSaved] = useState(false);
  const [hasCache, setHasCache] = useState(
    () => {
      const h = sessionStorage.getItem(HISTORY_KEY);
      return h ? JSON.parse(h).length > 0 : false;
    }
  );

  // 🔥 scoreData를 읽기 쉬운 텍스트로 변환
  const generateAnalysisText = (scoreData) => {
    let text = `# 역량 평가 결과\n\n`;
    text += `## 총점: ${scoreData.totalScore}점\n\n`;
    text += `## 역량별 점수\n\n`;
    
    scoreData.competencyScores.forEach(comp => {
      text += `### ${comp.name}\n`;
      text += `- 점수: ${comp.score}점 (가중치: ${(comp.weight * 100).toFixed(0)}%)\n`;
      text += `- 기여도: ${comp.contribution.toFixed(1)}점\n`;
      text += `- 근거: ${comp.evidence}\n\n`;
    });
    
    if (scoreData.strengths && scoreData.strengths.length > 0) {
      text += `## 💪 강점\n\n`;
      scoreData.strengths.forEach(s => text += `- ${s}\n`);
      text += `\n`;
    }
    
    if (scoreData.improvements && scoreData.improvements.length > 0) {
      text += `## 📈 개선점\n\n`;
      scoreData.improvements.forEach(i => text += `- ${i}\n`);
    }
    
    return text;
  };

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
    setShowSignupPrompt(false);
    toast.success("초기화되었습니다.");
  };

  const clearHistory = () => {
    const history = getHistory();
    history.forEach(entry => sessionStorage.removeItem(entry.key));
    sessionStorage.removeItem(HISTORY_KEY);
    setIsHistoryOpen(false);
    setHasCache(false);
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

  // 🔥 핵심 수정: askAi 함수
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

    const token = localStorage.getItem("token");

    try {
      // 🔥 비로그인: AgentController (미리보기)
      if (!token) {
        const res = await fetch(`${BASE_URL}/api/v1/agent/analyze`, {
          method: "POST",
          headers: { "Content-Type": "text/plain" },
          body: question,
        });

        if (!res.ok) throw new Error("분석 실패");

        const reader = res.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let result = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          result += chunk;
          setAnswer(result);
        }

        // 🔥 일부만 보여주기 (첫 300자 + "...")
        const preview = result.slice(0, 300) + "\n\n...";
        setAnswer(preview);
        setShowSignupPrompt(true);
        toast.info("전체 결과를 보려면 가입이 필요합니다!");
        return;
      }

      // 🔥 로그인: AssessmentController (정식 평가)
      const res = await fetch(`${BASE_URL}/api/assessments/evaluate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          jobCode: selectedJobCode,
          experience: question,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "분석 실패");
      }

      const data = await res.json();
      
      // scoreData 파싱
      const parsedScoreData = JSON.parse(data.scoreData);
      const analysisText = generateAnalysisText(parsedScoreData);
      
      setAnswer(analysisText);
      setScoreData(parsedScoreData);
      scoreDataRef.current = parsedScoreData;
      setSaved(true);  // 🔥 자동 저장됨
      setSavedAssessmentId(data.id);
      
      // 캐시 저장
      sessionStorage.setItem(
        cacheKey,
        JSON.stringify({ 
          answer: analysisText, 
          scoreData: parsedScoreData 
        })
      );
      
      saveToHistory(cacheKey, analysisText, parsedScoreData, structForm, noneChecked, targetJob);
      setIsModalOpen(true);
      await refreshCredits();

      toast.success("역량 평가가 완료되었습니다!");

    } catch (err) {
      console.error("Analysis error:", err);
      toast.error(err.message || "분석 중 오류가 발생했습니다.");
      setAnswer("");
    } finally {
      setLoading(false);
    }
  };

  const goToWriter = () => {
    if (setGlobalExperience) setGlobalExperience(buildQuestion());
    if (setGlobalAnalysis) setGlobalAnalysis(answer);
    navigate("/resume-writer");
  };

  // 🔥 saveAssessment 함수 제거 (자동 저장되므로 불필요)

  const structFields = [
    { name: "age", label: "나이", icon: Calendar, placeholder: "예: 25", type: "input" },
    { name: "education", label: "학력", icon: GraduationCap, placeholder: "예: ○○대학교 컴퓨터공학과 졸업", type: "input" },
    { name: "career", label: "경력 및 경험", icon: Briefcase, placeholder: "관련 경험이나 프로젝트, 인턴십 등을 자유롭게 작성하세요", type: "textarea" },
    { name: "skills", label: "보유 스킬 및 자격증", icon: Award, placeholder: "예: Python, React, AWS 자격증", type: "textarea" },
    { name: "story", label: "자기소개", icon: FileText, placeholder: "본인을 소개하는 내용을 자유롭게 작성하세요", type: "textarea" },
  ];

  const inputClass = "w-full px-4 py-2.5 rounded-lg border border-input text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--gradient-mid)]/50 focus:border-[var(--gradient-mid)] transition-all";

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      {/* 헤더 */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center p-3 rounded-full bg-gradient-to-br from-[var(--gradient-start)] via-[var(--gradient-mid)] to-[var(--gradient-end)]">
          <Sparkles className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-[var(--gradient-start)] via-[var(--gradient-mid)] to-[var(--gradient-end)] bg-clip-text text-transparent">
          AI 역량 분석
        </h1>
        <p className="text-lg text-muted-foreground">
          당신의 경험을 AI가 분석하고 역량을 평가합니다
        </p>

        {/* 상단 버튼들 */}
        <div className="flex items-center justify-center gap-3">
          {hasCache && (
            <Button
              variant="outline"
              size="sm"
              onClick={openHistory}
              className="flex items-center gap-1.5"
            >
              <Clock className="h-4 w-4" />
              이전 분석 불러오기
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={resetInput}
            className="flex items-center gap-1.5"
          >
            <RotateCcw className="h-4 w-4" />
            초기화
          </Button>
        </div>
      </div>

      {/* 입력 폼 */}
      <Card className="border border-border/50 shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            ✏️ 경험 입력
          </CardTitle>
          <CardDescription>
            자유롭게 작성하세요. 없는 항목은 체크박스를 선택하면 됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          
          {/* 🔥 직무 선택 (로그인 시에만) */}
          {user && (
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2 text-foreground">
                <Target className="h-4 w-4 text-[var(--gradient-mid)]" />
                평가 직무 선택
              </label>
              <select
                value={selectedJobCode}
                onChange={(e) => setSelectedJobCode(e.target.value)}
                className={inputClass}
              >
                <option value="CP001">백엔드 개발</option>
                <option value="CP002">프론트엔드 개발</option>
                <option value="CP003">데이터/AI</option>
                <option value="CP004">보안/네트워크</option>
                <option value="CP005">클라우드/DevOps</option>
                <option value="CP006">모바일 앱 개발</option>
                <option value="CP007">게임 개발</option>
                <option value="CP008">임베디드 개발</option>
                <option value="CP009">QA/테스트</option>
                <option value="CP010">기획/PM</option>
                <option value="CP011">데이터 분석</option>
                <option value="CP012">마케팅</option>
                <option value="CP013">영업/세일즈</option>
                <option value="CP014">UI/UX 디자인</option>
                <option value="CP015">그래픽 디자인</option>
                <option value="CP016">제품 디자인</option>
              </select>
              <p className="text-xs text-muted-foreground pl-1">
                선택한 직무 기준으로 역량을 평가합니다
              </p>
            </div>
          )}

          {/* 목표 직무 */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2 text-foreground">
              <Target className="h-4 w-4 text-[var(--gradient-mid)]" />
              목표 직무/분야 <span className="text-xs text-muted-foreground font-normal">(선택)</span>
            </label>
            <input
              type="text"
              value={targetJob}
              onChange={(e) => setTargetJob(e.target.value)}
              placeholder="예: 백엔드 개발자, 프론트엔드 개발자"
              className={inputClass}
            />
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
        <Card className="border border-border/50 shadow-lg relative">
          {/* 🔥 회원가입 유도 overlay */}
          {showSignupPrompt && (
            <div className="absolute inset-0 backdrop-blur-sm bg-background/80 z-10 flex flex-col items-center justify-center rounded-lg p-8">
              <Lock className="h-12 w-12 text-[var(--gradient-mid)] mb-4" />
              <h3 className="text-xl font-bold mb-2">전체 결과를 확인하세요!</h3>
              <p className="text-sm text-muted-foreground mb-6 text-center">
                가입하고 역량별 상세 점수와<br />
                맞춤 자기소개서를 받아보세요
              </p>
              <Link to="/register">
                <Button size="lg" className="bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)]">
                  가입하고 계속하기
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <p className="text-xs text-muted-foreground mt-3">
                입력한 내용이 자동 저장돼요
              </p>
            </div>
          )}

          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                🔍 AI 역량 분석 결과
              </CardTitle>
              {saved && (
                <Badge className="bg-green-600 text-white">저장됨</Badge>
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
            {showWriterButton && !showSignupPrompt && (
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
      {isModalOpen && !showSignupPrompt && (
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