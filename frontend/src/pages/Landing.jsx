import { useNavigate } from 'react-router-dom';
import './Landing.css'; // 전용 CSS를 만들어서 디자인해봅시다.

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="landing-container">
      {/* Hero 섹션: 서비스의 핵심 가치 전달 */}
      <header className="hero-section">
        <h1 className="hero-title">
          당신의 경험에 <span className="highlight">가치</span>를 더하세요
        </h1>
        <p className="hero-subtitle">
          AI 에이전트가 당신의 프로젝트 경험을 정밀 분석하여<br />
          최적의 자기소개서 초안을 제안합니다.
        </p>
        
        <div className="cta-buttons">
          <button 
            className="start-btn" 
            onClick={() => navigate('/analyze')}
          >
            지금 분석 시작하기
          </button>
        </div>
      </header>

      {/* 특징 소개 섹션 (나중에 추가/수정 가능) */}
      <section className="features">
        <div className="feature-card">
          <h3>🔍 정밀 분석</h3>
          <p>AI 인사 담당자의 관점으로 당신의 경험을 재해석합니다.</p>
        </div>
        <div className="feature-card">
          <h3>✍️ 맞춤형 초안</h3>
          <p>전문 AI 컨설턴트가 초안을 작성합니다.</p>
        </div>
        <div className="feature-card">
          <h3>💡 사용자 개입</h3>
          <p>AI의 결과물에 당신의 의도를 덧입혀 완성합니다.</p>
        </div>
      </section>

      {/* 하단 안내: 로그인 유도 예정 구역 */}
      <footer className="landing-footer">
        <p>더 많은 기능을 원하시나요? 로그인을 하면 분석 결과를 저장할 수 있습니다. (준비 중)</p>
      </footer>
    </div>
  );
};

export default Landing;