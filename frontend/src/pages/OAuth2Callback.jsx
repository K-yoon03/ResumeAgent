import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";  // ← 추가

export default function OAuth2Callback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshUser } = useAuth();  // ← 추가

  useEffect(() => {
    const token = searchParams.get("token");
    
    if (token) {
      localStorage.setItem("token", token);
      refreshUser().then(() => {    // ← setTimeout 대신 refreshUser 후 이동
        navigate("/dashboard");
      });
    } else {
      toast.error("로그인에 실패했습니다.");
      navigate("/login");
    }
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-[var(--gradient-mid)] mx-auto" />
        <p className="text-muted-foreground">로그인 처리 중...</p>
      </div>
    </div>
  );
}