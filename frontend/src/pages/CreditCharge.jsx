import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Coins, Check, Zap } from "lucide-react";
import { BASE_URL } from "../config";
import { toast } from "sonner";

const PLANS = [
  {
    id: "plan_10",
    credits: 10,
    bonus: 0,
    price: 1000,
    label: "기본",
    description: "가볍게 시작",
    highlight: false,
  },
  {
    id: "plan_50",
    credits: 50,
    bonus: 5,
    price: 5000,
    label: "추천",
    description: "가장 인기 있는 플랜",
    highlight: true,
  },
  {
    id: "plan_100",
    credits: 100,
    bonus: 10,
    price: 10000,
    label: "최대",
    description: "심층 분석을 원한다면",
    highlight: false,
  },
];

function CreditCharge() {
  const { user, credits } = useAuth();
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState(PLANS[1]);
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    if (!user) { navigate("/login"); return; }
    setLoading(true);
    try {
      const token = localStorage.getItem("token");

      // 백엔드에서 orderId 생성
      const res = await fetch(`${BASE_URL}/api/payments/prepare`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ planId: selectedPlan.id, amount: selectedPlan.price }),
      });
      if (!res.ok) throw new Error("결제 준비 실패");
      const { orderId, orderName, customerName, customerEmail } = await res.json();

      // 포트원 V2 SDK 로드
      const PortOne = await import("@portone/browser-sdk/v2");

      const response = await PortOne.requestPayment({
        storeId: import.meta.env.VITE_PORTONE_STORE_ID,
        channelKey: import.meta.env.VITE_PORTONE_CHANNEL_KEY,
        paymentId: orderId,
        orderName,
        totalAmount: selectedPlan.price,
        currency: "CURRENCY_KRW",
        payMethod: "CARD",
        customer: {
          customerId: String(user.id).slice(0, 20),
          fullName: customerName,
          email: customerEmail,
        },
        redirectUrl: `${window.location.origin}/credits/success`,
      });

      if (response.code !== undefined) {
        // 결제 실패/취소
        toast.error(response.message || "결제가 취소되었습니다.");
        return;
      }

      // 결제 성공 → 백엔드 승인
      navigate(`/credits/success?paymentId=${orderId}`);
    } catch (err) {
      toast.error(err.message || "결제 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-lg space-y-6">

        {/* 헤더 */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-gradient-to-br from-[#6366f1] to-[#a78bfa]">
            <Coins className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-[#6366f1] to-[#a78bfa] bg-clip-text text-transparent">
            크레딧 충전
          </h1>
          <p className="text-sm text-muted-foreground">
            현재 보유 크레딧: <span className="font-bold text-[#8b5cf6]">{credits >= 999999 ? "∞" : credits} cr</span>
          </p>
        </div>

        {/* 플랜 선택 */}
        <div className="space-y-3">
          {PLANS.map((plan) => (
            <button
              key={plan.id}
              onClick={() => setSelectedPlan(plan)}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all relative ${
                selectedPlan.id === plan.id
                  ? "border-[#8b5cf6] bg-[#8b5cf6]/5 dark:bg-[#8b5cf6]/10"
                  : "border-border hover:border-[#a78bfa] bg-card"
              }`}
            >
              {plan.highlight && (
                <span className="absolute -top-2.5 left-4 text-xs font-bold px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#6366f1] to-[#a78bfa] text-white">
                  {plan.label}
                </span>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    selectedPlan.id === plan.id
                      ? "border-[#8b5cf6] bg-[#8b5cf6]"
                      : "border-muted-foreground"
                  }`}>
                    {selectedPlan.id === plan.id && <Check className="h-3 w-3 text-white" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">{plan.credits} cr</span>
                      {plan.bonus > 0 && (
                        <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-[#8b5cf6]/15 text-[#8b5cf6]">
                          +{plan.bonus} 보너스
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{plan.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-bold text-lg text-foreground">
                    {plan.price.toLocaleString()}원
                  </span>
                  {plan.bonus > 0 && (
                    <p className="text-xs text-muted-foreground">총 {plan.credits + plan.bonus} cr</p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* 선택 요약 */}
        <Card className="border-[#8b5cf6]/30 bg-[#8b5cf6]/5 dark:bg-[#8b5cf6]/10">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">충전 후 보유 크레딧</span>
              <span className="font-bold text-[#8b5cf6]">
                {(credits || 0) + selectedPlan.credits + selectedPlan.bonus} cr
              </span>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-muted-foreground">결제 금액</span>
              <span className="font-bold">{selectedPlan.price.toLocaleString()}원</span>
            </div>
          </CardContent>
        </Card>

        {/* 결제 버튼 */}
        <Button
          className="w-full bg-gradient-to-r from-[#6366f1] to-[#a78bfa] text-white hover:opacity-90 transition-opacity h-12 text-base font-semibold"
          onClick={handlePayment}
          disabled={loading}
        >
          {loading ? "결제 준비 중..." : (
            <>
              <Zap className="h-4 w-4 mr-2" />
              {selectedPlan.price.toLocaleString()}원 결제하기
            </>
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          포트원을 통해 안전하게 결제됩니다
        </p>
      </div>
    </div>
  );
}

export default CreditCharge;