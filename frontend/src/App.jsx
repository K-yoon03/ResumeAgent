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
import MyPage from './pages/MyPage';
import MyInterviews from './pages/MyInterviews';
import Footer from './components/Footer';
import OAuth2Callback from './pages/OAuth2Callback';
import ResumeViewer from './pages/ResumeViewer';
import AdvancedInterview from './pages/AdvancedInterview';
import { DashboardPage } from './pages/dashboard';  // 🔥 추가

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
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />  {/* 🔥 추가 */}
          <Route path="/analyze" element={<AnalyzeRoute />} />
          <Route path="/analyze/new" element={<Analyzer setGlobalExperience={() => {}} setGlobalAnalysis={() => {}} />} />
          <Route path="/resume-writer" element={<ProtectedRoute><ResumeWriter /></ProtectedRoute>} />
          <Route path="/interview" element={<ProtectedRoute><InterviewAgent /></ProtectedRoute>} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/job-postings" element={<JobPostings />} />
          <Route path="/my-assessments" element={<ProtectedRoute><MyAssessments /></ProtectedRoute>} />
          <Route path="/my-resumes" element={<ProtectedRoute><MyResumes /></ProtectedRoute>} />
          <Route path="/my-page" element={<ProtectedRoute><MyPage /></ProtectedRoute>} />
          <Route path="/my-interviews" element={<ProtectedRoute><MyInterviews /></ProtectedRoute>} />
          <Route path="/oauth2/callback" element={<OAuth2Callback />} />
          <Route path="/resume/:id" element={<ProtectedRoute><ResumeViewer /></ProtectedRoute>} />
          <Route path="/interview/advanced" element={<AdvancedInterview />} />
        </Routes>
        <Footer />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;