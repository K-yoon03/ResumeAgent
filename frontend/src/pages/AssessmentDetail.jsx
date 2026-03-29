import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trash2, MessageCircle } from "lucide-react";
import { BASE_URL } from '../config';
import { toast } from "sonner";
import jobCodeMap from '../MappingTable/JobCodeMap.json';

const CAP_CODE_MAP = {
  BE_LANG: "백엔드 언어", BE_FRAMEWORK: "백엔드 프레임워크", FE_LANG: "프론트엔드 언어",
  FE_FRAMEWORK: "프론트엔드 프레임워크", DB: "데이터베이스", API_DESIGN: "API 설계",
  CS_FUNDAMENTAL: "CS 기초", PYTHON: "Python", ML_FRAMEWORK: "ML 프레임워크",
  DATA_PROCESSING: "데이터 처리", ML_MODELING: "ML 모델링", MATH_STATS: "수학/통계",
  DATA_VIZ: "데이터 시각화", TROUBLESHOOTING: "트러블슈팅", TEAM_PROJECT: "팀 프로젝트",
  STRATEGY_PLANNING: "전략 기획", FINTECH: "핀테크", ERP_CRM: "ERP/CRM",
  KPI_RESULT: "KPI 성과", DIGITAL_MARKETING: "디지털 마케팅", DATA_DRIVEN: "데이터 기반 의사결정",
  DOCUMENTATION: "문서화",
};

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

const getPercentile = (score) => {
  if (score >= 95) return "상위 3%";
  if (score >= 90) return "상위 5%";
  if (score >= 85) return "상위 10%";
  if (score >= 80) return "상위 15%";
  if (score >= 75) return "상위 25%";
  if (score >= 70) return "상위 35%";
  if (score >= 65) return "상위 50%";
  return "상위 60%";
};

function AssessmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => { fetchAssessment(); }, [id]);

  const fetchAssessment = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${BASE_URL}/api/assessments/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setAssessment(await res.json());
      else navigate("/assessments");
    } catch {
      navigate("/assessments");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${BASE_URL}/api/assessments/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success("역량평가가 삭제되었습니다.");
        navigate("/assessments");
      }
    } catch {
      toast.error("삭제에 실패했습니다.");
    }
  };

  if (loading) return (
    <div className="max-w-3xl mx-auto px-4 py-12 flex items-center justify-center">
      <p className="text-muted-foreground">불러오는 중...</p>
    </div>
  );

  if (!assessment) return null;

  const scoreData = (() => {
    try { return JSON.parse(assessment.scoreData); } catch { return null; }
  })();

  const totalScore = scoreData?.totalScore ?? null;
  const competencyScores = scoreData?.competencyScores || [];
  const isFinal = scoreData?.isFinal ?? false;
  const strengths = scoreData?.strengths || [];
  const improvements = scoreData?.improvements || [];
  const grade = totalScore != null ? getGrade(totalScore) : null;

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}`;
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-6">

      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate("/assessments")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />나의 역량평가
        </button>
        <Button variant="outline" size="sm"
          className="text-destructive border-destructive/40 hover:bg-destructive/10"
          onClick={() => setShowDeleteConfirm(true)}>
          <Trash2 className="h-4 w-4 mr-1" />삭제
        </Button>
      </div>

      {/* 기본 정보 */}
      <Card className="border border-border/50">
        <CardContent className="pt-6 pb-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{formatDate(assessment.createdAt)}</p>
              <p className="text-lg font-bold text-foreground">
                {jobCodeMap[assessment.evaluatedJobCode] || assessment.evaluatedJobCode}
              </p>
              {assessment.isPrimary && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--gradient-mid)]/15 text-[var(--gradient-mid)] font-medium">
                  주 역량평가
                </span>
              )}
            </div>
            {totalScore != null && (
              <div className="text-right space-y-1">
                <p className="text-3xl font-bold text-foreground">{totalScore}점</p>
                <div className="flex items-center gap-2 justify-end">
                  <Badge className={`bg-gradient-to-r ${getGradeColor(grade)} text-white border-0`}>
                    {grade}
                  </Badge>
                  <span className="text-sm text-muted-foreground">{getPercentile(totalScore)}</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 역량별 점수 */}
      {isFinal && competencyScores.length > 0 && (
        <Card className="border border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">역량별 점수</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {competencyScores.map((comp, idx) => {
              const name = CAP_CODE_MAP[comp.capCode] || comp.name || comp.capCode;
              const compGrade = getGrade(comp.score);
              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{Math.round(comp.weight * 100)}%</span>
                      <Badge className={`text-xs bg-gradient-to-r ${getGradeColor(compGrade)} text-white border-0`}>
                        {compGrade}
                      </Badge>
                      <span className="font-bold text-foreground">{comp.score}점</span>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[var(--gradient-start)] via-[var(--gradient-mid)] to-[var(--gradient-end)] transition-all"
                      style={{ width: `${comp.score}%` }}
                    />
                  </div>
                  {comp.evidence && (
                    <p className="text-xs text-muted-foreground">{comp.evidence}</p>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* 강점 / 개선점 */}
      {(strengths.length > 0 || improvements.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {strengths.length > 0 && (
            <Card className="border border-green-500/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-green-600 dark:text-green-400">💪 강점</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {strengths.map((s, i) => (
                    <li key={i} className="text-sm text-foreground flex gap-2">
                      <span className="text-green-500 shrink-0">•</span>{s}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
          {improvements.length > 0 && (
            <Card className="border border-amber-500/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-amber-600 dark:text-amber-400">📈 개선점</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {improvements.map((s, i) => (
                    <li key={i} className="text-sm text-foreground flex gap-2">
                      <span className="text-amber-500 shrink-0">•</span>{s}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* 심층 분석 버튼 */}
      {!isFinal && scoreData?.depthItems?.length > 0 && (
        <Button
          className="w-full bg-gradient-to-r from-[var(--gradient-start)] via-[var(--gradient-mid)] to-[var(--gradient-end)] text-white hover:opacity-90"
          onClick={() => navigate("/depth-interview", {
            state: {
              assessmentId: assessment.id,
              experiences: scoreData.experiences || [],
              depthItems: scoreData.depthItems || [],
              complexItems: scoreData.complexItems || [],
              jobCode: assessment.evaluatedJobCode,
            }
          })}
        >
          <MessageCircle className="mr-2 h-4 w-4" />심층 분석 시작하기
        </Button>
      )}

      {/* 삭제 확인 모달 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm mx-4 bg-card border border-border rounded-2xl shadow-2xl p-8">
            <h3 className="text-lg font-bold mb-2">역량평가를 삭제할까요?</h3>
            <p className="text-sm text-muted-foreground mb-6">삭제하면 복구할 수 없어요.</p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowDeleteConfirm(false)}>취소</Button>
              <Button className="flex-1 bg-destructive text-white hover:bg-destructive/90" onClick={handleDelete}>삭제</Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default AssessmentDetail;