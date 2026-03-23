import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MessageSquare, FileText, ChevronRight, Send, RotateCcw, Loader2, Zap } from "lucide-react";
import { BASE_URL } from '../config';
import { useAuth } from '@/hooks/useAuth';

function AdvancedInterview() {
  const { isAdmin, loading: authLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const resume = location.state?.resume || "";
  const jobPosting = location.state?.jobPosting || "";

  const [sessionId, setSessionId] = useState("");
  const [totalQuestions, setTotalQuestions] = useState(5);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState("setup"); // setup, interviewing, done
  const [messages, setMessages] = useState([]);
  const [userAnswer, setUserAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [needsFollowUp, setNeedsFollowUp] = useState(false);
  const [canAddFollowUp, setCanAddFollowUp] = useState(false);
  const [isFollowUpMode, setIsFollowUpMode] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

    if (authLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 flex items-center justify-center">
        <p className="text-muted-foreground">로딩 중...</p>
      </div>
    );
  }
 
  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center space-y-4">
        <div className="inline-flex items-center justify-center p-4 rounded-full bg-red-100 dark:bg-red-900/20">
          <Zap className="h-8 w-8 text-red-500" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">접근 권한이 없습니다</h2>
        <p className="text-muted-foreground">Advanced 모의면접은 현재 베타 테스트 중입니다.</p>
        <Button
          onClick={() => navigate("/my-resumes")}
          className="bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white"
        >
          돌아가기
        </Button>
      </div>
    );
  }
 
  if (!resume) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center space-y-4">
        <h2 className="text-xl font-semibold text-foreground">데이터가 없습니다.</h2>
        <p className="text-muted-foreground">먼저 자기소개서를 생성해주세요.</p>
        <Button onClick={() => navigate("/analyze")} className="bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white">
          역량 분석하러 가기
        </Button>
      </div>
    );
  }

  if (!resume) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center space-y-4">
        <h2 className="text-xl font-semibold text-foreground">데이터가 없습니다.</h2>
        <p className="text-muted-foreground">먼저 자기소개서를 생성해주세요.</p>
        <Button onClick={() => navigate("/analyze")} className="bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white">
          역량 분석하러 가기
        </Button>
      </div>
    );
  }

  // SSE 스트리밍
  const streamSSE = async (url, body, onChunk, onDone) => {
    const response = await fetch(url, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`
      },
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

  // 세션 시작
  const startSession = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/interview/advanced/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ resume, jobPosting, totalQuestions })
      });
      
      const data = await res.json();
      setSessionId(data.sessionId);
      setMessages([{ role: "interviewer", content: data.firstQuestion }]);
      setPhase("interviewing");
    } catch (err) {
      toast.error("면접 시작 실패");
    } finally {
      setLoading(false);
    }
  };

  // 답변 제출
  const submitAnswer = async () => {
    if (!userAnswer.trim()) return;
    
    const newMessages = [...messages, { role: "user", content: userAnswer }];
    setMessages(newMessages);
    setUserAnswer("");
    setLoading(true);

    // 평가 스트리밍
    await streamSSE(
      isFollowUpMode 
        ? `${BASE_URL}/api/interview/advanced/follow-up/answer`
        : `${BASE_URL}/api/interview/advanced/answer`,
      { sessionId, answer: userAnswer },
      (chunk) => {},
      (full) => {
        setMessages(prev => [...prev, { role: "feedback", content: full }]);
        checkAnswerResult();
      }
    );
  };

  // 평가 결과 확인
  const checkAnswerResult = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/interview/advanced/answer/result?sessionId=${sessionId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      
      const data = await res.json();
      setNeedsFollowUp(data.needsFollowUp);
      setCanAddFollowUp(data.canAddFollowUp);
      setLoading(false);

      // 꼬리 질문 없으면 다음으로
      if (!data.needsFollowUp || !data.canAddFollowUp) {
        if (data.hasNextQuestion) {
          setTimeout(moveToNext, 1000);
        } else {
          setPhase("done");
        }
      }
    } catch (err) {
      setLoading(false);
      toast.error("결과 확인 실패");
    }
  };

  // 꼬리 질문 생성
  const generateFollowUp = async () => {
    setLoading(true);
    setIsFollowUpMode(true);
    
    await streamSSE(
      `${BASE_URL}/api/interview/advanced/follow-up/generate?sessionId=${sessionId}`,
      {},
      (chunk) => {},
      (full) => {
        setMessages(prev => [...prev, { role: "interviewer", content: full, isFollowUp: true }]);
        setLoading(false);
        setNeedsFollowUp(false);
      }
    );
  };

  // 꼬리 질문 스킵
  const skipFollowUp = async () => {
    setNeedsFollowUp(false);
    setIsFollowUpMode(false);
    
    // 진행 상태 확인
    const res = await fetch(`${BASE_URL}/api/interview/advanced/progress?sessionId=${sessionId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    });
    const data = await res.json();
    
    if (data.currentIndex < data.totalQuestions - 1) {
      moveToNext();
    } else {
      setPhase("done");
    }
  };

  // 다음 질문
  const moveToNext = async () => {
    setLoading(true);
    setIsFollowUpMode(false);
    
    try {
      const res = await fetch(`${BASE_URL}/api/interview/advanced/next?sessionId=${sessionId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      
      const data = await res.json();
      setCurrentIndex(data.currentIndex);
      
      if (data.isCompleted) {
        setPhase("done");
      } else if (data.currentQuestion) {
        setMessages(prev => [...prev, { role: "interviewer", content: data.currentQuestion.questionText }]);
      }
    } catch (err) {
      toast.error("다음 질문 로딩 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">

      {/* 헤더 */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center p-3 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-red-500">
          <Zap className="h-7 w-7 text-white" />
        </div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 bg-clip-text text-transparent">
          Advanced 모의면접
        </h1>
        <p className="text-muted-foreground">꼬리 질문으로 더 깊이있는 면접 연습</p>
      </div>

      {/* 면접 설정 */}
      {phase === "setup" && (
        <Card className="border border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-5 w-5 text-purple-500" />
              Advanced 면접 설정
            </CardTitle>
            <CardDescription>AI가 답변을 분석하고 자동으로 꼬리 질문을 생성합니다</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">
                질문 수 <span className="text-muted-foreground font-normal">(1 ~ 10개)</span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number" min="1" max="10" value={totalQuestions}
                  onChange={(e) => setTotalQuestions(Math.min(10, Math.max(1, Number(e.target.value))))}
                  className="w-24 px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm text-center focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                />
                <span className="text-sm text-muted-foreground">개</span>
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <p className="text-sm text-amber-900 dark:text-amber-100">
                💡 <strong>Advanced 모드 특징:</strong><br/>
                • 답변이 불충분하면 AI가 자동으로 꼬리 질문 생성<br/>
                • 세션당 최대 3개의 꼬리 질문 (토큰 최적화)<br/>
                • 더 깊이있고 실전적인 면접 경험
              </p>
            </div>

            <Button
              className="w-full bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 text-white hover:opacity-90"
              onClick={startSession}
              disabled={loading}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ChevronRight className="mr-2 h-4 w-4" />}
              면접 시작
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 면접 진행 */}
      {(phase === "interviewing" || phase === "done") && (
        <Card className="border border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-5 w-5 text-purple-500" />
              면접 진행
              <span className="text-sm font-normal text-muted-foreground ml-auto">
                {currentIndex + 1} / {totalQuestions}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex flex-col gap-1 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                  <span className="text-xs text-muted-foreground px-1 flex items-center gap-1">
                    {msg.role === "interviewer" 
                      ? msg.isFollowUp 
                        ? <><Zap className="h-3 w-3 text-purple-500" />🔍 꼬리 질문</>
                        : "🧑‍💼 면접관"
                      : msg.role === "user" ? "🙋 나" : "💡 피드백"}
                  </span>
                  <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm prose prose-sm dark:prose-invert ${
                    msg.role === "user"
                      ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-tr-sm"
                      : msg.role === "feedback"
                      ? "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-tl-sm"
                      : msg.isFollowUp
                      ? "bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-300 dark:border-purple-700 rounded-tl-sm"
                      : "bg-muted rounded-tl-sm"
                  }`}>
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex flex-col gap-1 items-start">
                  <span className="text-xs text-muted-foreground px-1">🧑‍💼 면접관</span>
                  <div className="bg-muted px-4 py-3 rounded-2xl rounded-tl-sm text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    입력 중...
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* 꼬리 질문 필요 시 */}
            {needsFollowUp && canAddFollowUp && !loading && (
              <div className="space-y-3 pt-2 border-t-2 border-purple-200 dark:border-purple-800">
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                  <p className="text-sm text-purple-900 dark:text-purple-100 font-medium mb-3">
                    🔍 답변이 불충분합니다. 꼬리 질문으로 더 파고들까요?
                  </p>
                  <div className="flex gap-3">
                    <Button
                      className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                      onClick={generateFollowUp}
                    >
                      <Zap className="mr-2 h-4 w-4" />
                      꼬리 질문 생성
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={skipFollowUp}
                    >
                      다음 질문으로
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* 답변 입력 */}
            {phase === "interviewing" && !loading && !needsFollowUp && (
              <div className="space-y-3 pt-2 border-t border-border">
                <textarea
                  className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all resize-none"
                  placeholder="답변을 입력하세요..."
                  rows={4}
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.ctrlKey) submitAnswer();
                  }}
                />
                <Button
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90"
                  onClick={submitAnswer}
                  disabled={!userAnswer.trim()}
                >
                  <Send className="mr-2 h-4 w-4" />
                  답변 제출 (Ctrl+Enter)
                </Button>
              </div>
            )}

            {/* 완료 */}
            {phase === "done" && !loading && (
              <div className="pt-4 text-center space-y-4 border-t border-border">
                <p className="text-sm font-medium text-foreground">🎉 면접이 종료되었습니다. 수고하셨습니다!</p>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => navigate("/my-interviews")}>
                    <FileText className="mr-2 h-4 w-4" />
                    면접 기록 보기
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => navigate(-1)}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    돌아가기
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

    </div>
  );
}

export default AdvancedInterview;