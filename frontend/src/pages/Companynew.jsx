import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Briefcase, FileText, Star, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { BASE_URL } from '../config';
import { useAuth } from '@/context/AuthContext';
import { MagicPaste } from '@/components/MagicPaste';

const CompanyNew = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState({ companyName: "", industry: "", memo: "", companySize: "", isPrimary: false });
  const companySizes = ["대기업", "중견", "중소", "스타트업", "공기업"];
  const [loading, setLoading] = useState(false);

  // 공고 관련 state
  const [showPosting, setShowPosting] = useState(false);
  const [magicPasteOpen, setMagicPasteOpen] = useState(false);
  const [postingForm, setPostingForm] = useState({
    position: "",
    mainTasks: "",
    requirements: "",
    preferred: "",
    techStack: "",
    workPlace: "",
    employmentType: "",
  });
  const [rawText, setRawText] = useState("");

  const inputClass = "w-full px-4 py-2.5 rounded-lg border border-input text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--gradient-mid)]/50 focus:border-[var(--gradient-mid)] transition-all bg-background text-foreground";

  const handleParsed = (json) => {
    setPostingForm({
      position: json.position || "",
      mainTasks: json.mainTasks || "",
      requirements: json.requirements || "",
      preferred: json.preferred || "",
      techStack: json.techStack || "",
      workPlace: json.workPlace || "",
      employmentType: json.employmentType || "",
    });
    setRawText(JSON.stringify(json));
    setShowPosting(true);
    toast.success("공고 내용이 자동으로 채워졌어요!");
  };

  const hasPostingContent = Object.values(postingForm).some(v => v.trim());

  const handleSubmit = async () => {
    if (!form.companyName.trim()) { toast.error("기업명을 입력해주세요!"); return; }
    setLoading(true);
    try {
      const token = localStorage.getItem("token");

      // 1. 기업 등록
      const companyRes = await fetch(`${BASE_URL}/api/companies`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (!companyRes.ok) throw new Error("기업 등록 실패");
      const company = await companyRes.json();

      // 2. 공고 등록 (내용이 있을 때만)
      if (hasPostingContent && company.id) {
        const postingRaw = rawText || JSON.stringify(postingForm);
        await fetch(`${BASE_URL}/api/companies/${company.id}/postings`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            rawText: postingRaw,
            position: postingForm.position,
          }),
        });
      }

      toast.success("목표기업이 추가되었습니다!");
      navigate("/companies");
    } catch (err) {
      toast.error(err.message || "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const industries = ["IT·인터넷", "금융·은행", "제조·화학", "게임", "커머스·유통", "미디어·엔터", "스타트업", "공공·기관", "기타"];

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-6">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center p-3 rounded-full bg-gradient-to-br from-[var(--gradient-start)] via-[var(--gradient-mid)] to-[var(--gradient-end)]">
          <Building2 className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-[var(--gradient-start)] via-[var(--gradient-mid)] to-[var(--gradient-end)] bg-clip-text text-transparent">새 목표기업 추가</h1>
        <p className="text-muted-foreground text-sm">지원하고 싶은 기업을 추가해보세요!</p>
      </div>

      {/* 기업 정보 */}
      <Card className="border border-border/50 shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">🏢 기업 정보</CardTitle>
          <CardDescription>기업 정보를 입력해주세요</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2 text-foreground">
              <Building2 className="h-4 w-4 text-[var(--gradient-mid)]" />기업명 <span className="text-red-500">*</span>
            </label>
            <input type="text" value={form.companyName} onChange={(e) => setForm({...form, companyName: e.target.value})}
              placeholder="예: 카카오, 네이버, 토스" className={inputClass} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2 text-foreground">
              <Briefcase className="h-4 w-4 text-[var(--gradient-mid)]" />산업군
            </label>
            <div className="flex flex-wrap gap-2">
              {industries.map((ind) => (
                <button key={ind} onClick={() => setForm({...form, industry: ind})}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                    form.industry === ind
                      ? "border-[var(--gradient-mid)] bg-[var(--gradient-mid)]/10 text-[var(--gradient-mid)]"
                      : "border-border text-muted-foreground hover:border-[var(--gradient-mid)]/50"
                  }`}>
                  {ind}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2 text-foreground">
              <FileText className="h-4 w-4 text-[var(--gradient-mid)]" />메모
            </label>
            <textarea value={form.memo} onChange={(e) => setForm({...form, memo: e.target.value})}
              placeholder="지원 포지션, 채용 공고 링크, 준비 사항 등을 자유롭게 적어주세요"
              rows={3} className={`${inputClass} resize-none`} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2 text-foreground">
              <Briefcase className="h-4 w-4 text-[var(--gradient-mid)]" />기업 규모
            </label>
            <div className="flex flex-wrap gap-2">
              {companySizes.map((size) => (
                <button key={size} onClick={() => setForm({...form, companySize: size})}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                    form.companySize === size
                      ? "border-[var(--gradient-mid)] bg-[var(--gradient-mid)]/10 text-[var(--gradient-mid)]"
                      : "border-border text-muted-foreground hover:border-[var(--gradient-mid)]/50"
                  }`}>
                  {size}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg border border-border/50">
            <Star className={`h-4 w-4 ${form.isPrimary ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"}`} />
            <div className="flex-1">
              <p className="text-sm font-medium">주 희망기업으로 설정</p>
              <p className="text-xs text-muted-foreground">대시보드에 우선 표시됩니다</p>
            </div>
            <button onClick={() => setForm({...form, isPrimary: !form.isPrimary})}
              className={`w-10 h-6 rounded-full transition-colors ${form.isPrimary ? "bg-[var(--gradient-mid)]" : "bg-muted"}`}>
              <div className={`w-4 h-4 rounded-full bg-white shadow mx-1 transition-transform ${form.isPrimary ? "translate-x-4" : "translate-x-0"}`} />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* 모집공고 섹션 */}
      <Card className="border border-border/50 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                📋 모집공고
                <Badge variant="outline" className="text-xs font-normal">선택사항</Badge>
              </CardTitle>
              <CardDescription className="mt-1">공고를 등록하면 역량 분석에 활용됩니다</CardDescription>
            </div>
            <button
              onClick={() => setShowPosting(!showPosting)}
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              {showPosting ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {showPosting ? "접기" : "펼치기"}
            </button>
          </div>
        </CardHeader>

        {showPosting && (
          <CardContent className="space-y-4">
            {/* Magic Paste 버튼 */}
            <Button
              variant="outline"
              className="w-full border-dashed border-[var(--gradient-mid)]/50 text-[var(--gradient-mid)] hover:bg-[var(--gradient-mid)]/5"
              onClick={() => setMagicPasteOpen(true)}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              매직 페이스트로 자동 입력
            </Button>

            {hasPostingContent && (
              <div className="text-xs text-green-500 flex items-center gap-1">
                ✓ 공고 내용이 입력되었습니다
              </div>
            )}

            {/* 공고 폼 */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">포지션</label>
                <input type="text" value={postingForm.position}
                  onChange={(e) => setPostingForm({...postingForm, position: e.target.value})}
                  placeholder="예: 백엔드 개발자" className={inputClass} />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">주요업무</label>
                <textarea value={postingForm.mainTasks}
                  onChange={(e) => setPostingForm({...postingForm, mainTasks: e.target.value})}
                  placeholder="주요 업무 내용" rows={3} className={`${inputClass} resize-none`} />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">자격요건</label>
                <textarea value={postingForm.requirements}
                  onChange={(e) => setPostingForm({...postingForm, requirements: e.target.value})}
                  placeholder="필수 자격요건" rows={3} className={`${inputClass} resize-none`} />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">우대사항</label>
                <textarea value={postingForm.preferred}
                  onChange={(e) => setPostingForm({...postingForm, preferred: e.target.value})}
                  placeholder="우대 사항" rows={2} className={`${inputClass} resize-none`} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">기술스택</label>
                  <input type="text" value={postingForm.techStack}
                    onChange={(e) => setPostingForm({...postingForm, techStack: e.target.value})}
                    placeholder="Spring Boot, React..." className={inputClass} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">고용형태</label>
                  <input type="text" value={postingForm.employmentType}
                    onChange={(e) => setPostingForm({...postingForm, employmentType: e.target.value})}
                    placeholder="정규직, 인턴..." className={inputClass} />
                </div>
              </div>
            </div>
          </CardContent>
        )}

        {!showPosting && (
          <CardContent className="pt-0">
            <button
              onClick={() => setShowPosting(true)}
              className="w-full py-3 border border-dashed border-border rounded-lg text-sm text-muted-foreground hover:text-foreground hover:border-[var(--gradient-mid)]/50 transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="h-4 w-4" />
              공고 추가하기
            </button>
          </CardContent>
        )}
      </Card>

      <Button
        className="w-full bg-gradient-to-r from-[var(--gradient-start)] via-[var(--gradient-mid)] to-[var(--gradient-end)] text-white hover:opacity-90"
        onClick={handleSubmit} disabled={loading}
      >
        {loading ? "추가 중..." : "목표기업 추가하기"}
      </Button>

      <MagicPaste
        isOpen={magicPasteOpen}
        onClose={() => setMagicPasteOpen(false)}
        onParsed={handleParsed}
      />
    </div>
  );
};

export default CompanyNew;