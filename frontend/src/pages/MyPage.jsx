import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { User, Mail, Calendar, AlertCircle, Check, X } from "lucide-react";
import { BASE_URL } from '../config';
import CareerPilotHelmIcon from '../components/CareerPilotHelmIcon';

function MyPage() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ nickname: "", name: "", birthYear: "", birthMonth: "", birthDay: "" });
  const [nicknameError, setNicknameError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const monthRef = useRef(null);
  const dayRef = useRef(null);

  // 유저 정보로 폼 초기화
  useEffect(() => {
    if (!user) return;
    const [birthYear, birthMonth, birthDay] = user.birthDate
      ? user.birthDate.split("-")
      : ["", "", ""];
    setForm({
      nickname: user.nickname || "",
      name: user.name || "",
      birthYear: birthYear || "",
      birthMonth: birthMonth || "",
      birthDay: birthDay || "",
    });
  }, [user]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleBirthInput = (e, field, maxLen, nextRef) => {
    const value = e.target.value.replace(/\D/g, "");
    setForm(prev => ({ ...prev, [field]: value }));
    if (value.length >= maxLen && nextRef) nextRef.current?.focus();
  };

  const checkNickname = async (nickname) => {
    if (!nickname || nickname.trim() === "" || nickname === user.nickname) {
      setNicknameError("");
      return;
    }
    try {
      const res = await fetch(`${BASE_URL}/api/auth/check-nickname?nickname=${nickname}`);
      const isDuplicate = await res.json();
      setNicknameError(isDuplicate ? "이미 사용중인 닉네임입니다." : "");
    } catch {
      // 에러 시 무시
    }
  };

  const handleSave = async () => {
    if (nicknameError) {
      setError("닉네임을 확인해주세요.");
      return;
    }
    setError("");
    setSuccessMsg("");

    const { birthYear, birthMonth, birthDay } = form;
    let birthDate = null;
    if (birthYear || birthMonth || birthDay) {
      if (!birthYear || !birthMonth || !birthDay) {
        setError("생년월일을 모두 입력하거나 모두 비워주세요.");
        return;
      }
      const year = birthYear.length === 2 ? `20${birthYear}` : birthYear;
      birthDate = `${year}-${birthMonth.padStart(2, "0")}-${birthDay.padStart(2, "0")}`;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/auth/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          nickname: form.nickname,
          name: form.name,
          birthDate,
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "수정 실패");
      }
      await refreshUser();
      setSuccessMsg("수정되었습니다.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/auth/me`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (!res.ok) throw new Error("회원탈퇴 실패");
      logout();
      navigate("/");
    } catch (err) {
      setError(err.message);
    }
  };

  const inputClass = "w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--gradient-mid)]/50 focus:border-[var(--gradient-mid)] transition-all";
  const disabledInputClass = "w-full px-4 py-2.5 rounded-lg border border-input bg-muted text-muted-foreground text-sm cursor-not-allowed";

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md space-y-6">

        {/* 로고 */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-gradient-to-br from-[var(--gradient-start)] via-[var(--gradient-mid)] to-[var(--gradient-end)]">
            <CareerPilotHelmIcon className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-[var(--gradient-start)] via-[var(--gradient-mid)] to-[var(--gradient-end)] bg-clip-text text-transparent">
            마이페이지
          </h1>
        </div>

        <Card className="border border-border/50 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">내 정보 수정</CardTitle>
            <CardDescription>이름, 닉네임, 생년월일을 수정할 수 있어요</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {successMsg && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-600 text-sm">
                <Check className="h-4 w-4 shrink-0" />
                {successMsg}
              </div>
            )}

            {/* 이메일 (수정 불가) */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2 text-foreground">
                <Mail className="h-4 w-4 text-[var(--gradient-mid)]" />
                이메일
                <span className="text-xs text-muted-foreground font-normal">(수정 불가)</span>
              </label>
              <input
                type="email"
                value={user?.email || ""}
                disabled
                className={disabledInputClass}
              />
            </div>

            {/* 이름 */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2 text-foreground">
                <User className="h-4 w-4 text-[var(--gradient-mid)]" />
                이름
              </label>
              <input
                type="text" name="name" value={form.name}
                onChange={handleChange}
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
                placeholder="닉네임을 입력하세요"
                className={inputClass}
              />
              {nicknameError && (
                <p className="text-xs text-destructive pl-1">{nicknameError}</p>
              )}
            </div>

            {/* 생년월일 */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2 text-foreground">
                <Calendar className="h-4 w-4 text-[var(--gradient-mid)]" />
                생년월일
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
                  placeholder="일"
                  className="w-16 px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm text-center placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--gradient-mid)]/50 focus:border-[var(--gradient-mid)] transition-all"
                />
              </div>
            </div>

            <Button
              className="w-full bg-gradient-to-r from-[var(--gradient-start)] via-[var(--gradient-mid)] to-[var(--gradient-end)] text-white hover:opacity-90 transition-opacity mt-2"
              onClick={handleSave}
              disabled={loading}
            >
              {loading ? "저장 중..." : "저장"}
            </Button>

          </CardContent>
        </Card>

        {/* 회원탈퇴 */}
        <Card className="border border-destructive/30 shadow-lg">
          <CardContent className="pt-6">
            {!showDeleteConfirm ? (
              <Button
                variant="outline"
                className="w-full border-destructive/50 text-destructive hover:bg-destructive/10"
                onClick={() => setShowDeleteConfirm(true)}
              >
                회원탈퇴
              </Button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-center text-muted-foreground">
                  정말 탈퇴하시겠어요? 모든 데이터가 삭제돼요.
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setShowDeleteConfirm(false)}>취소</Button>
                  <Button className="flex-1 bg-destructive text-white hover:bg-destructive/90" onClick={handleDelete}>탈퇴하기</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

export default MyPage;