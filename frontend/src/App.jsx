import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { useAuth } from "./context/AuthContext";
import { useEffect } from "react";

import CreditCharge from './pages/CreditCharge';
import CreditSuccess from './pages/CreditSuccess';
import CreditFail from './pages/CreditFail';

import Nav from './components/Nav';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';

import Landing from './pages/Landing';
import { DashboardPage } from './pages/DashboardPage';
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
import PostingDetail from './pages/PostingDetail';
import CreditInsufficientModal from "./components/CreditInsufficientModal";
import SocialRegister from './pages/SocialRegister';
import TermsPage from './pages/TermsPage';

import './App.css';

function AnalyzeRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <MyAssessments /> : <Analyzer />;
}

function AppInner() {
  const navigate = useNavigate();

  useEffect(() => {
    const handler = () => {
      toast.error("세션이 만료되었습니다. 다시 로그인해주세요.");
      navigate("/login");
    };
    window.addEventListener("force-logout", handler);
    return () => window.removeEventListener("force-logout", handler);
  }, [navigate]);

  return (
    <>
      <CreditInsufficientModal />
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
        <Route path="/companies/:companyId/postings/:postingId" element={<ProtectedRoute><PostingDetail /></ProtectedRoute>} />
        <Route path="/my-interviews" element={<ProtectedRoute><MyInterviews /></ProtectedRoute>} />
        <Route path="/my-assessments" element={<ProtectedRoute><MyAssessments /></ProtectedRoute>} />
        <Route path="/assessments/:id" element={<ProtectedRoute><AssessmentDetail /></ProtectedRoute>} />
        <Route path="/companies" element={<ProtectedRoute><Companies /></ProtectedRoute>} />
        <Route path="/companies/new" element={<ProtectedRoute><CompanyNew /></ProtectedRoute>} />
        <Route path="/my-page" element={<ProtectedRoute><MyPage /></ProtectedRoute>} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/oauth2/callback" element={<OAuth2Callback />} />
        <Route path="/credits" element={<ProtectedRoute><CreditCharge /></ProtectedRoute>} />
        <Route path="/credits/success" element={<ProtectedRoute><CreditSuccess /></ProtectedRoute>} />
        <Route path="/credits/fail" element={<ProtectedRoute><CreditFail /></ProtectedRoute>} />
        <Route path="/register/social" element={<SocialRegister />} />
        <Route path="/terms" element={<TermsPage />} />
      </Routes>
      <Footer />
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppInner />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;