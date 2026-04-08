import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Pencil, Save, X, Sparkles, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BASE_URL } from '../config';

const inputClass = "w-full px-4 py-2.5 rounded-lg border border-input text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--gradient-mid)]/50 focus:border-[var(--gradient-mid)] transition-all bg-background text-foreground";

const parsedFields = [
  { key: "position", label: "포지션" },
  { key: "mainTasks", label: "주요업무" },
  { key: "requirements", label: "자격요건" },
  { key: "preferred", label: "우대사항" },
  { key: "techStack", label: "기술스택" },
  { key: "workPlace", label: "근무지" },
  { key: "employmentType", label: "고용형태" },
];

const PostingDetail = () => {
  const { companyId, postingId } = useParams();
  const navigate = useNavigate();

  const [posting, setPosting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  // JD 분석 관련
  const [analyzing, setAnalyzing] = useState(false);
  const [gapResult, setGapResult] = useState(null);
  const [rawExpanded, setRawExpanded] = useState(false);

  useEffect(() => { fetchPosting(); }, []);

  const fetchPosting = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/api/companies/${companyId}/postings/${postingId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("공고를 불러오지 못했습니다.");
      const data = await res.json();
      setPosting(data);
      // parsedData 있으면 파싱해서 form 초기화
      let parsed = {};
      try { parsed = JSON.parse(data.parsedData || data.rawText || "{}"); } catch {}
      setForm({
        position: data.position || parsed.position || "",
        mainTasks: parsed.mainTasks || "",
        requirements: parsed.requirements || "",
        preferred: parsed.preferred || "",
        techStack: parsed.techStack || "",
        workPlace: parsed.workPlace || "",
        employmentType: parsed.employmentType || "",
      });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/api/companies/${companyId}/postings/${postingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ position: form.position, parsedData: JSON.stringify(form) }),
      });
      if (!res.ok) throw new Error("수정 실패");
      const updated = await res.json();
      setPosting(updated);
      setEditMode(false);
      toast.success("수정되었습니다!");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAnalyze = async () => {
    const token = localStorage.getItem("token");
    setAnalyzing(true);
    try {
      const jdText = posting.rawText || posting.parsedData || "";
      const analyzeRes = await fetch(`${BASE_URL}/api/jd/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ companyJobPostingId: Number(postingId), jdText }),
      });
      if (!analyzeRes.ok) throw new Error("JD 분석 실패");
      const analyzeData = await analyzeRes.json();
      setPosting(prev => ({ ...prev, analyzedJobCode: analyzeData.jobCode }));

      const assessmentRes = await fetch(`${BASE_URL}/api/assessments/latest`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const assessmentId = assessmentRes.ok ? (await assessmentRes.json()).id : null;

      if (!assessmentId) {
        toast.success("JD 분석 완료! (역량 평가 후 Gap 분석이 가능해요)");
        return;
      }

      const gapRes = await fetch(`${BASE_URL}/api/jd/gap`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ companyJobPostingId: Number(postingId), assessmentId }),
      });
      if (!gapRes.ok) throw new Error("Gap 분석 실패");
      setGapResult(await gapRes.json());
      toast.success("JD 분석이 완료되었어요!");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <p className="text-muted-foreground">불러오는 중...</p>
    </div>
  );

  if (!posting) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <p className="text-muted-foreground">공고를 찾을 수 없어요.</p>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-5 p-6">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(`/companies`)}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">{posting.companyName}</p>
          <h1 className="text-xl font-bold text-foreground">
            {posting.position || "포지션 미입력"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {posting.analyzedJobCode && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500">
              {posting.analyzedJobCode}
            </span>
          )}
          {editMode ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setEditMode(false)}>
                <X className="h-3.5 w-3.5 mr-1" />취소
              </Button>
              <Button size="sm"
                className="bg-gradient-to-r from-[var(--gradient-start)] via-[var(--gradient-mid)] to-[var(--gradient-end)] text-white hover:opacity-90"
                onClick={handleSave} disabled={saving}>
                <Save className="h-3.5 w-3.5 mr-1" />
                {saving ? "저장 중..." : "저장"}
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
              <Pencil className="h-3.5 w-3.5 mr-1" />수정
            </Button>
          )}
        </div>
      </div>

      {/* 공고 내용 */}
      <Card className="border border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">공고 내용</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {editMode ? (
            <div className="space-y-3">
              {parsedFields.map(({ key, label }) => (
                <div key={key}>
                  <label className="text-xs font-medium text-muted-foreground">{label}</label>
                  {["mainTasks", "requirements", "preferred"].includes(key) ? (
                    <textarea value={form[key]}
                      onChange={e => setForm({ ...form, [key]: e.target.value })}
                      rows={3} className={`mt-1 ${inputClass} resize-none`} />
                  ) : (
                    <input type="text" value={form[key]}
                      onChange={e => setForm({ ...form, [key]: e.target.value })}
                      className={`mt-1 ${inputClass}`} />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {parsedFields.map(({ key, label }) =>
                form[key] ? (
                  <div key={key}>
                    <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{form[key]}</p>
                  </div>
                ) : null
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 원문 (접기/펼치기) */}
      {posting.rawText && (
        <Card className="border border-border/50">
          <CardContent className="pt-4">
            <button
              onClick={() => setRawExpanded(v => !v)}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
            >
              <FileTextIcon className="h-4 w-4" />
              원문 보기
              {rawExpanded ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
            </button>
            {rawExpanded && (
              <pre className="mt-3 text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap bg-muted/30 rounded-lg p-3 max-h-64 overflow-y-auto">
                {(() => {
                  try { return JSON.stringify(JSON.parse(posting.rawText), null, 2); }
                  catch { return posting.rawText; }
                })()}
              </pre>
            )}
          </CardContent>
        </Card>
      )}

      {/* JD 분석 */}
      <Card className="border border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">JD 분석</CardTitle>
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-[var(--gradient-mid)]/10 text-[var(--gradient-mid)] hover:bg-[var(--gradient-mid)]/20 transition-colors disabled:opacity-50"
            >
              <Sparkles className="h-3 w-3" />
              {analyzing ? "분석 중..." : gapResult ? "재분석" : "분석하기"}
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {!gapResult && !analyzing && (
            <p className="text-sm text-muted-foreground">분석하기를 눌러 역량 Gap을 확인해보세요.</p>
          )}
          {analyzing && (
            <p className="text-sm text-muted-foreground animate-pulse">분석 중...</p>
          )}
          {gapResult && (
            <div className="space-y-4">
              {/* 적합도 도표 */}
              {gapResult.fitLevel && (() => {
                const levels = [
                  { key: "OVER_UP",   label: "과도 상향", bg: "#0C447C", color: "#B5D4F4" },
                  { key: "UP",        label: "상향",     bg: "#378ADD", color: "#E6F1FB" },
                  { key: "NORMAL",    label: "소신",     bg: "#0F6E56", color: "#9FE1CB" },
                  { key: "FIT",       label: "적합",     bg: "#3B6D11", color: "#C0DD97" },
                  { key: "DOWN",      label: "하향",     bg: "#D85A30", color: "#FAECE7" },
                  { key: "OVER_DOWN", label: "과도 하향", bg: "#A32D2D", color: "#F7C1C1" },
                ];
                const fitDesc = {
                  OVER_UP:   "역량 gap이 커요. 장기적인 준비가 필요해요.",
                  UP:        "도전적인 지원이에요. 부족한 역량을 집중 보완해보세요.",
                  NORMAL:    "약간의 준비가 필요하지만 충분히 도전할 수 있어요.",
                  FIT:       "현재 역량과 잘 맞는 공고예요.",
                  DOWN:      "현재 역량보다 낮은 수준의 공고예요.",
                  OVER_DOWN: "역량 대비 요구 수준이 많이 낮아요.",
                }[gapResult.fitLevel] || "";
                return (
                  <div className="space-y-2">
                    <div style={{ display: "flex", gap: "3px" }}>
                      {levels.map(({ key, label, bg, color }) => {
                        const isActive = key === gapResult.fitLevel;
                        return (
                          <div key={key} style={{
                            flex: 1, height: "30px", borderRadius: "4px",
                            background: bg, color,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: "10px", fontWeight: 500,
                            opacity: isActive ? 1 : 0.35,
                            outline: isActive ? `2px solid ${color}` : "none",
                            outlineOffset: "1px",
                          }}>
                            {label}
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground">{fitDesc}</p>
                    <p style={{ fontSize: "10px", color: "var(--color-text-tertiary)", borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: "6px" }}>
                      역량 데이터 기반 추정이며, 실제 합격 가능성과 다를 수 있습니다.
                    </p>
                  </div>
                );
              })()}
              {gapResult.gaps?.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">부족한 역량</p>
                  <div className="space-y-1.5">
                    {gapResult.gaps.map((gap, i) => {
                      const isMissing = gap.status === "MISSING" || gap.userScore === 0;
                      return (
                        <div key={i} className="flex items-center justify-between text-sm py-1 border-b border-border/30 last:border-0">
                          <span className="text-foreground">{gap.capabilityName || gap.capCode}</span>
                          <span className={`text-xs shrink-0 ml-2 px-1.5 py-0.5 rounded-full font-medium ${
                            isMissing
                              ? "text-gray-400 bg-gray-500/10"
                              : gap.status === "CLOSE"
                              ? "text-yellow-500 bg-yellow-500/10"
                              : "text-red-500 bg-red-500/10"
                          }`}>
                            {isMissing ? "미보유" : gap.status === "CLOSE" ? "근접" : "부족"}
                            {" · "}{isMissing ? "미보유" : `현재 ${gap.userLevel ?? "없음"}`} → 필요 {gap.requiredLevel}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {gapResult.gaps?.length === 0 && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  모든 역량 요건을 충족하고 있어요!
                </div>
              )}
              {gapResult.roadmap && (
                <div>
                  <p className="text-sm font-medium mb-2">로드맵</p>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {gapResult.roadmap}
                  </p>
                </div>
              )}

              {/* 경력/학력 플래그 */}
              {(gapResult.experienceFlag || gapResult.educationFlag) && (
                <div className="pt-2 border-t border-border/50 space-y-1.5">
                  {gapResult.experienceFlag === "WARN" && (
                    <div className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg bg-orange-500/10 text-orange-500">
                      <span className="font-medium shrink-0">경력 주의</span>
                      <span className="text-orange-500/80">경력직 요구 공고입니다. 관련 경험이 없다면 지원 전 확인이 필요해요.</span>
                    </div>
                  )}
                  {gapResult.experienceFlag === "CHECK" && (
                    <div className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg bg-yellow-500/10 text-yellow-600">
                      <span className="font-medium shrink-0">경력 확인</span>
                      <span className="text-yellow-600/80">경력직 요구 공고예요. 이에 준하는 경험을 잘 어필해보세요.</span>
                    </div>
                  )}
                  {gapResult.educationFlag === "WARN" && (
                    <div className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg bg-red-500/10 text-red-500">
                      <span className="font-medium shrink-0">학력 주의</span>
                      <span className="text-red-500/80">이 공고의 학력 요건을 충족하지 못할 수 있어요.</span>
                    </div>
                  )}
                  {gapResult.educationFlag === "CHECK" && (
                    <div className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg bg-yellow-500/10 text-yellow-600">
                      <span className="font-medium shrink-0">학력 확인</span>
                      <span className="text-yellow-600/80">요구 학력보다 한 단계 낮아요. 지원 전 확인해보세요.</span>
                    </div>
                  )}
                  {gapResult.educationFlag === "UNKNOWN" && (
                    <div className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg bg-muted text-muted-foreground">
                      <span className="font-medium shrink-0">학력 미확인</span>
                      <span>역량평가 입력에 학력 정보를 추가하면 더 정확한 분석이 가능해요.</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// 인라인 아이콘 (lucide FileText를 직접 쓰면 import 충돌 방지)
const FileTextIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>
);

export default PostingDetail;