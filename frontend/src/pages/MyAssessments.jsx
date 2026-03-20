import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Plus, TrendingUp, FileText, MessageSquare, Clock, User, GraduationCap, ChevronRight } from "lucide-react";
import { BASE_URL } from '../config';

function MyAssessments() {
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssessments();
  }, []);

  const fetchAssessments = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${BASE_URL}/api/assessments`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAssessments(data);
      }
    } catch {
      // API 미구현 시 빈 배열 유지
    } finally {
      setLoading(false);
    }
  };

  const parseScoreData = (scoreDataStr) => {
    try {
      return JSON.parse(scoreDataStr);
    } catch {
      return null;
    }
  };

  const parseExperience = (experience) => {
    const result = {};
    const lines = experience?.split("\n") || [];
    lines.forEach(line => {
      if (line.startsWith("나이:")) result.age = line.replace("나이:", "").trim();
      if (line.startsWith("학력:")) result.education = line.replace("학력:", "").trim();
    });
    return result;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
  };

  const getScoreLabel = (score) => {
    if (score >= 90) return { label: "매우 우수", color: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" };
    if (score >= 70) return { label: "우수", color: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" };
    if (score >= 50) return { label: "보통", color: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300" };
    return { label: "부족", color: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300" };
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 flex items-center justify-center">
        <p className="text-muted-foreground">불러오는 중...</p>
      </div>
    );
  }

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
          <Plus className="mr-2 h-4 w-4" />
          새 역량평가
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
              <Sparkles className="mr-2 h-4 w-4" />
              역량평가 시작하기
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 역량평가 목록 */}
      <div className="space-y-4">
        {assessments.map((assessment) => {
          const scoreData = parseScoreData(assessment.scoreData);
          const exp = parseExperience(assessment.experience);
          const scoreLabel = scoreData ? getScoreLabel(scoreData.overall) : null;
          const hasResume = assessment.resumes && assessment.resumes.length > 0;

          return (
            <Card key={assessment.id} className="border border-border/50 hover:border-[var(--gradient-mid)]/30 transition-colors">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-start justify-between gap-4">

                  {/* 왼쪽 정보 */}
                  <div className="flex-1 space-y-3">
                    {/* 점수 + 날짜 */}
                    <div className="flex items-center gap-3 flex-wrap">
                      {scoreData && (
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-[var(--gradient-mid)]" />
                          <span className="text-lg font-bold text-foreground">{scoreData.overall}점</span>
                          <Badge className={scoreLabel.color}>{scoreLabel.label}</Badge>
                        </div>
                      )}
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(assessment.createdAt)}
                      </span>
                    </div>

                    {/* 나이 / 학력 */}
                    <div className="flex items-center gap-4 flex-wrap">
                      {exp.age && (
                        <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5" />
                          나이: {exp.age}
                        </span>
                      )}
                      {exp.education && (
                        <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                          <GraduationCap className="h-3.5 w-3.5" />
                          학력: {exp.education.slice(0, 20)}{exp.education.length > 20 ? "..." : ""}
                        </span>
                      )}
                    </div>

                    {/* 연관 자소서 */}
                    <div className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">연관 자소서:</span>
                      {hasResume ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          {assessment.resumes.map((resume, idx) => (
                            <button
                              key={idx}
                              onClick={() => navigate("/resume-writer", {
                                state: {
                                  experience: assessment.experience,
                                  analysis: assessment.analysis,
                                  scoreData,
                                  savedResume: resume
                                }
                              })}
                              className="text-sm text-[var(--gradient-mid)] hover:underline flex items-center gap-0.5"
                            >
                              {resume.title || `자소서 ${idx + 1}`}
                              <ChevronRight className="h-3 w-3" />
                            </button>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground italic">생성된 자소서가 없음</span>
                      )}
                    </div>
                  </div>

                  {/* 오른쪽 버튼 */}
                  <div className="flex flex-col gap-2 shrink-0">
                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white hover:opacity-90"
                      onClick={() => navigate("/resume-writer", {
                        state: {
                          experience: assessment.experience,
                          analysis: assessment.analysis,
                          scoreData,
                        }
                      })}
                    >
                      <FileText className="mr-1.5 h-3.5 w-3.5" />
                      자소서 작성
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!hasResume}
                      onClick={() => {
                        if (hasResume) {
                          const resume = assessment.resumes[0];
                          navigate("/interview", {
                            state: {
                              resume: resume.content,
                              jobPosting: resume.jobPosting,
                              analysis: assessment.analysis
                            }
                          });
                        }
                      }}
                    >
                      <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                      면접 시작
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