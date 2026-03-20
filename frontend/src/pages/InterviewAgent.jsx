import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MessageSquare, FileText, Settings, ChevronRight, Send, RotateCcw } from "lucide-react";
import { BASE_URL } from '../config';

function InterviewAgent() {
  const location = useLocation();
  const navigate = useNavigate();
  const resume = location.state?.resume || "";
  const jobPosting = location.state?.jobPosting || "";

  const [totalQuestions, setTotalQuestions] = useState(5);
  const [interviewMode, setInterviewMode] = useState("chat");
  const [phase, setPhase] = useState("evaluating");
  const [evaluation, setEvaluation] = useState("");
  const [messages, setMessages] = useState([]);
  const [userAnswer, setUserAnswer] = useState("");
  const [questionCount, setQuestionCount] = useState(0);
  const [questionList, setQuestionList] = useState([]);
  const [answers, setAnswers] = useState({});
  const [finalFeedback, setFinalFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, evaluation]);

  const hasStarted = useRef(false);

  useEffect(() => {
    if (resume && !hasStarted.current) {
      hasStarted.current = true;
      startEvaluation();
    }
  }, []);

  if (!resume) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center space-y-4">
        <h2 className="text-xl font-semibold text-foreground">데이터가 없습니다.</h2>
        <p className="text-muted-foreground">먼저 자기소개서를 생성해주세요.</p>
        <Button
          onClick={() => navigate("/analyze")}
          className="bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white"
        >
          역량 분석하러 가기
        </Button>
      </div>
    );
  }

  // SSE 스트리밍 - 파싱 수정
  const streamSSE = async (url, body, onChunk, onDone) => {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let result = "";
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
          result += text;
          onChunk(text);
        } else if (line === "" || line === "\r") {
          result += "\n";
          onChunk("\n");
        }
      }
    }
    onDone(result);
  };

  const startEvaluation = async () => {
    setPhase("evaluating");
    setLoading(true);
    setEvaluation("");
    await streamSSE(
      `${BASE_URL}/api/interview/evaluate`,
      { resume, jobPosting },
      (chunk) => setEvaluation(prev => prev + chunk),
      () => { setPhase("evaluated"); setLoading(false); }
    );
  };

  const fetchNextQuestion = async (history, nextCount) => {
    setLoading(true);
    await streamSSE(
      `${BASE_URL}/api/interview/question`,
      { resume, jobPosting, history, questionNumber: nextCount, totalQuestions },
      (chunk) => {},
      (full) => {
        setMessages(prev => [...prev, { role: "interviewer", content: full }]);
        setLoading(false);
      }
    );
  };

  const submitAnswer = async () => {
    if (!userAnswer.trim()) return;
    const question = messages[messages.length - 1]?.content || "";
    const newMessages = [...messages, { role: "user", content: userAnswer }];
    setMessages(newMessages);
    setUserAnswer("");
    setLoading(true);

    await streamSSE(
      `${BASE_URL}/api/interview/feedback`,
      { resume, jobPosting, question, answer: userAnswer },
      (chunk) => {},
      (full) => {
        const nextCount = questionCount + 1;
        setQuestionCount(nextCount);
        if (nextCount >= totalQuestions) {
          setMessages(prev => [...prev, { role: "feedback", content: full }]);
          setPhase("done");
          setLoading(false);
        } else {
          setMessages(prev => [...prev, { role: "feedback", content: full }]);
          const history = newMessages
            .map(m => `${m.role === "user" ? "지원자" : "면접관"}: ${m.content}`)
            .join("\n");
          fetchNextQuestion(history, nextCount + 1);
        }
      }
    );
  };

  const fetchAllQuestions = async () => {
    setLoading(true);
    await streamSSE(
      `${BASE_URL}/api/interview/questions-all`,
      { resume, jobPosting, totalQuestions },
      (chunk) => {},
      (full) => {
        const parsed = full
          .split("\n")
          .filter(line => /^\d+\./.test(line.trim()))
          .map(line => line.replace(/^\d+\.\s*/, "").trim());
        setQuestionList(parsed);
        setAnswers(Object.fromEntries(parsed.map((_, i) => [i, ""])));
        setLoading(false);
      }
    );
  };

  const submitAllAnswers = async () => {
    const questionsAndAnswers = questionList
      .map((q, i) => `Q${i + 1}. ${q}\nA${i + 1}. ${answers[i] || "(답변 없음)"}`)
      .join("\n\n");
    setLoading(true);
    setFinalFeedback("");
    await streamSSE(
      `${BASE_URL}/api/interview/feedback-all`,
      { resume, jobPosting, questionsAndAnswers },
      (chunk) => setFinalFeedback(prev => prev + chunk),
      () => { setPhase("done"); setLoading(false); }
    );
  };

  const startInterview = () => {
    setPhase("interviewing");
    if (interviewMode === "list") fetchAllQuestions();
    else fetchNextQuestion("", 1);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">

      {/* 헤더 */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center p-3 rounded-full bg-gradient-to-br from-[var(--gradient-start)] via-[var(--gradient-mid)] to-[var(--gradient-end)]">
          <MessageSquare className="h-7 w-7 text-white" />
        </div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-[var(--gradient-start)] via-[var(--gradient-mid)] to-[var(--gradient-end)] bg-clip-text text-transparent">
          AI 모의면접
        </h1>
        <p className="text-muted-foreground">자기소개서 기반 실전 면접을 연습해보세요</p>
      </div>

      {/* 자소서 평가 */}
      {(phase === "evaluating" || phase === "evaluated" || phase === "setup") && (
        <Card className="border border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-5 w-5 text-[var(--gradient-mid)]" />
              자기소개서 평가
            </CardTitle>
            {loading && <CardDescription>AI가 자기소개서를 분석하고 있습니다...</CardDescription>}
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none min-h-[100px]">
              {evaluation ? (
                <ReactMarkdown>{evaluation}</ReactMarkdown>
              ) : (
                <div className="flex items-center justify-center h-24 text-muted-foreground text-sm border-2 border-dashed border-border rounded-lg">
                  분석 중입니다...
                </div>
              )}
            </div>
            {phase === "evaluated" && (
              <Button
                className="w-full mt-6 bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white hover:opacity-90"
                onClick={() => setPhase("setup")}
              >
                <Settings className="mr-2 h-4 w-4" />
                면접 설정하기
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* 면접 설정 */}
      {phase === "setup" && (
        <Card className="border border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Settings className="h-5 w-5 text-[var(--gradient-mid)]" />
              면접 설정
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">면접 방식</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setInterviewMode("chat")}
                  className={`p-4 rounded-xl border-2 text-sm font-medium transition-all ${
                    interviewMode === "chat"
                      ? "border-[var(--gradient-mid)] bg-[var(--gradient-mid)]/10 text-[var(--gradient-mid)]"
                      : "border-border text-muted-foreground hover:border-[var(--gradient-mid)]/50"
                  }`}
                >
                  💬 1:1 대화형
                  <p className="text-xs font-normal mt-1 opacity-70">질문에 바로 답변</p>
                </button>
                <button
                  onClick={() => setInterviewMode("list")}
                  className={`p-4 rounded-xl border-2 text-sm font-medium transition-all ${
                    interviewMode === "list"
                      ? "border-[var(--gradient-mid)] bg-[var(--gradient-mid)]/10 text-[var(--gradient-mid)]"
                      : "border-border text-muted-foreground hover:border-[var(--gradient-mid)]/50"
                  }`}
                >
                  📋 질문 목록형
                  <p className="text-xs font-normal mt-1 opacity-70">전체 질문 한번에</p>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">
                질문 수 <span className="text-muted-foreground font-normal">(1 ~ 10개)</span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number" min="1" max="10" value={totalQuestions}
                  onChange={(e) => setTotalQuestions(Math.min(10, Math.max(1, Number(e.target.value))))}
                  className="w-24 px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm text-center focus:outline-none focus:ring-2 focus:ring-[var(--gradient-mid)]/50 focus:border-[var(--gradient-mid)] transition-all"
                />
                <span className="text-sm text-muted-foreground">개</span>
              </div>
            </div>

            <Button
              className="w-full bg-gradient-to-r from-[var(--gradient-start)] via-[var(--gradient-mid)] to-[var(--gradient-end)] text-white hover:opacity-90"
              onClick={startInterview}
            >
              <ChevronRight className="mr-2 h-4 w-4" />
              면접 시작
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 대화형 면접 */}
      {(phase === "interviewing" || phase === "done") && interviewMode === "chat" && (
        <Card className="border border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-5 w-5 text-[var(--gradient-mid)]" />
              면접 진행
              <span className="text-sm font-normal text-muted-foreground ml-auto">
                {Math.min(questionCount + 1, totalQuestions)} / {totalQuestions}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex flex-col gap-1 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                  <span className="text-xs text-muted-foreground px-1">
                    {msg.role === "interviewer" ? "🧑‍💼 면접관" : msg.role === "user" ? "🙋 나" : "💡 피드백"}
                  </span>
                  <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm prose prose-sm dark:prose-invert ${
                    msg.role === "user"
                      ? "bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white rounded-tr-sm"
                      : msg.role === "feedback"
                      ? "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-tl-sm"
                      : "bg-muted rounded-tl-sm"
                  }`}>
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex flex-col gap-1 items-start">
                  <span className="text-xs text-muted-foreground px-1">🧑‍💼 면접관</span>
                  <div className="bg-muted px-4 py-3 rounded-2xl rounded-tl-sm text-sm text-muted-foreground">
                    입력 중...
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {phase === "interviewing" && !loading && (
              <div className="space-y-3 pt-2 border-t border-border">
                <textarea
                  className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--gradient-mid)]/50 focus:border-[var(--gradient-mid)] transition-all resize-none"
                  placeholder="답변을 입력하세요..."
                  rows={4}
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.ctrlKey) submitAnswer();
                  }}
                />
                <Button
                  className="w-full bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white hover:opacity-90"
                  onClick={submitAnswer}
                  disabled={!userAnswer.trim()}
                >
                  <Send className="mr-2 h-4 w-4" />
                  답변 제출 (Ctrl+Enter)
                </Button>
              </div>
            )}

            {phase === "done" && !loading && (
              <div className="pt-4 text-center space-y-4 border-t border-border">
                <p className="text-sm font-medium text-foreground">🎉 면접이 종료되었습니다. 수고하셨습니다!</p>
                <Button variant="outline" onClick={() => navigate(-1)}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  돌아가기
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 목록형 면접 */}
      {(phase === "interviewing" || phase === "done") && interviewMode === "list" && (
        <Card className="border border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-5 w-5 text-[var(--gradient-mid)]" />
              면접 질문 목록
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {loading && questionList.length === 0 && (
              <div className="flex items-center justify-center h-24 text-muted-foreground text-sm border-2 border-dashed border-border rounded-lg">
                질문을 생성 중입니다...
              </div>
            )}

            {questionList.length > 0 && phase === "interviewing" && (
              <div className="space-y-6">
                {questionList.map((q, i) => (
                  <div key={i} className="space-y-2">
                    <p className="text-sm font-semibold text-[var(--gradient-mid)]">Q{i + 1}. {q}</p>
                    <textarea
                      className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--gradient-mid)]/50 focus:border-[var(--gradient-mid)] transition-all resize-none"
                      placeholder="답변을 입력하세요..."
                      rows={4}
                      value={answers[i] || ""}
                      onChange={(e) => setAnswers(prev => ({ ...prev, [i]: e.target.value }))}
                    />
                  </div>
                ))}
                <Button
                  className="w-full bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white hover:opacity-90"
                  onClick={submitAllAnswers}
                  disabled={loading}
                >
                  <Send className="mr-2 h-4 w-4" />
                  전체 답변 제출
                </Button>
              </div>
            )}

            {loading && questionList.length > 0 && (
              <div className="flex items-center justify-center h-16 text-muted-foreground text-sm">
                피드백을 생성 중입니다...
              </div>
            )}

            {finalFeedback && (
              <div className="space-y-3 pt-4 border-t border-border">
                <p className="text-sm font-semibold text-foreground">💡 종합 피드백</p>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{finalFeedback}</ReactMarkdown>
                </div>
              </div>
            )}

            {phase === "done" && !loading && (
              <div className="pt-4 text-center space-y-4 border-t border-border">
                <p className="text-sm font-medium text-foreground">🎉 면접이 종료되었습니다. 수고하셨습니다!</p>
                <Button variant="outline" onClick={() => navigate(-1)}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  돌아가기
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

    </div>
  );
}

export default InterviewAgent;