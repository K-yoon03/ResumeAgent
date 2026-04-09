import { useEffect, useState } from "react";
import { Coins } from "lucide-react";
import { Button } from "./ui/button";
import { useNavigate } from "react-router-dom";

export default function CreditInsufficientModal() {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState({ required: 1, remaining: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e) => {
      setDetail(e.detail);
      setOpen(true);
    };
    window.addEventListener("credit-insufficient", handler);
    return () => window.removeEventListener("credit-insufficient", handler);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">

        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <Coins className="h-6 w-6 text-amber-500" />
          </div>
          <h2 className="text-lg font-bold">크레딧이 부족해요</h2>
          <p className="text-sm text-muted-foreground">
            이 기능을 사용하려면 <span className="font-semibold text-foreground">{detail.required} 크레딧</span>이 필요해요.
            <br />현재 보유: <span className="font-semibold text-amber-500">{detail.remaining} 크레딧</span>
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <Button
            className="w-full bg-gradient-to-r from-[#6366f1] to-[#a78bfa] text-white hover:opacity-90"
            onClick={() => { setOpen(false); navigate("/credits/charge"); }}
          >
            크레딧 충전하기
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => setOpen(false)}>
            닫기
          </Button>
        </div>
      </div>
    </div>
  );
}