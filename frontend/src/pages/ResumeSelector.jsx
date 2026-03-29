import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, Clock, Sparkles, MessageCircle, ChevronRight } from "lucide-react";
import { BASE_URL } from '../config';
import { toast } from "sonner";
import jobCodeMap from '../MappingTable/JobCodeMap.json';

const getGrade = (score) => {
  if (score >= 95) return "S";
  if (score >= 90) return "A+";
  if (score >= 85) return "A";
  if (score >= 80) return "A-";
  if (score >= 75) return "B+";
  if (score >= 70) return "B";
  if (score >= 65) return "B-";
  if (score >= 60) return "C+";
  if (score >= 55) return "C";
  return "C-";
};

const getGradeColor = (grade) => {
  if (grade === "S") return "from-yellow-400 to-yellow-600";
  if (grade?.startsWith("A")) return "from-green-400 to-green-600";
  if (grade?.startsWith("B")) return "from-blue-400 to-blue-600";
  return "from-gray-400 to-gray-600";
};

function AssessmentCard({ assessment, depthSummary }) {
  const navigate = useNavigate();
  const sd = (() => { try { return JSON.parse(assessment.scoreData); } catch { return null; } })();
  const totalScore = sd?.totalScore ?? null;
  const grade = totalScore != null ? getGrade(totalScore) : null;

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}`;
  };

  return (
    <Card
      className={`border transition-all hover:border-[var(--gradient-mid)]/50 hover:shadow-md cursor-pointer ${
        assessment.isPrimary ? "border-[var(--gradient-mid)]/40 bg-[var(--gradient-mid)]/5" : "border-border/50"
      }`}
      onClick={() => navigate("/resume-writer", { state: { assessmentId: assessment.id } })}
    >
      <CardContent className="pt-5 pb-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-3">

            {/* 상단: 주역량 뱃지 + 날짜 */}
            <div className="flex items-center gap-2 flex-wrap">
              {assessment.isPrimary && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--gradient-mid)]/15 text-[var(--gradient-mid)] font-medium">
                  주 역량평가
                </span>
              )}
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />{formatDate(assessment.createdAt)}
              </span>
            </div>

            {/* 직무 + 점수 */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-semibold text-foreground">
                {jobCodeMap[assessment.evaluatedJobCode] || assessment.evaluatedJobCode}
              </span>
              {totalScore != null && grade && (
                <>
                  <Badge className={`bg-gradient-to-r ${getGradeColor(grade)} text-white border-0 text-xs`}>
                    {grade}
                  </Badge>
                  <span className="text-lg font-bold text-foreground">{totalScore}점</span>
                </>
              )}
            </div>

            {/* DepthInterview 항목 요약 */}
            {depthSummary && depthSummary.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                  <MessageCircle className="h-3 w-3" />심층 인터뷰 완료 항목
                </p>
                <div className="space-y-1">
                  {depthSummary.map((item, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <ChevronRight className="h-3 w-3 text-[var(--gradient-mid)] shrink-0 mt-0.5" />
                      <div>
                        <span className="font-medium text-foreground">{item.itemName}</span>
                        <span className="text-muted-foreground ml-1">— {item.firstQuestion}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* 오른쪽 버튼 */}
          <Button
            size="sm"
            className="bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white hover:opacity-90 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              navigate("/resume-writer", { state: { assessmentId: assessment.id } });
            }}
          >
            <FileText className="mr-1.5 h-3.5 w-3.5" />자소서 작성
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ResumeSelector() {
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState([]);
  const [depthSummaries, setDepthSummaries] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAssessments(); }, []);

  const fetchAssessments = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${BASE_URL}/api/assessments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const finalOnly = data.filter(a => {
          try { return JSON.parse(a.scoreData).isFinal === true; } catch { return false; }
        });
        setAssessments(finalOnly);
        // 각 assessment의 DepthAnswer 요약 병렬 로드
        const summaries = await Promise.all(
          finalOnly.map(a =>
            fetch(`${BASE_URL}/api/assessments/${a.id}/depth-answers`, {
              headers: { Authorization: `Bearer ${token}` }
            }).then(r => r.ok ? r.json() : []).catch(() => [])
          )
        );
        const summaryMap = {};
        finalOnly.forEach((a, i) => { summaryMap[a.id] = summaries[i]; });
        setDepthSummaries(summaryMap);
      }
    } catch {
      toast.error("불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="max-w-3xl mx-auto px-4 py-12 flex items-center justify-center">
      <p className="text-muted-foreground">불러오는 중...</p>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-8">

      <div className="space-y-2">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-[var(--gradient-start)] via-[var(--gradient-mid)] to-[var(--gradient-end)] bg-clip-text text-transparent">
          자소서 작성
        </h1>
        <p className="text-muted-foreground text-sm">
          심층 분석이 완료된 역량평가를 선택해 자소서를 작성하세요
        </p>
      </div>

      {assessments.length === 0 ? (
        <Card className="border border-border/50">
          <CardContent className="pt-12 pb-12 flex flex-col items-center justify-center space-y-4 text-center">
            <div className="inline-flex items-center justify-center p-4 rounded-full bg-[var(--gradient-mid)]/10">
              <MessageCircle className="h-8 w-8 text-[var(--gradient-mid)]" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">심층 분석이 완료된 역량평가가 없어요</h3>
              <p className="text-sm text-muted-foreground">역량평가 후 심층 분석까지 완료하면 자소서를 작성할 수 있어요</p>
            </div>
            <Button
              className="bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white hover:opacity-90"
              onClick={() => navigate("/analyze/new")}
            >
              <Sparkles className="mr-2 h-4 w-4" />역량평가 시작하기
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {assessments.map((assessment) => (
            <AssessmentCard
              key={assessment.id}
              assessment={assessment}
              depthSummary={depthSummaries[assessment.id] || []}
            />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <button
          onClick={() => navigate("/my-assessments")}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          모든 역량평가 보기 →
        </button>
        <Button variant="outline" size="sm" onClick={() => navigate("/analyze/new")}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />새 역량평가
        </Button>
      </div>

    </div>
  );
}

export default ResumeSelector;