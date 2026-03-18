import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Toaster } from "@/components/ui/sonner";
import { useAuth } from "./context/AuthContext";

import Nav from './components/Nav';
import Landing from './pages/Landing';
import Analyzer from './pages/Analyzer';
import ResumeWriter from './pages/ResumeWriter';
import InterviewAgent from './pages/InterviewAgent';
import Login from './pages/login';
import Register from './pages/register';
import JobPostings from './pages/JobPostings';
import MyAssessments from './pages/MyAssessments';
import MyResumes from './pages/MyResumes';


import './App.css';



function App() {
function AnalyzeRoute() {
  const { user, loading } = useAuth();
    if (loading) return null;
    return user
      ? <MyAssessments />
      : <Analyzer setGlobalExperience={() => {}} setGlobalAnalysis={() => {}} />;
  }

  return (
    <AuthProvider>
      <BrowserRouter>
        <Nav />  {/* Routes 밖에 위치 */}
        <Toaster
          position="top-center"
          toastOptions={{
            style: { },
            classNames: { },
          }}
          richColors
        />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/analyze" element={<AnalyzeRoute />} />
          <Route path="/analyze/new" element={<Analyzer />} />
          <Route path="/analyze/new" element={<Analyzer setGlobalExperience={() => {}} setGlobalAnalysis={() => {}} />} />
          <Route path="/resume-writer" element={<ResumeWriter />} />
          <Route path="/interview" element={<InterviewAgent />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/job-postings" element={<JobPostings />} />
          <Route path="/my-assessments" element={<MyAssessments />} />
          <Route path="/my-resumes" element={<MyResumes />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;