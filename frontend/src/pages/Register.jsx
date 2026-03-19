import { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, Mail, Lock, User, AlertCircle, Calendar } from "lucide-react";

function Register() {
  const [form, setForm] = useState({ email: "", password: "", nickname: "", name: "", birthYear: "", birthMonth: "", birthDay: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const monthRef = useRef(null);
  const dayRef = useRef(null);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleBirthInput = (e, field, maxLen, nextRef) => {
    const value = e.target.value.replace(/\D/g, ""); // 숫자만
    setForm(prev => ({ ...prev, [field]: value }));
    if (value.length >= maxLen && nextRef) {
      nextRef.current?.focus();
    }
  };

  const handleSubmit = async () => {
    setError("");

    // 생년월일 조합
    const { birthYear, birthMonth, birthDay } = form;
    let birthDate = null;
    if (birthYear || birthMonth || birthDay) {
      if (!birthYear || !birthMonth || !birthDay) {
        setError("생년월일을 모두 입력해주세요.");
        return;
      }
      const year = birthYear.length === 2 ? `20${birthYear}` : birthYear;
      birthDate = `${year}-${birthMonth.padStart(2, "0")}-${birthDay.padStart(2, "0")}`;
    }

    setLoading(true);
    try {
      const res = await fetch("http://localhost:8080/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          nickname: form.nickname || null,
          name: form.name || null,
          birthDate,
        })
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

  const inputClass = "w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--gradient-mid)]/50 focus:border-[var(--gradient-mid)] transition-all";

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
              CareerPilot
            </h1>
            <p className="text-sm text-muted-foreground mt-1">AI 기반 취업 준비 플랫폼</p>
          </div>
        </div>

        <Card className="border border-border/50 shadow-lg">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">회원가입</CardTitle>
            <CardDescription>계정을 만들고 AI 취업 준비를 시작하세요</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {/* 이름 */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2 text-foreground">
                <User className="h-4 w-4 text-[var(--gradient-mid)]" />
                이름
              </label>
              <input
                type="text" name="name" value={form.name}
                onChange={handleChange}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="실명을 입력하세요"
                className={inputClass}
              />
            </div>

            {/* 닉네임 */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2 text-foreground">
                <User className="h-4 w-4 text-[var(--gradient-mid)]" />
                닉네임
              </label>
              <input
                type="text" name="nickname" value={form.nickname}
                onChange={handleChange}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="닉네임을 입력하세요"
                className={inputClass}
              />
              <p className="text-xs text-muted-foreground pl-1">비워두면 자동으로 생성됩니다</p>
            </div>

            {/* 이메일 */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2 text-foreground">
                <Mail className="h-4 w-4 text-[var(--gradient-mid)]" />
                이메일
              </label>
              <input
                type="email" name="email" value={form.email}
                onChange={handleChange}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="example@email.com"
                className={inputClass}
              />
            </div>

            {/* 비밀번호 */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2 text-foreground">
                <Lock className="h-4 w-4 text-[var(--gradient-mid)]" />
                비밀번호
              </label>
              <input
                type="password" name="password" value={form.password}
                onChange={handleChange}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="8자 이상 입력하세요"
                className={inputClass}
              />
            </div>

            {/* 생년월일 */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2 text-foreground">
                <Calendar className="h-4 w-4 text-[var(--gradient-mid)]" />
                생년월일 <span className="text-xs text-muted-foreground font-normal">(선택)</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text" inputMode="numeric" maxLength={4}
                  value={form.birthYear}
                  onChange={(e) => handleBirthInput(e, "birthYear", 4, monthRef)}
                  placeholder="년도"
                  className="w-24 px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm text-center placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--gradient-mid)]/50 focus:border-[var(--gradient-mid)] transition-all"
                />
                <span className="text-muted-foreground text-sm">/</span>
                <input
                  ref={monthRef}
                  type="text" inputMode="numeric" maxLength={2}
                  value={form.birthMonth}
                  onChange={(e) => handleBirthInput(e, "birthMonth", 2, dayRef)}
                  placeholder="월"
                  className="w-16 px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm text-center placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--gradient-mid)]/50 focus:border-[var(--gradient-mid)] transition-all"
                />
                <span className="text-muted-foreground text-sm">/</span>
                <input
                  ref={dayRef}
                  type="text" inputMode="numeric" maxLength={2}
                  value={form.birthDay}
                  onChange={(e) => handleBirthInput(e, "birthDay", 2, null)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  placeholder="일"
                  className="w-16 px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm text-center placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--gradient-mid)]/50 focus:border-[var(--gradient-mid)] transition-all"
                />
              </div>
              <p className="text-xs text-muted-foreground pl-1">예: 2001 / 10 / 5</p>
            </div>

            <Button
              className="w-full bg-gradient-to-r from-[var(--gradient-start)] via-[var(--gradient-mid)] to-[var(--gradient-end)] text-white hover:opacity-90 transition-opacity mt-2"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? "가입 중..." : "회원가입"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              이미 계정이 있으신가요?{" "}
              <Link to="/login" className="font-medium bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] bg-clip-text text-transparent hover:opacity-80 transition-opacity">
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