import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Coins } from "lucide-react";
import { BASE_URL } from "../config";
import { toast } from "sonner";

function CreditSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshCredits } = useAuth();
  const [status, setStatus] = useState("loading"); // loading | success | error
  const [creditInfo, setCreditInfo] = useState(null);

  useEffect(() => {
    const confirm = async () => {
      const paymentId = searchParams.get("paymentId");

      if (!paymentId) {
        setStatus("error");
        return;
      }

      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${BASE_URL}/api/payments/confirm`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ paymentId }),
        });
        if (!res.ok) throw new Error("승인 실패");
        const data = await res.json();
        setCreditInfo(data);
        await refreshCredits();
        setStatus("success");
      } catch {
        setStatus("error");
        toast.error("결제 승인에 실패했습니다.");
      }
    };
    confirm();
  }, []);

  if (status === "loading") return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center">
      <div className="text-center">
        <Coins className="h-8 w-8 animate-spin mx-auto mb-4 text-[#8b5cf6]" />
        <p className="text-muted-foreground">결제 승인 중...</p>
      </div>
    </div>
  );

  if (status === "error") return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4">
      <div className="text-center space-y-4">
        <p className="text-lg font-semibold text-destructive">결제 처리 중 오류가 발생했습니다.</p>
        <p className="text-sm text-muted-foreground">고객센터로 문의해주세요.</p>
        <Button onClick={() => navigate("/credits")}>다시 시도</Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-sm w-full">
        <div className="inline-flex items-center justify-center p-4 rounded-full bg-green-500/15">
          <CheckCircle2 className="h-12 w-12 text-green-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">결제 완료!</h1>
          {creditInfo && (
            <p className="text-muted-foreground text-sm">
              <span className="font-bold text-[#8b5cf6]">{creditInfo.chargedCredits} cr</span>이 충전되었어요.
              현재 <span className="font-bold text-[#8b5cf6]">{creditInfo.totalCredits} cr</span> 보유 중이에요.
            </p>
          )}
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => navigate("/credits")}>
            더 충전하기
          </Button>
          <Button className="flex-1 bg-gradient-to-r from-[#6366f1] to-[#a78bfa] text-white hover:opacity-90"
            onClick={() => navigate("/dashboard")}>
            대시보드로
          </Button>
        </div>
      </div>
    </div>
  );
}

export default CreditSuccess;