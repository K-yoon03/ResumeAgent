import { useState } from 'react'
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './App.css'

function App() {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')

  const askAi = async () => {
    setAnswer("");

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

        // 줄 단위로 분리해서 SSE 파싱
        const lines = buffer.split("\n");
        
        // 마지막 줄은 아직 완성되지 않았을 수 있으니 buffer에 남겨둠
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data:")) {
            const text = line.slice(5);
            if (text.trim() === "[DONE]") {
              done = true;
              break;
            }
            setAnswer((prev) => prev + text);
          } else if (line === "" || line === "\r") {
              setAnswer((prev) => {
                // 이미 개행으로 끝나면 추가 안 함 (중복 방지)
                if (prev.endsWith("\n\n")) return prev;
                return prev + "\n";
              });
          }
        }
      }
    } catch (error) {
      console.error("스트리밍 에러:", error);
      setAnswer("에러가 발생했습니다: " + error.message);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto', fontFamily: 'Pretendard, sans-serif' }}>
      <h1>자소서 에이전트 도우미</h1>

      <div className="notion-style-container">
        <h2 style={{ fontSize: '1.5rem', marginBottom: '20px', display: 'flex', alignItems: 'center' }}>
          🔍 AI 역량 분석 리포트
        </h2>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="분석할 프로젝트 경험을 상세히 입력해 주세요. (예: 기술 스택, 담당 역할, 문제 해결 사례 등)"
          style={{
            width: '100%',
            height: '200px',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid #ccc',
            fontSize: '16px',
            lineHeight: '1.5',
            resize: 'vertical'
          }}
        />
      </div>

      <button
        onClick={askAi}
        style={{
          width: '100%',
          padding: '12px',
          backgroundColor: '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '16px',
          fontWeight: 'bold'
        }}
      >
        분석 시작하기
      </button>

      <div style={{ 
          marginTop: '30px', 
          textAlign: 'left', 
          backgroundColor: '#ffffff', 
          color: '#000000',          
          padding: '25px',
          borderRadius: '12px',
          border: '1px solid #ddd',
          fontSize: '16px',
          whiteSpace: 'normal'
        }}>
        <div>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{answer}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

export default App