import { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Lock, User, AlertCircle, Calendar, Briefcase } from "lucide-react";  // 🔥 Briefcase 추가
import { BASE_URL } from '../config';
import CareerPilotHelmIcon from '../components/CareerPilotHelmIcon';
import { toast } from "sonner";

function Register() {
  const [form, setForm] = useState({ 
    email: "", 
    password: "", 
    nickname: "", 
    name: "", 
    birthYear: "", 
    birthMonth: "", 
    birthDay: "",
    desiredJob: ""  // 🔥 추가
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const [nicknameError, setNicknameError] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeError, setCodeError] = useState("");
  const [agreed, setAgreed] = useState(false);

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

  const checkNickname = async (nickname) => {
    if (!nickname || nickname.trim() === '') {
        setNicknameError('');
        return;
    }
    try {
        const res = await fetch(`${BASE_URL}/api/auth/check-nickname?nickname=${nickname}`);
        const isDuplicate = await res.json();
        if (isDuplicate) {
            setNicknameError('이미 사용중인 닉네임입니다.');
        } else {
            setNicknameError('');
        }
    } catch (err) {
        // 에러 시 무시
    }
  };
  
  const sendCode = async () => {
    if (!form.email) {
      setError("이메일을 입력해주세요.");
      return;
    }
    setCodeLoading(true);
    setCodeError("");
    try {
      const res = await fetch(`${BASE_URL}/api/auth/send-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "발송 실패");
      }
      setCodeSent(true);
      toast.success("인증코드가 발송되었습니다!");
    } catch (err) {
      setCodeError(err.message);
    } finally {
      setCodeLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!code) {
      setCodeError("인증코드를 입력해주세요.");
      return;
    }
    setCodeLoading(true);
    setCodeError("");
    try {
      const res = await fetch(`${BASE_URL}/api/auth/verify-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, code }),
      });
      const isValid = await res.json();
      if (isValid) {
        setEmailVerified(true);
        setCodeError("");
        toast.success("이메일 인증 완료!");
      } else {
        setCodeError("인증코드가 올바르지 않습니다.");
      }
    } catch {
      setCodeError("인증 확인에 실패했습니다.");
    } finally {
      setCodeLoading(false);
    }
  };

  const handleSubmit = async () => {
    setError("");

    if (!agreed) {
      setError("이용약관 및 개인정보처리방침에 동의해주세요.");
      return;
    }
    
    if (!emailVerified) {
      setError("이메일 인증을 완료해주세요.");
      return;
    }
    
    if (nicknameError) {
      setError("닉네임을 확인해주세요.");
      return;
    }
    
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
      const res = await fetch(`${BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          nickname: form.nickname || null,
          name: form.name || null,
          birthDate,
          desiredJob: form.desiredJob || null,  // 🔥 추가
        })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "회원가입 실패");
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
                onBlur={(e) => checkNickname(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="닉네임을 입력하세요"
                className={inputClass}
              />
              {nicknameError
                ? <p className="text-xs text-destructive pl-1">{nicknameError}</p>
                : <p className="text-xs text-muted-foreground pl-1">비워두면 자동으로 생성됩니다</p>
              }
            </div>

            {/* 이메일 */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2 text-foreground">
                <Mail className="h-4 w-4 text-[var(--gradient-mid)]" />
                이메일
              </label>
              <div className="flex gap-2">
                <input
                  type="email" name="email" value={form.email}
                  onChange={(e) => {
                    handleChange(e);
                    setEmailVerified(false);
                    setCodeSent(false);
                    setCode("");
                    setCodeError("");
                  }}
                  placeholder="example@email.com"
                  className={inputClass}
                  disabled={emailVerified}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={sendCode}
                  disabled={codeLoading || emailVerified || !form.email}
                  className="shrink-0 h-[42px] px-4 text-sm whitespace-nowrap"
                >
                  {emailVerified ? "인증완료" : codeLoading ? "발송중..." : codeSent ? "재발송" : "인증코드 발송"}
                </Button>
              </div>

              {/* 인증코드 입력 */}
              {codeSent && !emailVerified && (
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="6자리 인증코드"
                    maxLength={6}
                    className={inputClass}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={verifyCode}
                    disabled={codeLoading || !code}
                    className="shrink-0 h-[42px] px-4 text-sm whitespace-nowrap"
                  >
                    {codeLoading ? "확인중..." : "확인"}
                  </Button>
                </div>
              )}

              {/* 인증 상태 메시지 */}
              {emailVerified && (
                <p className="text-xs text-green-600 pl-1">✓ 이메일 인증이 완료되었습니다</p>
              )}
              {codeError && (
                <p className="text-xs text-destructive pl-1">{codeError}</p>
              )}
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

            {/* 🔥 희망 직무 (추가) */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2 text-foreground">
                <Briefcase className="h-4 w-4 text-[var(--gradient-mid)]" />
                희망 직무 <span className="text-xs text-muted-foreground font-normal">(선택)</span>
              </label>
              <input
                type="text" 
                name="desiredJob" 
                value={form.desiredJob}
                onChange={handleChange}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="예: 백엔드 개발자, 프론트엔드 개발자"
                className={inputClass}
              />
              <p className="text-xs text-muted-foreground pl-1">
                나중에 마이페이지에서 변경할 수 있습니다
              </p>
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

            {/* 약관 동의 */}
            <div className="px-1 py-2 rounded-xl bg-[#6366f1]/5 border border-[#6366f1]/20 px-4 py-3 space-y-2">
              <p className="text-xs text-muted-foreground">
                ⚠️ 본 서비스는 현재 베타 운영 중입니다. 일부 기능이 변경되거나 불안정할 수 있습니다.
              </p>
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative mt-0.5">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${agreed ? 'bg-[#6366f1] border-[#6366f1]' : 'border-muted-foreground group-hover:border-[#6366f1]'}`}>
                    {agreed && (
                      <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-xs text-foreground leading-relaxed">
                  <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-[#6366f1] underline underline-offset-2">이용약관 및 개인정보처리방침</a>을 확인하였으며, 이에 동의합니다. <span className="text-[#6366f1] font-medium">(필수)</span>
                </span>
              </label>
            </div>

            <Button
              className="w-full bg-gradient-to-r from-[var(--gradient-start)] via-[var(--gradient-mid)] to-[var(--gradient-end)] text-white hover:opacity-90 transition-opacity mt-2"
              onClick={handleSubmit}
              disabled={loading || !emailVerified || !agreed}
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