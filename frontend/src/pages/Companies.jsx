import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Plus, Star, StarOff, Trash2, Pencil, X } from "lucide-react";
import { BASE_URL } from '../config';

const industries = ["IT·인터넷", "금융·은행", "제조·화학", "게임", "커머스·유통", "미디어·엔터", "스타트업", "공공·기관", "기타"];

const EditModal = ({ company, onClose, onSave }) => {
  const [form, setForm] = useState({
    companyName: company.companyName,
    industry: company.industry || "",
    memo: company.memo || "",
  });
  const [loading, setLoading] = useState(false);
  const inputClass = "w-full px-4 py-2.5 rounded-lg border border-input text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--gradient-mid)]/50 focus:border-[var(--gradient-mid)] transition-all bg-muted/30 text-foreground";

  const handleSave = async () => {
    if (!form.companyName.trim()) { toast.error("기업명을 입력해주세요!"); return; }
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/api/companies/${company.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("수정 실패");
      toast.success("수정되었습니다!");
      onSave();
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4 bg-card border border-border rounded-2xl shadow-2xl p-6">
        <button className="absolute top-4 right-4 text-muted-foreground hover:text-foreground" onClick={onClose}>
          <X className="h-5 w-5" />
        </button>
        <h3 className="text-lg font-bold mb-4">기업 정보 수정</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">기업명</label>
            <input type="text" value={form.companyName}
              onChange={(e) => setForm({...form, companyName: e.target.value})}
              className={inputClass} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">산업군</label>
            <div className="flex flex-wrap gap-2">
              {industries.map((ind) => (
                <button key={ind} onClick={() => setForm({...form, industry: ind})}
                  className={`px-3 py-1 rounded-lg text-xs border transition-all ${
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
            <label className="text-sm font-medium text-foreground">메모</label>
            <textarea value={form.memo} onChange={(e) => setForm({...form, memo: e.target.value})}
              rows={3} placeholder="지원 포지션, 메모 등"
              className={`${inputClass} resize-none`} />
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>취소</Button>
            <Button className="flex-1 bg-gradient-to-r from-[var(--gradient-start)] via-[var(--gradient-mid)] to-[var(--gradient-end)] text-white hover:opacity-90"
              onClick={handleSave} disabled={loading}>
              {loading ? "저장 중..." : "저장"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Companies = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState(null);

  useEffect(() => { fetchCompanies(); }, []);

  const fetchCompanies = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/api/companies`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("불러오기 실패");
      const data = await res.json();
      setCompanies(data.sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0)));
    } catch { toast.error("목표기업을 불러오지 못했습니다."); }
    finally { setLoading(false); }
  };

  const handleSetPrimary = async (id) => {
    setCompanies(prev => prev.map(c => ({ ...c, isPrimary: c.id === id })));
    try {
      const token = localStorage.getItem("token");
      await fetch(`${BASE_URL}/api/companies/${id}/primary`, {
        method: "PUT", headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("주 희망기업이 변경되었습니다!");
    } catch { toast.error("변경에 실패했습니다."); fetchCompanies(); }
  };

  const handleUnsetPrimary = async (id) => {
    setCompanies(prev => prev.map(c => ({ ...c, isPrimary: false })));
    try {
      const token = localStorage.getItem("token");
      await fetch(`${BASE_URL}/api/companies/${id}/primary`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("주 희망기업이 해제되었습니다.");
    } catch { toast.error("해제에 실패했습니다."); fetchCompanies(); }
  };

  const handleDelete = async (id) => {
    setCompanies(prev => prev.filter(c => c.id !== id));
    try {
      const token = localStorage.getItem("token");
      await fetch(`${BASE_URL}/api/companies/${id}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("삭제되었습니다.");
    } catch { toast.error("삭제에 실패했습니다."); fetchCompanies(); }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <p className="text-muted-foreground">불러오는 중...</p>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-6">
      {editTarget && (
        <EditModal company={editTarget} onClose={() => setEditTarget(null)} onSave={fetchCompanies} />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">목표기업</h1>
          <p className="text-sm text-muted-foreground mt-1">지원 예정 기업을 관리하세요</p>
        </div>
        <Link to="/companies/new">
          <Button className="bg-gradient-to-r from-[var(--gradient-start)] via-[var(--gradient-mid)] to-[var(--gradient-end)] text-white hover:opacity-90">
            <Plus className="h-4 w-4 mr-2" />추가하기
          </Button>
        </Link>
      </div>

      {companies.length === 0 ? (
        <Card className="border border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">아직 목표기업이 없어요</p>
            <p className="text-sm text-muted-foreground mb-6">지원하고 싶은 기업을 추가해보세요!</p>
            <Link to="/companies/new">
              <Button className="bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white">
                <Plus className="h-4 w-4 mr-2" />첫 기업 추가하기
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {companies.map((company) => (
            <Card key={company.id} className={`border transition-all ${
              company.isPrimary ? "border-pink-500/30 bg-pink-500/5" : "border-border/50 bg-muted/30"
            }`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg shrink-0 ${company.isPrimary ? "bg-pink-500/10" : "bg-muted"}`}>
                    <Building2 className={`h-5 w-5 ${company.isPrimary ? "text-pink-500" : "text-muted-foreground"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-medium text-foreground">{company.companyName}</p>
                      {company.isPrimary && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-pink-500/15 text-pink-500">주</span>
                      )}
                    </div>
                    {company.industry && <p className="text-xs text-muted-foreground">{company.industry}</p>}
                    {company.memo && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{company.memo}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {company.isPrimary ? (
                      <button onClick={() => handleUnsetPrimary(company.id)}
                        className="p-1.5 rounded-lg hover:bg-yellow-500/10 text-yellow-500 transition-colors"
                        title="주 희망기업 해제">
                        <StarOff className="h-4 w-4" />
                      </button>
                    ) : (
                      <button onClick={() => handleSetPrimary(company.id)}
                        className="p-1.5 rounded-lg hover:bg-yellow-500/10 text-muted-foreground hover:text-yellow-500 transition-colors"
                        title="주 희망기업으로 설정">
                        <Star className="h-4 w-4" />
                      </button>
                    )}
                    <button onClick={() => setEditTarget(company)}
                      className="p-1.5 rounded-lg hover:bg-[var(--gradient-mid)]/10 text-muted-foreground hover:text-[var(--gradient-mid)] transition-colors"
                      title="수정">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(company.id)}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                      title="삭제">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Companies;