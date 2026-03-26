import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { User, Mail, Calendar, AlertCircle, Check, Briefcase, RefreshCw, X } from "lucide-react";
import { BASE_URL } from '../config';
import CareerPilotHelmIcon from '../components/CareerPilotHelmIcon';
import jobCodeMap from '../MappingTable/jobCodeMap.json';

function MyPage() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ nickname: "", name: "", birthYear: "", birthMonth: "", birthDay: "" });
  const [nicknameError, setNicknameError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // 직무 변경 관련 state
  const [jobInput, setJobInput] = useState("");
  const [jobRemaining, setJobRemaining] = useState(3);
  const [jobLoading, setJobLoading] = useState(false);
  const [jobModal, setJobModal] = useState(null); // null | { type, data }
  // type: 'suggest' | 'noMatch'
  // data: { suggestions, reason, remaining }

  const monthRef = useRef(null);
  const dayRef = useRef(null);

  // 남은 직무 변경 횟수 조회
  useEffect(() => {
    if (!user) return;
    fetch(`${BASE_URL}/api/user/job/remaining-changes`, {
      headers: { Authorization: `Bearer ${user.token}` }
    })
      .then(res => res.json())
      .then(data => setJobRemaining(data.remaining))
      .catch(() => {});
  }, [user]);

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

  // 직무 변경 처리
  const handleJobChange = async () => {
    if (!jobInput.trim()) return;
    setJobLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/user/job`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ desiredJob: jobInput.trim() }),
      });

      if (res.status === 429) {
        const err = await res.json();
        setJobModal({ type: "noMatch", data: { reason: err.message } });
        return;
      }

      if (!res.ok) throw new Error("직무 변경 실패");

      const data = await res.json();
      const matchType = data.matchResult?.matchType;

      if (matchType === "NO_MATCH") {
        setJobModal({ type: "noMatch", data: { reason: data.matchResult.reason, remaining: data.remainingChanges } });
      } else if (matchType === "SIMILAR_MATCH") {
        setJobModal({
          type: "suggest",
          data: {
            suggestions: data.matchResult.suggestions,
            reason: data.matchResult.reason,
            remaining: data.remainingChanges,
          }
        });
      } else {
        // EXACT_MATCH → 바로 저장
        if (matchType === "EXACT_MATCH") {
          await refreshUser();
          setJobInput("");
          setSuccessMsg("희망 직무가 업데이트되었습니다!");
        } else if (matchType === "CATEGORY_MATCH") {
          // CATEGORY_MATCH → 임시 매핑 안내 모달
          setJobModal({
            type: "categoryMatch",
            data: {
              reason: data.matchResult.reason,
              jobCode: data.matchResult.jobCode,
              remaining: data.remainingChanges,
            }
          });
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setJobLoading(false);
    }
  };

  // 제안된 직무 선택
  const handleSelectSuggestion = async (suggestion) => {
    setJobModal(null);
    setJobInput(suggestion);
    setJobLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/user/job`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ desiredJob: suggestion }),
      });
      if (!res.ok) throw new Error("직무 변경 실패");
      await refreshUser();
      setJobInput("");
      setSuccessMsg("희망 직무가 업데이트되었습니다!");
    } catch (err) {
      setError(err.message);
    } finally {
      setJobLoading(false);
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

        {/* 희망 직무 변경 */}
        <Card className="border border-border/50 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-[var(--gradient-mid)]" />
              희망 직무
            </CardTitle>
            <CardDescription>
              {user?.mappedJobCode
                ? `현재: ${jobCodeMap[user.mappedJobCode] ?? user.mappedJobCode}${user?.isTemporaryJob ? " (임시 매핑)" : ""}`
                : "아직 희망 직무가 설정되지 않았어요"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={jobInput}
                onChange={(e) => setJobInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleJobChange()}
                placeholder="예: 백엔드 개발자, 마케터, 회계사"
                className={inputClass}
              />
              <Button
                onClick={handleJobChange}
                disabled={jobLoading || !jobInput.trim()}
                className="shrink-0 bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white hover:opacity-90"
              >
                {jobLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : "확인"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground pl-1">{"하루 최대 3회 변경 가능해요 (남은 횟수 "}<span className="font-semibold text-foreground">{jobRemaining}/3</span>{")"}</p>
          </CardContent>
        </Card>

        {/* 직무 매핑 모달 */}
        {jobModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="relative w-full max-w-sm mx-4 bg-card border border-border rounded-2xl shadow-2xl p-8">
              <button
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
                onClick={() => setJobModal(null)}
              >
                <X className="h-5 w-5" />
              </button>

              {jobModal.type === "suggest" && (
                <>
                  <div className="inline-flex items-center justify-center p-3 rounded-full bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] mb-4">
                    <Briefcase className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold mb-1">관련 직무가 있어요!</h3>
                  <p className="text-sm text-muted-foreground mb-5">{jobModal.data.reason}</p>
                  <div className="space-y-2 mb-4">
                    {jobModal.data.suggestions.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => handleSelectSuggestion(s)}
                        className="w-full text-left px-4 py-3 rounded-lg border border-border hover:border-[var(--gradient-mid)]/50 hover:bg-[var(--gradient-mid)]/5 transition-all text-sm font-medium"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  {jobModal.data.remaining !== undefined && (
                    <p className="text-xs text-muted-foreground text-center">오늘 남은 변경 횟수: {jobModal.data.remaining}회</p>
                  )}
                </>
              )}

              {jobModal.type === "categoryMatch" && (
                <>
                  <div className="inline-flex items-center justify-center p-3 rounded-full bg-[var(--gradient-mid)]/20 mb-4">
                    <Briefcase className="h-6 w-6 text-[var(--gradient-mid)]" />
                  </div>
                  <h3 className="text-lg font-bold mb-1">임시 직무로 매핑됐어요</h3>
                  <p className="text-sm text-muted-foreground mb-2">{jobModal.data.reason}</p>
                  <p className="text-xs text-amber-500 dark:text-amber-400 mb-4">
                    💡 더 정확한 직무명을 입력하면 세부 역량 평가가 가능해요!
                  </p>
                  {jobModal.data.suggestions?.length > 0 && (
                    <div className="space-y-2 mb-4">
                      <p className="text-xs font-medium text-muted-foreground">혹시 이런 직무를 찾으셨나요?</p>
                      {jobModal.data.suggestions.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => handleSelectSuggestion(s)}
                          className="w-full text-left px-4 py-2.5 rounded-lg border border-border hover:border-[var(--gradient-mid)]/50 hover:bg-[var(--gradient-mid)]/5 transition-all text-sm font-medium"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                  {jobModal.data.remaining !== undefined && (
                    <p className="text-xs text-muted-foreground mb-3 text-center">오늘 남은 변경 횟수: {jobModal.data.remaining}회</p>
                  )}
                  <div className="space-y-2">
                    <Button
                      className="w-full bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white hover:opacity-90"
                      onClick={async () => {
                        setJobModal(null);
                        await refreshUser();
                        setJobInput("");
                        setSuccessMsg("희망 직무가 임시 저장되었습니다.");
                      }}
                    >
                      임시 저장으로 계속하기
                    </Button>
                    <Button variant="outline" className="w-full" onClick={() => setJobModal(null)}>
                      다시 입력하기
                    </Button>
                  </div>
                </>
              )}

              {jobModal.type === "noMatch" && (
                <>
                  <div className="inline-flex items-center justify-center p-3 rounded-full bg-amber-500/20 mb-4">
                    <AlertCircle className="h-6 w-6 text-amber-500" />
                  </div>
                  <h3 className="text-lg font-bold mb-1">직무를 찾을 수 없어요</h3>
                  <p className="text-sm text-muted-foreground mb-6">{jobModal.data.reason}</p>
                  <div className="space-y-2">
                    <Button
                      className="w-full bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white hover:opacity-90"
                      onClick={() => setJobModal(null)}
                    >
                      다시 시도
                    </Button>
                    <Button variant="outline" className="w-full" onClick={() => setJobModal(null)}>
                      취소
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

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
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    취소
                  </Button>
                  <Button
                    className="flex-1 bg-destructive text-white hover:bg-destructive/90"
                    onClick={handleDelete}
                  >
                    탈퇴하기
                  </Button>
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