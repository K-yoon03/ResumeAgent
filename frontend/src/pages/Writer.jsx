const Writer = ({ experience, analysis }) => {
  const [userRequest, setUserRequest] = useState(''); // 추가 요청
  const [resume, setResume] = useState('');           // 최종 결과

  const handleWrite = async () => {
    // 분석 결과(analysis), 원본(experience), 추가요청(userRequest)을 
    // 백엔드 /api/v1/agent/write로 쏘는 로직
  };

  return (
    <div className="writer-container">
      <h2>자소서 초안 제작</h2>
      <div className="info-box">분석 결과를 바탕으로 작성합니다.</div>
      
      <textarea 
        placeholder="예: '협업 과정을 더 강조해줘', '성격의 장점을 섞어줘'"
        value={userRequest}
        onChange={(e) => setUserRequest(e.target.value)}
      />
      
      <button onClick={handleWrite}>자기소개서 생성 시작</button>
      
      <div className="result-container">{resume}</div>
    </div>
  );
};

export default Writer;