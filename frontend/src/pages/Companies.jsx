import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Plus, Star, StarOff, Trash2, Pencil, X, ChevronDown, ChevronUp, FileText, Sparkles, CheckCircle2, Search } from "lucide-react";
import { usePaginatedSearch } from '../hooks/usePaginatedSearch';
import { BASE_URL } from '../config';
import { MagicPaste } from '@/components/MagicPaste';

const industries = ["IT·인터넷", "금융·은행", "제조·화학", "게임", "커머스·유통", "미디어·엔터", "스타트업", "공공·기관", "기타"];

const inputClass = "w-full px-4 py-2.5 rounded-lg border border-input text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--gradient-mid)]/50 focus:border-[var(--gradient-mid)] transition-all bg-muted/30 text-foreground";

// ── 기업 수정 모달 ──
const companySizes = ["대기업", "중견", "중소", "스타트업", "공기업"];

const EditModal = ({ company, onClose, onSave }) => {
  const [form, setForm] = useState({
    companyName: company.companyName,
    industry: company.industry || "",
    memo: company.memo || "",
    companySize: company.companySize || "",
  });
  const [loading, setLoading] = useState(false);

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
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
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
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">기업 규모</label>
            <div className="flex flex-wrap gap-2">
              {companySizes.map((size) => (
                <button key={size} onClick={() => setForm({...form, companySize: size})}
                  className={`px-3 py-1 rounded-lg text-xs border transition-all ${
                    form.companySize === size
                      ? "border-[var(--gradient-mid)] bg-[var(--gradient-mid)]/10 text-[var(--gradient-mid)]"
                      : "border-border text-muted-foreground hover:border-[var(--gradient-mid)]/50"
                  }`}>
                  {size}
                </button>
              ))}
            </div>
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

// ── 채용공고 섹션 ──
const JobPostingsSection = ({ company }) => {
  const [postings, setPostings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showMagicPaste, setShowMagicPaste] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchPostings = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/api/companies/${company.id}/postings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setPostings(await res.json());
    } catch {} finally { setLoading(false); }
  };

  const handleToggle = () => {
    if (!expanded && postings.length === 0) fetchPostings();
    setExpanded(v => !v);
  };

  const handleParsed = async (parsedJson) => {
    setShowMagicPaste(false);
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const parsed = typeof parsedJson === "string" ? JSON.parse(parsedJson) : parsedJson;
      const res = await fetch(`${BASE_URL}/api/companies/${company.id}/postings`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          rawText: JSON.stringify(parsed),
          position: parsed.position || "",
        }),
      });
      if (res.ok) {
        const saved = await res.json();
        setPostings(prev => [saved, ...prev]);
        toast.success("채용공고가 저장되었습니다!");
        if (!expanded) setExpanded(true);
      }
    } catch { toast.error("저장에 실패했어요"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (postingId) => {
    const token = localStorage.getItem("token");
    try {
      await fetch(`${BASE_URL}/api/companies/${company.id}/postings/${postingId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      setPostings(prev => prev.filter(p => p.id !== postingId));
      toast.success("삭제되었습니다.");
    } catch { toast.error("삭제에 실패했어요"); }
  };

  const handleStatusChange = async (postingId, status) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${BASE_URL}/api/companies/${company.id}/postings/${postingId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setPostings(prev => prev.map(p => p.id === postingId ? { ...p, status } : p));
      }
    } catch {}
  };

  const handleSetPrimaryPosting = async (postingId) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${BASE_URL}/api/companies/${company.id}/postings/${postingId}/primary`, {
        method: "PUT", headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setPostings(prev => prev.map(p => ({ ...p, isPrimary: p.id === postingId })));
        toast.success("주 목표 공고로 설정되었습니다!");
      }
    } catch { toast.error("설정에 실패했어요"); }
  };

  const handleUnsetPrimaryPosting = async (postingId) => {
    const token = localStorage.getItem("token");
    try {
      await fetch(`${BASE_URL}/api/companies/${company.id}/postings/primary`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` }
      });
      setPostings(prev => prev.map(p => ({ ...p, isPrimary: false })));
      toast.success("주 목표 공고가 해제되었습니다.");
    } catch { toast.error("해제에 실패했어요"); }
  };

  const statusLabel = { ACTIVE: "진행중", CLOSED: "마감", APPLIED: "지원완료" };
  const statusColor = {
    ACTIVE: "bg-green-500/10 text-green-600 dark:text-green-400",
    CLOSED: "bg-gray-500/10 text-gray-500",
    APPLIED: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  };

  return (
    <div className="mt-3 border-t border-border/50 pt-3">
      {showMagicPaste && (
        <MagicPaste
          isOpen={showMagicPaste}
          onClose={() => setShowMagicPaste(false)}
          onParsed={handleParsed}
        />
      )}

      <div className="flex items-center justify-between">
        <button
          onClick={handleToggle}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <FileText className="h-3.5 w-3.5" />
          채용공고 {postings.length > 0 ? `(${postings.length})` : ""}
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
        <button
          onClick={() => setShowMagicPaste(true)}
          disabled={saving}
          className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-[var(--gradient-mid)]/10 text-[var(--gradient-mid)] hover:bg-[var(--gradient-mid)]/20 transition-colors"
        >
          <Sparkles className="h-3 w-3" />
          {saving ? "저장 중..." : "공고 추가"}
        </button>
      </div>

      {expanded && (
        <div className="mt-2 space-y-2">
          {loading && <p className="text-xs text-muted-foreground py-2">불러오는 중...</p>}
          {!loading && postings.length === 0 && (
            <p className="text-xs text-muted-foreground py-2">등록된 채용공고가 없어요. 공고 추가를 눌러보세요!</p>
          )}
          {postings.map(posting => {
            let parsed = null;
            try { parsed = JSON.parse(posting.parsedData); } catch {}
            return (
              <div key={posting.id} className="rounded-xl border border-border/50 bg-muted/20 p-3 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {posting.position || parsed?.position || "포지션 미입력"}
                    </p>
                    {posting.isPrimary && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-pink-500/15 text-pink-500 shrink-0">주 목표</span>
                    )}
                    {posting.analyzedJobCode && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-500 shrink-0">{posting.analyzedJobCode}</span>
                    )}
                    {parsed?.mainTasks && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{parsed.mainTasks}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => posting.isPrimary ? handleUnsetPrimaryPosting(posting.id) : handleSetPrimaryPosting(posting.id)}
                      className={`p-1 rounded-lg transition-colors ${posting.isPrimary ? "text-pink-500 hover:bg-pink-500/10" : "text-muted-foreground hover:text-pink-500 hover:bg-pink-500/10"}`}
                      title={posting.isPrimary ? "주 목표 공고 해제" : "주 목표 공고로 설정"}
                    >
                      <Star className={`h-3.5 w-3.5 ${posting.isPrimary ? "fill-pink-500" : ""}`} />
                    </button>
                    <select
                      value={posting.status}
                      onChange={(e) => handleStatusChange(posting.id, e.target.value)}
                      className={`text-xs px-2 py-0.5 rounded-full border-0 font-medium cursor-pointer ${statusColor[posting.status] || statusColor.ACTIVE}`}
                    >
                      {Object.entries(statusLabel).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                    <button onClick={() => handleDelete(posting.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                {parsed?.techStack && (
                  <p className="text-xs text-[var(--gradient-mid)]">🛠 {parsed.techStack}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── 메인 ──
const Companies = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState(null);

  const { paged, filtered, query, handleQuery, totalPages, page, Pagination } = usePaginatedSearch(
    companies, 10,
    (c, q) =>
      (c.companyName || "").toLowerCase().includes(q) ||
      (c.industry || "").toLowerCase().includes(q) ||
      (c.companySize || "").toLowerCase().includes(q) ||
      (c.memo || "").toLowerCase().includes(q)
  );

  useEffect(() => { fetchCompanies(); }, []);

  const fetchCompanies = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/api/companies`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error();
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
          <p className="text-sm text-muted-foreground mt-1">총 {companies.length}개{filtered.length !== companies.length ? ` · 검색결과 ${filtered.length}개` : ""}</p>
        </div>
        <Link to="/companies/new">
          <Button className="bg-gradient-to-r from-[var(--gradient-start)] via-[var(--gradient-mid)] to-[var(--gradient-end)] text-white hover:opacity-90">
            <Plus className="h-4 w-4 mr-2" />추가하기
          </Button>
        </Link>
      </div>

      {/* 검색 */}
      {companies.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="기업명, 산업군, 규모로 검색..."
            value={query}
            onChange={e => handleQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-input bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gradient-mid)]/50"
          />
        </div>
      )}

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
        <>
        <div className="space-y-3">
          {paged.map((company) => (
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
                        className="p-1.5 rounded-lg hover:bg-yellow-500/10 text-yellow-500 transition-colors">
                        <StarOff className="h-4 w-4" />
                      </button>
                    ) : (
                      <button onClick={() => handleSetPrimary(company.id)}
                        className="p-1.5 rounded-lg hover:bg-yellow-500/10 text-muted-foreground hover:text-yellow-500 transition-colors">
                        <Star className="h-4 w-4" />
                      </button>
                    )}
                    <button onClick={() => setEditTarget(company)}
                      className="p-1.5 rounded-lg hover:bg-[var(--gradient-mid)]/10 text-muted-foreground hover:text-[var(--gradient-mid)] transition-colors">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(company.id)}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* 채용공고 섹션 */}
                <JobPostingsSection company={company} />
              </CardContent>
            </Card>
          ))}
        </div>
        <Pagination />
        </>
      )}
    </div>
  );
};

export default Companies;