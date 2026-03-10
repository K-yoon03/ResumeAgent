import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './Analyzer.css'; // 디자인 파일 연결

const Analyzer = ({ setGlobalExperience, setGlobalAnalysis }) => {
  const navigate = useNavigate();
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showWriterButton, setShowWriterButton] = useState(false);

const askAi = async () => {
  if (question.length < 10) {
    alert("내용이 너무 짧습니다. 조금 더 자세히 적어주세요!");
    return;
  }

  setLoading(true);
  setAnswer("");
  let fullText = ""; // AI의 전체 응답을 검사하기 위한 변수

  try {
    const response = await fetch("http://localhost:8080/api/v1/agent/analyze", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: question,
    });

    if (!response.ok) throw new Error("네트워크 응답에 문제가 있습니다.");

    const reader = response.body.getReader();
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
        // 1. [고윤님 로직] 데이터가 있는 경우
        if (line.startsWith("data:")) {
          const text = line.slice(5);
          if (text.trim() === "[DONE]") {
            done = true;
            break;
          }
          fullText += text; // 검사용 변수에 누적
          setAnswer((prev) => prev + text);
        } 
        // 2. [고윤님 로직] 빈 줄인 경우 (줄바꿈 유지)
        else if (line === "" || line === "\r") {
          fullText += "\n"; // 검사용 변수에 누적
          setAnswer((prev) => {
            if (prev.endsWith("\n\n")) return prev;
            return prev + "\n";
          });
        }
      }
    }

    // 3. [추가 로직] 루프가 완전히 끝난(done) 후에 딱 한 번 검사!
    if (fullText.includes("[REJECT]")) {
      // 거절 메시지 스타일링
      setAnswer(fullText.replace("[REJECT]", "⚠️ **내용을 보강해 주세요:**\n\n"));
    } else {
      // 정상 분석 완료 시에만 모달 팝업
      setIsModalOpen(true);
    }

  } catch (error) {
    console.error("스트리밍 에러:", error);
    setAnswer("에러가 발생했습니다: " + error.message);
  } finally {
    setLoading(false);
  }
};

  // [추가] 작정 페이지로 이동하는 함수
  const goToWriter = () => {
    setGlobalExperience(question);
    setGlobalAnalysis(answer);

    navigate("/resume-writer", {
      state: {
        experience: question,
        cleanedData: question, // 현재는 InputCleaner가 따로 없으므로 임시
        analysis: answer
      }
    });
  };

return (
    <div className="analyzer-page">
      <div className="analyzer-container">
        {/* 기존 입력/결과 UI 생략 (동일) */}
        <header className="step-header">
          <span className="step-badge">STEP 01</span>
          <h2>역량 분석 리포트</h2>
          <p>경험을 입력하시면 AI가 핵심 역량을 추출합니다.</p>
        </header>

        <div className="input-card">
          <textarea
            className="notion-style-textarea"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="분석할 프로젝트 경험을 상세히 입력해 주세요."
          />
          <button className="analyze-start-btn" onClick={askAi}>
            분석 시작하기
          </button>
        </div>

        <div className="result-section">
          <h3 className="result-title">🔍 AI 역량 분석 결과</h3>
          <div className="markdown-container">
            {answer ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{answer}</ReactMarkdown>
            ) : (
              <div className="placeholder-text">
                {loading ? "AI가 데이터를 분석하며 리포트를 작성하고 있습니다..." : "분석 시작 버튼을 누르면 이곳에 리포트가 생성됩니다."}
              </div>
            )}
          </div>
          {showWriterButton && (
          <div className="writer-button-container">
            <button className="go-writer-btn" onClick={goToWriter}>
              ✍️ 자소서 쓰러가기
            </button>
          </div>
        )}
        </div>
      </div>

      {/* [커스텀 모달 UI 추가] */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button className="modal-close-x" onClick={() => setIsModalOpen(false)}>×</button>
            <div className="modal-body">
              <p>분석이 완료되었어요!<br />분석 결과를 같이 확인하며 자기소개서 또한 작성해볼까요?</p>
              <button className="modal-confirm-btn" onClick={goToWriter}>자소서 작성하기</button>
                <button
                    className="modal-confirm-btn secondary"
                    onClick={() => {
                      setIsModalOpen(false);
                      setShowWriterButton(true);
                    }}
                  >
                  분석부터 읽어볼래요
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analyzer;