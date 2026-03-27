import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Plus, Clock, Star } from "lucide-react";
import { BASE_URL } from '../config';
import { toast } from "sonner";

function MyAssessments() {
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAssessments(); }, []);

  const fetchAssessments = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${BASE_URL}/api/assessments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setAssessments(await res.json());
    } catch {}
    finally { setLoading(false); }
  };

  const handleSetPrimary = async (id) => {
    const token = localStorage.getItem("token");
    try {
      await fetch(`${BASE_URL}/api/assessments/${id}/primary`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("주 역량평가로 설정되었습니다!");
      fetchAssessments();
    } catch { toast.error("변경에 실패했습니다."); }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
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

  const getTotalScore = (scoreDataStr) => {
    try {
      const sd = JSON.parse(scoreDataStr);
      return sd.totalScore ?? null;
    } catch { return null; }
  };

  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 py-12 flex items-center justify-center">
      <p className="text-muted-foreground">불러오는 중...</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">

      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[var(--gradient-start)] via-[var(--gradient-mid)] to-[var(--gradient-end)] bg-clip-text text-transparent">
            나의 역량평가
          </h1>
          <p className="text-muted-foreground text-sm">저장된 역량평가 결과를 확인하세요</p>
        </div>
        <Button
          className="bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white hover:opacity-90"
          onClick={() => navigate("/analyze/new")}
        >
          <Plus className="mr-2 h-4 w-4" />새 역량평가
        </Button>
      </div>

      {/* 목록 없을 때 */}
      {assessments.length === 0 && (
        <Card className="border border-border/50">
          <CardContent className="pt-12 pb-12 flex flex-col items-center justify-center space-y-4 text-center">
            <div className="inline-flex items-center justify-center p-4 rounded-full bg-[var(--gradient-mid)]/10">
              <Sparkles className="h-8 w-8 text-[var(--gradient-mid)]" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">저장된 역량평가가 없습니다</h3>
              <p className="text-sm text-muted-foreground">역량평가를 시작하고 결과를 저장해보세요</p>
            </div>
            <Button
              className="bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white hover:opacity-90"
              onClick={() => navigate("/analyze/new")}
            >
              <Sparkles className="mr-2 h-4 w-4" />역량평가 시작하기
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 역량평가 목록 */}
      <div className="space-y-4">
        {assessments.map((assessment) => {
          const totalScore = getTotalScore(assessment.scoreData);
          const grade = totalScore != null ? getGrade(totalScore) : null;
          const percentile = totalScore != null ? getPercentile(totalScore) : null;
          const vector = assessment.capabilityVector || {};
          const topCodes = Object.entries(vector)
            .filter(([_, v]) => v > 0)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5);

          return (
            <Card key={assessment.id} className={`border transition-colors ${
              assessment.isPrimary
                ? "border-[var(--gradient-mid)]/50 bg-[var(--gradient-mid)]/5"
                : "border-border/50 hover:border-[var(--gradient-mid)]/30"
            }`}>
              <CardContent className="pt-5 pb-5">
                <div className="flex items-start justify-between gap-4">

                  {/* 왼쪽 */}
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

                    {/* 점수 / 등급 / 퍼센테이지 */}
                    {totalScore != null ? (
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-2xl font-bold text-foreground">{totalScore}점</span>
                        <span className="text-sm font-semibold px-2.5 py-1 rounded-lg bg-[var(--gradient-mid)]/10 text-[var(--gradient-mid)]">
                          {grade}
                        </span>
                        <span className="text-sm text-muted-foreground">{percentile}</span>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">점수 정보 없음</p>
                    )}

                    {/* 직무 코드 */}
                    <p className="text-xs text-muted-foreground">
                      직무: <span className="font-medium text-foreground">{assessment.evaluatedJobCode}</span>
                    </p>

                    {/* 역량 코드 */}
                    {topCodes.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {topCodes.map(([code, score]) => (
                          <span key={code}
                            className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500 font-medium">
                            {code}: {Math.round(score * 100)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 오른쪽 버튼 */}
                  <div className="flex flex-col gap-2 shrink-0">
                    {!assessment.isPrimary && (
                      <Button size="sm" variant="outline"
                        onClick={() => handleSetPrimary(assessment.id)}>
                        <Star className="mr-1.5 h-3.5 w-3.5" />주 역량 설정
                      </Button>
                    )}
                    <Button size="sm" variant="outline"
                      onClick={() => {
                        const sd = JSON.parse(assessment.scoreData);
                        navigate("/depth-interview", {
                          state: {
                            assessmentId: assessment.id,
                            experiences: sd.experiences || [],
                            depthItems: sd.depthItems || [],
                            complexItems: sd.complexItems || [],
                            jobCode: assessment.evaluatedJobCode,
                          }
                        });
                      }}>
                      심층 분석
                    </Button>
                    <Button size="sm" variant="outline"
                      onClick={() => navigate(`/assessments/${assessment.id}`)}>
                      자세히 보기
                    </Button>
                  </div>

                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default MyAssessments;