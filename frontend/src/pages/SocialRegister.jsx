import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, ExternalLink } from "lucide-react";
import CareerPilotHelmIcon from '../components/CareerPilotHelmIcon';
import { useAuth } from "../context/AuthContext";
import { BASE_URL } from '../config';

function SocialRegister() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!agreed) {
      setError("이용약관 및 개인정보처리방침에 동의해주세요.");
      return;
    }
    setLoading(true);
    // 약관 동의 완료 → 대시보드 이동
    // 필요 시 약관 동의 시각 백엔드 기록 API 추가 가능
    navigate("/dashboard");
  };

  const handleCancel = async () => {
    // 동의 거부 시 계정 삭제 후 로그인 페이지로
    try {
      const token = localStorage.getItem("token");
      await fetch(`${BASE_URL}/api/auth/me`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // 삭제 실패해도 진행
    }
    logout();
    navigate("/login");
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
            <p className="text-sm text-muted-foreground mt-1">AI 기반 취업 준비 플랫폼</p>
          </div>
        </div>

        <Card className="border border-border/50 shadow-lg">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">서비스 이용 동의</CardTitle>
            <CardDescription>
              CareerPilot을 시작하기 전에 아래 약관을 확인해주세요.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* 베타 안내 */}
            <div className="px-4 py-3 rounded-xl bg-[#6366f1]/5 border border-[#6366f1]/20 text-xs text-muted-foreground">
              ⚠️ 본 서비스는 현재 베타 운영 중입니다. 일부 기능이 변경되거나 불안정할 수 있습니다.
            </div>

            {/* 약관 내용 미리보기 */}
            <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3 text-xs text-muted-foreground max-h-48 overflow-y-auto leading-relaxed">
              <p className="font-semibold text-foreground text-sm">이용약관 주요 내용</p>
              <p>• 서비스는 AI 기반 역량 분석, JD 분석, 자기소개서 작성, 모의면접 등 취업 준비를 지원합니다.</p>
              <p>• AI 분석 결과는 참고용이며 합격을 보장하지 않습니다.</p>
              <p>• 크레딧 충전 후 사용된 크레딧은 원칙적으로 환불되지 않습니다.</p>
              <p>• 이용자가 입력한 데이터의 권리는 이용자에게 있습니다.</p>
              <p className="font-semibold text-foreground text-sm pt-1">개인정보처리방침 주요 내용</p>
              <p>• 수집 항목: 이메일, 닉네임 (소셜 로그인 제공 정보)</p>
              <p>• AI 처리를 위해 OpenAI에, 결제 처리를 위해 포트원에 일부 처리를 위탁합니다.</p>
              <p>• 회원 탈퇴 시 개인정보는 즉시 삭제되며, 생성 데이터는 비식별화 후 보관될 수 있습니다.</p>
            </div>

            {/* 전문 보기 링크 */}
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-[#6366f1] hover:opacity-80 transition-opacity"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              이용약관 및 개인정보처리방침 전문 보기
            </a>

            {/* 동의 체크박스 */}
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative mt-0.5">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => {
                    setAgreed(e.target.checked);
                    if (e.target.checked) setError("");
                  }}
                  className="sr-only"
                />
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                  agreed
                    ? "bg-[#6366f1] border-[#6366f1]"
                    : "border-muted-foreground group-hover:border-[#6366f1]"
                }`}>
                  {agreed && (
                    <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-sm text-foreground leading-relaxed">
                이용약관 및 개인정보처리방침을 확인하였으며, 이에 동의합니다. <span className="text-[#6366f1] font-medium">(필수)</span>
              </span>
            </label>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {/* 버튼 */}
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleCancel}
                disabled={loading}
              >
                동의 안함
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-[var(--gradient-start)] via-[var(--gradient-mid)] to-[var(--gradient-end)] text-white hover:opacity-90"
                onClick={handleConfirm}
                disabled={loading}
              >
                {loading ? "처리 중..." : "동의하고 시작하기"}
              </Button>
            </div>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default SocialRegister;