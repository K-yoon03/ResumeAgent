import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function OAuth2Callback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");
    
    if (token) {
      
      // localStorage에 저장
      localStorage.setItem("token", token);
      
      // 메인 페이지로 이동
      setTimeout(() => {
        navigate("/");
      }, 1000);
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