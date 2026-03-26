import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building2, Briefcase, FileText, Star } from "lucide-react";
import { BASE_URL } from '../config';
import { useAuth } from '@/context/AuthContext';

const CompanyNew = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState({ companyName: "", industry: "", memo: "", isPrimary: false });
  const [loading, setLoading] = useState(false);

  const inputClass = "w-full px-4 py-2.5 rounded-lg border border-input text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--gradient-mid)]/50 focus:border-[var(--gradient-mid)] transition-all bg-background text-foreground";

  const handleSubmit = async () => {
    if (!form.companyName.trim()) { toast.error("기업명을 입력해주세요!"); return; }
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/api/companies`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("등록 실패");
      toast.success("목표기업이 추가되었습니다!");
      navigate("/companies");
    } catch (err) {
      toast.error(err.message || "오류가 발생했습니다.");
    } finally {
      setLoading(false); }
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

          <Button className="w-full bg-gradient-to-r from-[var(--gradient-start)] via-[var(--gradient-mid)] to-[var(--gradient-end)] text-white hover:opacity-90"
            onClick={handleSubmit} disabled={loading}>
            {loading ? "추가 중..." : "목표기업 추가하기"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompanyNew;