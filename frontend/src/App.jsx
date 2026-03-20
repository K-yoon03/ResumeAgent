import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Toaster } from "@/components/ui/sonner";
import { useAuth } from "./context/AuthContext";

import Nav from './components/Nav';
import Landing from './pages/Landing';
import Analyzer from './pages/Analyzer';
import ResumeWriter from './pages/ResumeWriter';
import InterviewAgent from './pages/InterviewAgent';
import Login from './pages/Login';
import Register from './pages/Register';
import JobPostings from './pages/JobPostings';
import MyAssessments from './pages/MyAssessments';
import MyResumes from './pages/MyResumes';
import ProtectedRoute from './components/ProtectedRoute';

import './App.css';

function AnalyzeRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user
    ? <MyAssessments />
    : <Analyzer setGlobalExperience={() => {}} setGlobalAnalysis={() => {}} />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Nav />
        <Toaster position="top-center" richColors />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/analyze" element={<AnalyzeRoute />} />
          <Route path="/analyze/new" element={<Analyzer setGlobalExperience={() => {}} setGlobalAnalysis={() => {}} />} />
          <Route path="/resume-writer" element={<ProtectedRoute><ResumeWriter /></ProtectedRoute>} />
          <Route path="/interview" element={<ProtectedRoute><InterviewAgent /></ProtectedRoute>} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/job-postings" element={<JobPostings />} />
          <Route path="/my-assessments" element={<ProtectedRoute><MyAssessments /></ProtectedRoute>} />
          <Route path="/my-resumes" element={<ProtectedRoute><MyResumes /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;