import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { X, Sparkles, FileText, Pencil, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BASE_URL } from '../config';

const inputClass = "w-full px-4 py-2.5 rounded-lg border border-input text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--gradient-mid)]/50 focus:border-[var(--gradient-mid)] transition-all bg-background text-foreground";

/**
 * PostingModal
 *
 * 두 가지 모드:
 * A) 신규 등록 (companyId + parsedJson, postingId 없음)
 *    - MagicPaste 파싱 직후 열림
 *    - 탭: 파싱결과 | 수정
 *    - 저장 시 POST /api/companies/:companyId/postings
 *
 * B) 기존 공고 수정 (companyId + postingId, parsedJson 없음)
 *    - 카드 [수정] 버튼으로 열림
 *    - 탭: 파싱결과 | 수정  +  [조회 페이지로] 링크
 *    - 저장 시 PUT /api/companies/:companyId/postings/:postingId
 */
const PostingModal = ({ companyId, postingId = null, parsedJson = null, onClose, onSaved }) => {
  const navigate = useNavigate();
  const isNew = !postingId;

  // parsedJson: MagicPaste 결과 객체 (신규) 또는 기존 posting 객체
  const initial = parsedJson || {};
  const [tab, setTab] = useState(isNew ? "parsed" : "edit");
  const [form, setForm] = useState({
    position: initial.position || "",
    mainTasks: initial.mainTasks || "",
    requirements: initial.requirements || "",
    preferred: initial.preferred || "",
    techStack: initial.techStack || "",
    workPlace: initial.workPlace || "",
    employmentType: initial.employmentType || "",
  });
  const [saving, setSaving] = useState(false);

  const parsedFields = [
    { key: "position", label: "포지션" },
    { key: "mainTasks", label: "주요업무" },
    { key: "requirements", label: "자격요건" },
    { key: "preferred", label: "우대사항" },
    { key: "techStack", label: "기술스택" },
    { key: "workPlace", label: "근무지" },
    { key: "employmentType", label: "고용형태" },
  ];

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const parsedData = JSON.stringify(form);

      if (isNew) {
        const res = await fetch(`${BASE_URL}/api/companies/${companyId}/postings`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ 
            position: form.position, 
            rawText: parsedData,
            parsedData: parsedData  // 추가
          }),
        });
        if (!res.ok) throw new Error("저장 실패");
        const saved = await res.json();
        toast.success("공고가 저장되었습니다!");
        onSaved?.(saved);
      } else {
        const res = await fetch(`${BASE_URL}/api/companies/${companyId}/postings/${postingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ position: form.position, parsedData }),
        });
        if (!res.ok) throw new Error("수정 실패");
        const updated = await res.json();
        toast.success("공고가 수정되었습니다!");
        onSaved?.(updated);
      }
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-lg mx-4 bg-card border border-border rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--gradient-mid)]" />
            <h3 className="text-base font-semibold">
              {isNew ? "공고 확인 및 저장" : "공고 수정"}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {!isNew && (
              <button
                onClick={() => navigate(`/companies/${companyId}/postings/${postingId}`)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-[var(--gradient-mid)] transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                조회 페이지
              </button>
            )}
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* 탭 */}
        <div className="flex border-b border-border shrink-0">
          <button
            onClick={() => setTab("parsed")}
            className={`flex items-center gap-1.5 px-5 py-2.5 text-sm border-b-2 transition-colors ${
              tab === "parsed"
                ? "border-[var(--gradient-mid)] text-[var(--gradient-mid)]"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            파싱 결과
          </button>
          <button
            onClick={() => setTab("edit")}
            className={`flex items-center gap-1.5 px-5 py-2.5 text-sm border-b-2 transition-colors ${
              tab === "edit"
                ? "border-[var(--gradient-mid)] text-[var(--gradient-mid)]"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Pencil className="h-3.5 w-3.5" />
            수정
          </button>
        </div>

        {/* 본문 */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          {tab === "parsed" ? (
            <div className="space-y-3">
              {parsedFields.map(({ key, label }) =>
                form[key] ? (
                  <div key={key}>
                    <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap bg-muted/30 rounded-lg px-3 py-2">
                      {form[key]}
                    </p>
                  </div>
                ) : null
              )}
              {parsedFields.every(({ key }) => !form[key]) && (
                <p className="text-sm text-muted-foreground text-center py-8">파싱된 내용이 없어요.</p>
              )}
              <div className="pt-2">
                <button
                  onClick={() => setTab("edit")}
                  className="text-xs text-[var(--gradient-mid)] hover:opacity-80 transition-opacity"
                >
                  내용 수정하기 →
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">포지션</label>
                <input type="text" value={form.position}
                  onChange={e => setForm({ ...form, position: e.target.value })}
                  placeholder="예: 백엔드 개발자" className={`mt-1 ${inputClass}`} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">주요업무</label>
                <textarea value={form.mainTasks}
                  onChange={e => setForm({ ...form, mainTasks: e.target.value })}
                  rows={3} placeholder="주요 업무 내용" className={`mt-1 ${inputClass} resize-none`} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">자격요건</label>
                <textarea value={form.requirements}
                  onChange={e => setForm({ ...form, requirements: e.target.value })}
                  rows={3} placeholder="필수 자격요건" className={`mt-1 ${inputClass} resize-none`} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">우대사항</label>
                <textarea value={form.preferred}
                  onChange={e => setForm({ ...form, preferred: e.target.value })}
                  rows={2} placeholder="우대 사항" className={`mt-1 ${inputClass} resize-none`} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">기술스택</label>
                  <input type="text" value={form.techStack}
                    onChange={e => setForm({ ...form, techStack: e.target.value })}
                    placeholder="Spring Boot, React..." className={`mt-1 ${inputClass}`} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">고용형태</label>
                  <input type="text" value={form.employmentType}
                    onChange={e => setForm({ ...form, employmentType: e.target.value })}
                    placeholder="정규직, 인턴..." className={`mt-1 ${inputClass}`} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="flex gap-2 px-6 py-4 border-t border-border shrink-0">
          <Button variant="outline" className="flex-1" onClick={onClose}>취소</Button>
          <Button
            className="flex-1 bg-gradient-to-r from-[var(--gradient-start)] via-[var(--gradient-mid)] to-[var(--gradient-end)] text-white hover:opacity-90"
            onClick={handleSave} disabled={saving}
          >
            {saving ? "저장 중..." : isNew ? "저장" : "수정 완료"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PostingModal;