import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, AlertCircle, CheckCircle } from "lucide-react";
import { BASE_URL } from '../config';
import CareerPilotHelmIcon from '../components/CareerPilotHelmIcon';

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const [tokenValid, setTokenValid] = useState(null); // null=확인중, true=유효, false=무효
  const [tokenError, setTokenError] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // 토큰 유효성 확인
  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      setTokenError("유효하지 않은 링크입니다.");
      return;
    }
    fetch(`${BASE_URL}/api/auth/password-reset/validate?token=${token}`)
      .then(res => res.json())
      .then(data => {
        if (data.valid) {
          setTokenValid(true);
        } else {
          setTokenValid(false);
          setTokenError(data.message || "유효하지 않은 링크입니다.");
        }
      })
      .catch(() => {
        setTokenValid(false);
        setTokenError("링크 확인 중 오류가 발생했습니다.");
      });
  }, [token]);

  const handleSubmit = async () => {
    setError("");

    if (!newPassword || !confirmPassword) {
      setError("비밀번호를 입력해주세요.");
      return;
    }
    if (newPassword.length < 8) {
      setError("비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/auth/password-reset/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "변경 실패");
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">

        {/* 로고 */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-gradient-to-br from-[var(--gradient-start)] via-[var(--gradient-mid)] to-[var(--gradient-end)]">
            <CareerPilotHelmIcon className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[var(--gradient-start)] via-[var(--gradient-mid)] to-[var(--gradient-end)] bg-clip-text text-transparent">
            CareerPilot
          </h1>
        </div>

        <Card className="border border-border/50 shadow-lg">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">비밀번호 재설정</CardTitle>
            <CardDescription>새로운 비밀번호를 설정해주세요</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* 토큰 확인 중 */}
            {tokenValid === null && (
              <p className="text-sm text-muted-foreground text-center py-4">링크 확인 중...</p>
            )}

            {/* 토큰 무효 */}
            {tokenValid === false && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {tokenError}
                </div>
                <Button variant="outline" className="w-full" onClick={() => navigate("/login")}>
                  로그인으로 돌아가기
                </Button>
              </div>
            )}

            {/* 완료 */}
            {tokenValid === true && success && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-sm">
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  비밀번호가 성공적으로 변경되었습니다.
                </div>
                <Button
                  className="w-full bg-gradient-to-r from-[var(--gradient-start)] via-[var(--gradient-mid)] to-[var(--gradient-end)] text-white hover:opacity-90"
                  onClick={() => navigate("/login")}
                >
                  로그인하러 가기
                </Button>
              </div>
            )}

            {/* 재설정 폼 */}
            {tokenValid === true && !success && (
              <>
                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2 text-foreground">
                    <Lock className="h-4 w-4 text-[var(--gradient-mid)]" />
                    새 비밀번호
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="8자 이상 입력해주세요"
                    className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--gradient-mid)]/50 focus:border-[var(--gradient-mid)] transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2 text-foreground">
                    <Lock className="h-4 w-4 text-[var(--gradient-mid)]" />
                    새 비밀번호 확인
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    placeholder="비밀번호를 다시 입력해주세요"
                    className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--gradient-mid)]/50 focus:border-[var(--gradient-mid)] transition-all"
                  />
                </div>

                <p className="text-xs text-muted-foreground">
                  이전 비밀번호와 동일한 비밀번호는 사용할 수 없습니다.
                </p>

                <Button
                  className="w-full bg-gradient-to-r from-[var(--gradient-start)] via-[var(--gradient-mid)] to-[var(--gradient-end)] text-white hover:opacity-90 transition-opacity"
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {loading ? "변경 중..." : "비밀번호 변경"}
                </Button>
              </>
            )}

          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default ResetPassword;