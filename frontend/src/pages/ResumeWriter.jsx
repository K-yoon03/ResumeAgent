import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import "./resumeWriter.css";
import { useLocation, useNavigate } from "react-router-dom";

function ResumeWriter() {

  const location = useLocation();
  const experience = location.state?.experience || "";
  const cleanedDataFromAnalyzer = location.state?.cleanedData || "";
  const analysis = location.state?.analysis || "";

  const [cleanedData, setCleanedData] = useState(cleanedDataFromAnalyzer);
  const [analysisData, setAnalysisData] = useState(analysis);
  const [resume, setResume] = useState("");
  const [loading, setLoading] = useState(false);
  const [jobPosting, setJobPosting] = useState("");
  const [jobForm, setJobForm] = useState({
    companyName: "",
    position: "",
    mainTasks: "",
    requirements: "",
    preferred: "",
    techStack: "",
    workPlace: "",
    employmentType: "",
    vision: "",
  });
  const [jobConfirmed, setJobConfirmed] = useState(false);
  const [jobMode, setJobMode] = useState(null);
  const [editableSections, setEditableSections] = useState(null);
  const [isConfirmed, setIsConfirmed] = useState(false);

  const navigate = useNavigate();

  if (!experience && !analysis) {
    return (
      <div className="analyzer-container">
        <h2>데이터가 없습니다.</h2>
        <p>먼저 역량 분석을 진행해주세요.</p>
      </div>
    );
  }

  const runInputCleaner = async () => {
    setLoading(true);
    setCleanedData("");
    const response = await fetch("http://localhost:8080/api/v1/agent/clean", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ experience: experience })
    });
    const data = await response.text();
    setCleanedData(data);
    setLoading(false);
  };

  useEffect(() => {
    if (experience) runInputCleaner();
  }, []);

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

  const handleJobFormChange = (e) => {
    setJobForm({ ...jobForm, [e.target.name]: e.target.value });
    e.target.style.height = "auto";
    e.target.style.height = e.target.scrollHeight + "px";
  };

  const confirmJobForm = () => {
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
  };

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

    const response = await fetch("http://localhost:8080/api/resume/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        experience: cleanedData,
        analysis: analysisData,
        jobPosting: jobPosting
      })
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

    setEditableSections(parseResumeToSections(fullText));
    setLoading(false);
  };

  const handleConfirm = () => {
    const confirmed = Object.entries(editableSections)
      .map(([title, content], i) => `${i + 1}. **${title}**\n\n${content.replace(/\[AI\]|\[\/AI\]/g, "")}`)
      .join("\n\n");
    setResume(confirmed);
    setIsConfirmed(true);
  };

  return (
    <div className="analyzer-container">

      <h1 className="page-title">AI 자기소개서 생성기</h1>

      {/* STEP 01 - 정제된 사용자 데이터 */}
      {cleanedData && (
        <div className="step-section">
          <div className="step-title">STEP 01. 정제된 사용자 데이터</div>
          <div className="result-section">
            <div className="markdown-container">
              <ReactMarkdown>{cleanedData}</ReactMarkdown>
            </div>
          </div>
        </div>
      )}

      {/* STEP 02 - 채용공고 입력 */}
      {cleanedData && (
        <div className="step-section">
          <div className="step-title">STEP 02. 채용공고 입력</div>

          {!jobMode && (
            <>
              <p className="hint-text" style={{ marginTop: "12px" }}>
                ⚠️ 바로 만들기 시 자기소개서 기반의 모의 면접 진행이 불가능합니다.
              </p>
              <div className="mode-select">
                <button className="primary-btn" onClick={() => setJobMode("form")}>
                  📋 회사 정보 입력하고 만들기
                </button>
                <button className="secondary-btn" onClick={() => setJobMode("quick")}>
                  ⚡ 바로 만들기
                </button>
              </div>
            </>
          )}

          {jobMode === "quick" && (
            <div className="quick-notice" style={{ marginTop: "16px" }}>
              <p>⚠️ 임의의 회사로 자기소개서가 제작됩니다.</p>
              <button className="secondary-btn" onClick={() => setJobMode(null)}>
                ← 돌아가기
              </button>
            </div>
          )}

          {jobMode === "form" && (
            <>
              <p className="hint-text">정보가 없는 항목은 공백으로 두셔도 됩니다.</p>
              <div className="job-form">
                <div className="form-row">
                  <label>🏢 회사명</label>
                  <input type="text" name="companyName" value={jobForm.companyName}
                    onChange={handleJobFormChange} placeholder="정보가 없을 시 공백으로 남겨주세요" />
                </div>
                <div className="form-row">
                  <label>💼 직무 / 포지션</label>
                  <input type="text" name="position" value={jobForm.position}
                    onChange={handleJobFormChange} placeholder="정보가 없을 시 공백으로 남겨주세요" />
                </div>
                <div className="form-row">
                  <label>📋 주요 업무</label>
                  <textarea name="mainTasks" value={jobForm.mainTasks}
                    onChange={handleJobFormChange} placeholder="정보가 없을 시 공백으로 남겨주세요" />
                </div>
                <div className="form-row">
                  <label>✅ 자격 요건</label>
                  <textarea name="requirements" value={jobForm.requirements}
                    onChange={handleJobFormChange} placeholder="정보가 없을 시 공백으로 남겨주세요" />
                </div>
                <div className="form-row">
                  <label>⭐ 우대 사항</label>
                  <textarea name="preferred" value={jobForm.preferred}
                    onChange={handleJobFormChange} placeholder="정보가 없을 시 공백으로 남겨주세요" />
                </div>
                <div className="form-row">
                  <label>🛠 기술 스택</label>
                  <input type="text" name="techStack" value={jobForm.techStack}
                    onChange={handleJobFormChange} placeholder="정보가 없을 시 공백으로 남겨주세요" />
                </div>
                <div className="form-row">
                  <label>📍 근무지</label>
                  <input type="text" name="workPlace" value={jobForm.workPlace}
                    onChange={handleJobFormChange} placeholder="정보가 없을 시 공백으로 남겨주세요" />
                </div>
                <div className="form-row">
                  <label>📄 고용 형태</label>
                  <input type="text" name="employmentType" value={jobForm.employmentType}
                    onChange={handleJobFormChange} placeholder="예) 정규직, 인턴, 계약직" />
                </div>
                <div className="form-row">
                  <label>💡 회사 비전 / 문화</label>
                  <textarea name="vision" value={jobForm.vision}
                    onChange={handleJobFormChange} placeholder="정보가 없을 시 공백으로 남겨주세요" />
                </div>
                <div className="button-container">
                  <button className="primary-btn" onClick={confirmJobForm}>
                    ✅ 채용공고 입력 완료
                  </button>
                  <button className="secondary-btn" onClick={() => setJobMode(null)}>
                    ← 돌아가기
                  </button>
                </div>
              </div>
              {jobConfirmed && <p className="success-msg">✅ 채용공고 입력 완료</p>}
            </>
          )}
        </div>
      )}

      {/* STEP 03 - 자소서 생성 */}
      {cleanedData && jobMode && (
        <div className="step-section">
          <div className="step-title">STEP 03. 자기소개서 생성</div>
          <div className="button-container">
            <button className="primary-btn" onClick={generateResume}>
              ✍️ 자소서 생성하기
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="loading-section">
          AI가 작성 중입니다...
        </div>
      )}

      {/* STEP 04 - 자소서 검토 및 수정 */}
      {editableSections && !loading && (
        <div className="step-section">
          <div className="step-title">STEP 04. 자기소개서 검토 및 수정</div>
          <p className="hint-text">
            ⚠️ 표시된 문장은 AI가 경험 데이터를 기반으로 추가한 내용입니다. 검토 후 수정해주세요.
          </p>

          {/* 수정 가능 폼 */}
          {!isConfirmed && (
            <div className="resume-edit-form">
              {Object.entries(editableSections).map(([title, content]) => (
                <div key={title} className="resume-section-edit">
                  <label className="section-label">📝 {title}</label>
                  <div
                    className="section-preview"
                    dangerouslySetInnerHTML={{
                      __html: content.replace(
                        /\[AI\](.*?)\[\/AI\]/gs,
                        '<span class="ai-generated">⚠️ $1</span>'
                      )
                    }}
                  />
                  <textarea
                    className="section-textarea"
                    value={content.replace(/\[AI\]|\[\/AI\]/g, "")}
                    onChange={(e) => setEditableSections(prev => ({
                      ...prev,
                      [title]: e.target.value
                    }))}
                    onInput={(e) => {
                      e.target.style.height = "auto";
                      e.target.style.height = e.target.scrollHeight + "px";
                    }}
                  />
                </div>
              ))}
              <div className="button-container">
                <button className="primary-btn" onClick={handleConfirm}>
                  ✅ 자소서 확정하기
                </button>
              </div>
            </div>
          )}

          {/* 확정 후 읽기전용 폼 */}
          {isConfirmed && (
            <>
              <div className="resume-section-edit">
                <textarea
                  className="section-textarea confirmed-textarea"
                  value={Object.entries(editableSections)
                    .map(([title, content], i) =>
                      `${i + 1}. ${title}\n\n${content.replace(/\[AI\]|\[\/AI\]/g, "")}`
                    )
                    .join("\n\n")}
                  readOnly
                />
              </div>
              <div className="button-container" style={{ marginTop: "24px" }}>
                <button className="secondary-btn" onClick={() => setIsConfirmed(false)}>
                  ✏️ 다시 수정하기
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* 면접 시작 버튼 */}
      {isConfirmed && !loading && (
        <div className="button-container" style={{ marginTop: "24px" }}>
          {jobPosting ? (
            <button
              className="primary-btn"
              onClick={() => navigate("/interview", {
                state: { resume, jobPosting, analysis: analysisData }
              })}
            >
              🎤 확정 후 모의면접 시작하기
            </button>
          ) : (
            <p className="hint-text" style={{ textAlign: "center" }}>
              ⚠️ 채용공고를 입력한 경우에만 면접 시뮬레이션이 가능합니다.
            </p>
          )}
        </div>
      )}

    </div>
  );
}

export default ResumeWriter;