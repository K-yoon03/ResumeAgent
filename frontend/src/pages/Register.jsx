import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, Mail, Lock, User, AlertCircle } from "lucide-react";

function Register() {
  const [form, setForm] = useState({ email: "", password: "", name: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8080/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "회원가입 실패");
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

  const fields = [
    { name: "name", label: "이름", type: "text", icon: User, placeholder: "홍길동" },
    { name: "email", label: "이메일", type: "email", icon: Mail, placeholder: "example@email.com" },
    { name: "password", label: "비밀번호", type: "password", icon: Lock, placeholder: "8자 이상 입력하세요" },
  ];

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">

        {/* 로고 */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-gradient-to-br from-[var(--gradient-start)] via-[var(--gradient-mid)] to-[var(--gradient-end)]">
            <Zap className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[var(--gradient-start)] via-[var(--gradient-mid)] to-[var(--gradient-end)] bg-clip-text text-transparent">
              CareerBoost
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              AI 기반 취업 준비 플랫폼
            </p>
          </div>
        </div>

        {/* 카드 */}
        <Card className="border border-border/50 shadow-lg">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">회원가입</CardTitle>
            <CardDescription>계정을 만들고 AI 취업 준비를 시작하세요</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* 에러 메시지 */}
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {/* 입력 필드 */}
            {fields.map(({ name, label, type, icon: Icon, placeholder }) => (
              <div key={name} className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2 text-foreground">
                  <Icon className="h-4 w-4 text-[var(--gradient-mid)]" />
                  {label}
                </label>
                <input
                  type={type}
                  name={name}
                  value={form[name]}
                  onChange={handleChange}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  placeholder={placeholder}
                  className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--gradient-mid)]/50 focus:border-[var(--gradient-mid)] transition-all"
                />
              </div>
            ))}

            {/* 회원가입 버튼 */}
            <Button
              className="w-full bg-gradient-to-r from-[var(--gradient-start)] via-[var(--gradient-mid)] to-[var(--gradient-end)] text-white hover:opacity-90 transition-opacity mt-2"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? "가입 중..." : "회원가입"}
            </Button>

            {/* 로그인 링크 */}
            <p className="text-center text-sm text-muted-foreground">
              이미 계정이 있으신가요?{" "}
              <Link
                to="/login"
                className="font-medium bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] bg-clip-text text-transparent hover:opacity-80 transition-opacity"
              >
                로그인
              </Link>
            </p>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

export default Register;