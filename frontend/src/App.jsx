import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Toaster } from "@/components/ui/sonner";
import { useAuth } from "./context/AuthContext";

import Nav from './components/Nav';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';

import Landing from './pages/Landing';
import { DashboardPage } from './pages/Dashboard';
import Analyzer from './pages/Analyzer';
import MyAssessments from './pages/MyAssessments';
import AssessmentDetail from './pages/AssessmentDetail';
import DepthInterview from './pages/DepthInterview';
import ResumeSelector from './pages/ResumeSelector';
import ResumeWriter from './pages/ResumeWriter';
import MyResumes from './pages/MyResumes';
import ResumeViewer from './pages/ResumeViewer';
import InterviewAgent from './pages/InterviewAgent';
import AdvancedInterview from './pages/AdvancedInterview';
import MyInterviews from './pages/MyInterviews';
import Companies from './pages/Companies';
import CompanyNew from './pages/CompanyNew';
import MyPage from './pages/MyPage';
import Login from './pages/Login';
import Register from './pages/Register';
import OAuth2Callback from './pages/OAuth2Callback';

import './App.css';

function AnalyzeRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <MyAssessments /> : <Analyzer />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Nav />
        <Toaster position="top-center" richColors />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/analyze" element={<AnalyzeRoute />} />
          <Route path="/analyze/new" element={<Analyzer />} />
          <Route path="/depth-interview" element={<ProtectedRoute><DepthInterview /></ProtectedRoute>} />
          <Route path="/resume-select" element={<ProtectedRoute><ResumeSelector /></ProtectedRoute>} />
          <Route path="/resume-writer" element={<ProtectedRoute><ResumeWriter /></ProtectedRoute>} />
          <Route path="/my-resumes" element={<ProtectedRoute><MyResumes /></ProtectedRoute>} />
          <Route path="/resume/:id" element={<ProtectedRoute><ResumeViewer /></ProtectedRoute>} />
          <Route path="/interview" element={<ProtectedRoute><InterviewAgent /></ProtectedRoute>} />
          <Route path="/interview/advanced" element={<AdvancedInterview />} />
          <Route path="/my-interviews" element={<ProtectedRoute><MyInterviews /></ProtectedRoute>} />
          <Route path="/my-assessments" element={<ProtectedRoute><MyAssessments /></ProtectedRoute>} />
          <Route path="/assessments/:id" element={<ProtectedRoute><AssessmentDetail /></ProtectedRoute>} />
          <Route path="/companies" element={<ProtectedRoute><Companies /></ProtectedRoute>} />
          <Route path="/companies/new" element={<ProtectedRoute><CompanyNew /></ProtectedRoute>} />
          <Route path="/my-page" element={<ProtectedRoute><MyPage /></ProtectedRoute>} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/oauth2/callback" element={<OAuth2Callback />} />
        </Routes>
        <Footer />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;