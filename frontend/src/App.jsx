import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useState } from 'react';
import Landing from './pages/Landing';
import Analyzer from './pages/Analyzer';
import Writer from './pages/Writer';
import './App.css';

function App() {
  const [experience, setExperience] = useState(''); // 원본 경험 공유 데이터
  const [analysis, setAnalysis] = useState('');     // 분석 결과 공유 데이터

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route 
          path="/analyze" 
          element={<Analyzer setGlobalExperience={setExperience} setGlobalAnalysis={setAnalysis} />} 
        />
        <Route 
          path="/write" 
          element={<Writer experience={experience} analysis={analysis} />} 
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;