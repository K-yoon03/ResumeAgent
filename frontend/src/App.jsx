import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useState } from 'react';

import Landing from './pages/Landing';
import Analyzer from './pages/Analyzer';
import ResumeWriter from './pages/ResumeWriter';
import InterviewAgent from "./pages/InterviewAgent";

import './App.css';

function App() {

  const [experience, setExperience] = useState('');
  const [analysis, setAnalysis] = useState('');

  return (
    <BrowserRouter>
      <Routes>

        <Route path="/" element={<Landing />} />

        <Route
          path="/analyze"
          element={
            <Analyzer
              setGlobalExperience={setExperience}
              setGlobalAnalysis={setAnalysis}
            />
          }
        />
        <Route path="/resume-writer" element={<ResumeWriter />} />
        <Route path="/interview" element={<InterviewAgent />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;