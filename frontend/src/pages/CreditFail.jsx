import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";

function CreditFail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const message = searchParams.get("message") || "결제가 취소되었습니다.";

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-sm w-full">
        <div className="inline-flex items-center justify-center p-4 rounded-full bg-destructive/15">
          <XCircle className="h-12 w-12 text-destructive" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">결제 실패</h1>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => navigate("/dashboard")}>
            대시보드로
          </Button>
          <Button className="flex-1 bg-gradient-to-r from-[#6366f1] to-[#a78bfa] text-white hover:opacity-90"
            onClick={() => navigate("/credits")}>
            다시 시도
          </Button>
        </div>
      </div>
    </div>
  );
}

export default CreditFail;