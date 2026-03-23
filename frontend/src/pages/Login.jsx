import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Lock, AlertCircle } from "lucide-react";
import { BASE_URL } from '../config';
import CareerPilotHelmIcon from '../components/CareerPilotHelmIcon';

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "로그인 실패");
      }
      const data = await res.json();
      login(data);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = (provider) => {
    window.location.href = `${BASE_URL}/oauth2/authorization/${provider}`;
  };

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">

        {/* 로고 */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-gradient-to-br from-[var(--gradient-start)] via-[var(--gradient-mid)] to-[var(--gradient-end)]">
            <CareerPilotHelmIcon className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[var(--gradient-start)] via-[var(--gradient-mid)] to-[var(--gradient-end)] bg-clip-text text-transparent">
              CareerPilot
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              AI 기반 취업 준비 플랫폼
            </p>
          </div>
        </div>

        {/* 카드 */}
        <Card className="border border-border/50 shadow-lg">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">로그인</CardTitle>
            <CardDescription>계정에 로그인하여 시작하세요</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* 에러 메시지 */}
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {/* 이메일 */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2 text-foreground">
                <Mail className="h-4 w-4 text-[var(--gradient-mid)]" />
                이메일
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="example@email.com"
                className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--gradient-mid)]/50 focus:border-[var(--gradient-mid)] transition-all"
              />
            </div>

            {/* 비밀번호 */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2 text-foreground">
                <Lock className="h-4 w-4 text-[var(--gradient-mid)]" />
                비밀번호
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="비밀번호를 입력하세요"
                className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--gradient-mid)]/50 focus:border-[var(--gradient-mid)] transition-all"
              />
            </div>

            {/* 로그인 버튼 */}
            <Button
              className="w-full bg-gradient-to-r from-[var(--gradient-start)] via-[var(--gradient-mid)] to-[var(--gradient-end)] text-white hover:opacity-90 transition-opacity mt-2"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? "로그인 중..." : "로그인"}
            </Button>

            {/* ========== 여기부터 추가! ========== */}
            {/* 구분선 */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  또는
                </span>
              </div>
            </div>

            {/* 소셜 로그인 버튼 */}
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleSocialLogin('google')}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google로 계속하기
              </Button>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleSocialLogin('kakao')}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path 
                    className="fill-[#3C1E1E] dark:fill-[#FEE500]"
                    d="M12 3c5.799 0 10.5 3.664 10.5 8.185 0 4.52-4.701 8.184-10.5 8.184a13.5 13.5 0 0 1-1.727-.11l-4.408 2.883c-.501.265-.678.236-.472-.413l.892-3.678c-2.88-1.46-4.785-3.99-4.785-6.866C1.5 6.665 6.201 3 12 3z"/>
                </svg>
                Kakao로 계속하기
              </Button>
            </div>
            {/* ========== 여기까지 추가! ========== */}

            {/* 회원가입 링크 */}
            <p className="text-center text-sm text-muted-foreground">
              계정이 없으신가요?{" "}
              <Link
                to="/register"
                className="font-medium bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] bg-clip-text text-transparent hover:opacity-80 transition-opacity"
              >
                회원가입
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default Login;