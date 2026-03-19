// src/components/ProtectedRoute.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  if (loading) return null;

  if (!user && !dismissed) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="relative w-full max-w-sm mx-4 bg-card border border-border rounded-2xl shadow-2xl p-8 text-center">
          <button
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => { setDismissed(true); navigate(-1); }}
          >
            <X className="h-5 w-5" />
          </button>
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] mb-4">
            <span className="text-2xl">🔒</span>
          </div>
          <h3 className="text-lg font-bold text-foreground mb-2">로그인이 필요해요</h3>
          <p className="text-sm text-muted-foreground mb-6">
            이 기능은 로그인 후 이용할 수 있어요.<br />
            회원가입하고 모든 기능을 사용해보세요!
          </p>
          <div className="space-y-3">
            <Button
              className="w-full bg-gradient-to-r from-[var(--gradient-start)] via-[var(--gradient-mid)] to-[var(--gradient-end)] text-white hover:opacity-90"
              onClick={() => navigate("/register")}
            >
              회원가입하고 이용하기
            </Button>
            <Button variant="outline" className="w-full" onClick={() => navigate("/login")}>
              로그인
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return children;
}