import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { useLocation } from "react-router-dom";
import "./interviewAgent.css";

function InterviewAgent() {

  const location = useLocation();
  const resume = location.state?.resume || "";
  const jobPosting = location.state?.jobPosting || "";

  const [totalQuestions, setTotalQuestions] = useState(5);
  const [interviewMode, setInterviewMode] = useState("chat");
  const [phase, setPhase] = useState("evaluating");
  // evaluating → evaluated → setup → interviewing → done

  const [evaluation, setEvaluation] = useState("");

  // 대화형 상태
  const [messages, setMessages] = useState([]);
  const [userAnswer, setUserAnswer] = useState("");
  const [questionCount, setQuestionCount] = useState(0);

  // 목록형 상태
  const [questionList, setQuestionList] = useState([]);
  const [answers, setAnswers] = useState({});
  const [finalFeedback, setFinalFeedback] = useState("");

  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, evaluation]);

  useEffect(() => {
    if (resume) startEvaluation();
  }, []);

  if (!resume) {
    return (
      <div className="interview-container">
        <h2>데이터가 없습니다.</h2>
        <p>먼저 자기소개서를 생성해주세요.</p>
      </div>
    );
  }

  // SSE 스트리밍 공통 함수
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
          if (text === "") {
            result += "\n";
            onChunk("\n");
          } else {
            result += text;
            onChunk(text);
          }
        }
      }
    }
    onDone(result);
  };

  // 1. 자소서 평가
  const startEvaluation = async () => {
    setPhase("evaluating");
    setLoading(true);
    setEvaluation("");

    await streamSSE(
      "http://localhost:8080/api/interview/evaluate",
      { resume, jobPosting },
      (chunk) => setEvaluation(prev => prev + chunk),
      () => { setPhase("evaluated"); setLoading(false); }
    );
  };

  // ── 대화형 ──────────────────────────────────────

  const fetchNextQuestion = async (history, nextCount) => {
    setLoading(true);
    await streamSSE(
      "http://localhost:8080/api/interview/question",
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
      "http://localhost:8080/api/interview/feedback",
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

  // ── 목록형 ──────────────────────────────────────

  const fetchAllQuestions = async () => {
    setLoading(true);

    await streamSSE(
      "http://localhost:8080/api/interview/questions-all",
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
      "http://localhost:8080/api/interview/feedback-all",
      { resume, jobPosting, questionsAndAnswers },
      (chunk) => setFinalFeedback(prev => prev + chunk),
      () => { setPhase("done"); setLoading(false); }
    );
  };

  // 면접 시작
  const startInterview = () => {
    setPhase("interviewing");
    if (interviewMode === "list") {
      fetchAllQuestions();
    } else {
      fetchNextQuestion("", 1);
    }
  };

  return (
    <div className="interview-container">
      <h1 className="page-title">🎤 AI 면접 시뮬레이터</h1>

      {/* 자소서 평가 */}
      {(phase === "evaluating" || phase === "evaluated" || phase === "setup") && (
        <div className="step-section">
          <div className="step-title">📝 자기소개서 평가</div>
          <div className="result-section">
            <div className="markdown-container">
              <ReactMarkdown>{evaluation}</ReactMarkdown>
            </div>
          </div>
          {phase === "evaluated" && (
            <div className="button-container">
              <button className="primary-btn" onClick={() => setPhase("setup")}>
                ⚙️ 면접 설정하기
              </button>
            </div>
          )}
        </div>
      )}

      {/* 면접 설정 */}
      {phase === "setup" && (
        <div className="step-section">
          <div className="setup-card">
            <h2>면접 설정</h2>
            <div className="form-row">
              <label>🎯 면접 방식</label>
              <div className="mode-select">
                <button
                  className={interviewMode === "chat" ? "primary-btn" : "secondary-btn"}
                  onClick={() => setInterviewMode("chat")}
                >
                  💬 1:1 대화형
                </button>
                <button
                  className={interviewMode === "list" ? "primary-btn" : "secondary-btn"}
                  onClick={() => setInterviewMode("list")}
                >
                  📋 질문 목록형
                </button>
              </div>
            </div>
            <div className="form-row" style={{ marginTop: "24px" }}>
              <label>📋 면접 질문 수 (1 ~ 10)</label>
              <input
                type="number"
                min="1"
                max="10"
                value={totalQuestions}
                onChange={(e) => {
                  const val = Math.min(10, Math.max(1, Number(e.target.value)));
                  setTotalQuestions(val);
                }}
              />
            </div>
            <div className="button-container">
              <button className="primary-btn" onClick={startInterview}>
                🚀 면접 시작
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 대화형 면접 ── */}
      {(phase === "interviewing" || phase === "done") && interviewMode === "chat" && (
        <div className="step-section">
          <div className="step-title">
            🎤 면접 진행 ({Math.min(questionCount + 1, totalQuestions)} / {totalQuestions})
          </div>

          <div className="chat-container">
            {messages.map((msg, idx) => (
              <div key={idx} className={`chat-bubble ${msg.role}`}>
                <div className="bubble-label">
                  {msg.role === "interviewer" ? "🧑‍💼 면접관"
                    : msg.role === "user" ? "🙋 나"
                    : "💡 피드백"}
                </div>
                <div className="bubble-content">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
            ))}
            {loading && (
              <div className="chat-bubble interviewer">
                <div className="bubble-label">🧑‍💼 면접관</div>
                <div className="bubble-content typing">입력 중...</div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {phase === "interviewing" && !loading && (
            <div className="answer-section">
              <textarea
                className="answer-input"
                placeholder="답변을 입력하세요..."
                value={userAnswer}
                onChange={(e) => {
                  setUserAnswer(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = e.target.scrollHeight + "px";
                }}
              />
              <div className="button-container">
                <button className="primary-btn" onClick={submitAnswer}>
                  📨 답변 제출
                </button>
              </div>
            </div>
          )}

          {phase === "done" && !loading && (
            <div className="done-section">
              <p>🎉 면접이 종료되었습니다. 수고하셨습니다!</p>
            </div>
          )}
        </div>
      )}

      {/* ── 목록형 면접 ── */}
      {(phase === "interviewing" || phase === "done") && interviewMode === "list" && (
        <div className="step-section">
          <div className="step-title">📋 면접 질문 목록</div>

          {loading && questionList.length === 0 && (
            <div className="loading-section">질문을 생성 중입니다...</div>
          )}

          {questionList.length > 0 && phase === "interviewing" && (
            <div className="question-list">
              {questionList.map((q, i) => (
                <div key={i} className="question-item">
                  <div className="question-label">Q{i + 1}. {q}</div>
                  <textarea
                    className="answer-input"
                    placeholder="답변을 입력하세요..."
                    value={answers[i] || ""}
                    onChange={(e) => {
                      setAnswers(prev => ({ ...prev, [i]: e.target.value }));
                      e.target.style.height = "auto";
                      e.target.style.height = e.target.scrollHeight + "px";
                    }}
                  />
                </div>
              ))}
              <div className="button-container">
                <button className="primary-btn" onClick={submitAllAnswers}>
                  📨 전체 답변 제출
                </button>
              </div>
            </div>
          )}

          {loading && questionList.length > 0 && (
            <div className="loading-section">피드백을 생성 중입니다...</div>
          )}

          {finalFeedback && (
            <div className="step-section">
              <div className="step-title">💡 종합 피드백</div>
              <div className="result-section">
                <div className="markdown-container">
                  <ReactMarkdown>{finalFeedback}</ReactMarkdown>
                </div>
              </div>
            </div>
          )}

          {phase === "done" && !loading && (
            <div className="done-section">
              <p>🎉 면접이 종료되었습니다. 수고하셨습니다!</p>
            </div>
          )}
        </div>
      )}

    </div>
  );
}

export default InterviewAgent;