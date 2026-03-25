import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  LayoutDashboard, 
  Briefcase,
  TrendingUp, 
  Building2,
  ArrowRight,
  Edit,
  Sparkles,
  Award,
  ThumbsUp,
  AlertCircle,
  Lock
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import axios from "axios";

// 🔥 등급 계산 함수들
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
  if (grade === "S") return "from-yellow-400 to-orange-500";
  if (grade.startsWith("A")) return "from-green-400 to-emerald-500";
  if (grade.startsWith("B")) return "from-blue-400 to-cyan-500";
  if (grade.startsWith("C")) return "from-purple-400 to-pink-500";
  return "from-gray-400 to-gray-500";
};

const getAverageGrade = (competencyScores) => {
  if (!competencyScores || competencyScores.length === 0) return "N/A";
  const avg = competencyScores.reduce((sum, c) => sum + c.score, 0) / competencyScores.length;
  return getGrade(avg);
};

const getAverageScore = (competencyScores) => {
  if (!competencyScores || competencyScores.length === 0) return 0;
  return Math.round(competencyScores.reduce((sum, c) => sum + c.score, 0) / competencyScores.length);
};

export function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const token = localStorage.getItem("token");
      
      if (!token) {
        setError("로그인이 필요합니다.");
        setLoading(false);
        return;
      }
      
      const response = await axios.get("http://localhost:8080/api/dashboard", {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log("✅ Dashboard data:", response.data);
      setData(response.data);
    } catch (error) {
      console.error("❌ Failed to fetch dashboard:", error);
      setError(error.response?.data?.message || "데이터를 불러올 수 없습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Sparkles className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-lg font-semibold mb-2">오류가 발생했습니다</p>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Link to="/login">
            <Button>로그인하기</Button>
          </Link>
        </div>
      </div>
    );
  }

  const userData = data?.user || { nickname: "사용자", email: "" };
  const desiredJob = data?.desiredJob;
  const primaryAssessment = data?.primaryAssessment;
  const primaryCompany = data?.primaryCompany;
  const companyList = data?.companyList || [];
  const credits = data?.credits || { remaining: 0, daily: 50, used: 0 };

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center p-3 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500">
          <LayoutDashboard className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
          나의 커리어 대시보드
        </h1>
        <p className="text-lg text-muted-foreground">
          안녕하세요, {userData.nickname}님!
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* 희망 직무 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              희망 직무
            </CardTitle>
          </CardHeader>
          <CardContent>
            {desiredJob ? (
              <>
                <div className="text-2xl font-bold mb-1">
                  {desiredJob.jobName}
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  {desiredJob.jobCode}
                  {desiredJob.isTemporary && (
                    <Badge variant="outline" className="ml-2">범용</Badge>
                  )}
                </p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    오늘 변경: {3 - desiredJob.remainingChanges}/3회
                  </span>
                  <Link to="/my-page">
                    <Button size="sm" variant="outline">
                      <Edit className="h-3 w-3 mr-1" />
                      변경
                    </Button>
                  </Link>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-3">직무를 설정해주세요</p>
                <Link to="/my-page">
                  <Button size="sm">직무 설정</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 평균 역량 등급 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Award className="h-4 w-4" />
              평균 역량 등급
            </CardTitle>
          </CardHeader>
          <CardContent>
            {primaryAssessment ? (
              <>
                <div className={`inline-flex items-center justify-center w-24 h-24 rounded-xl bg-gradient-to-br ${getGradeColor(getAverageGrade(primaryAssessment.competencyScores))} text-white text-4xl font-bold mb-2`}>
                  {getAverageGrade(primaryAssessment.competencyScores)}
                </div>
                <p className="text-2xl font-bold">
                  평균 {getAverageScore(primaryAssessment.competencyScores)}점
                </p>
                <p className="text-sm text-muted-foreground">
                  {primaryAssessment.jobName}
                </p>
              </>
            ) : (
              <div className="relative">
                <div className="blur-sm">
                  <div className="inline-flex items-center justify-center w-24 h-24 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 text-white text-4xl font-bold mb-2">
                    A
                  </div>
                  <p className="text-2xl font-bold">평균 82점</p>
                  <p className="text-sm text-muted-foreground">백엔드 개발</p>
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <Lock className="h-8 w-8 text-muted-foreground mb-2" />
                  <Link to="/analyze/new">
                    <Button size="sm" className="bg-gradient-to-r from-blue-500 to-purple-500">
                      평가 시작
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 크레딧 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              크레딧
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold mb-2">
              {credits.remaining}
              <span className="text-lg text-muted-foreground">/{credits.daily}</span>
            </div>
            <Progress 
              value={(credits.remaining / credits.daily) * 100} 
              className="h-2 mb-2" 
            />
            <p className="text-sm text-muted-foreground">
              오늘 사용: {credits.used} 크레딧
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* 주 역량 평가 */}
        <Card className="relative">
          {!primaryAssessment && (
            <div className="absolute inset-0 backdrop-blur-sm bg-background/50 z-10 flex flex-col items-center justify-center rounded-lg">
              <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">역량 평가가 필요합니다</h3>
              <p className="text-sm text-muted-foreground mb-4 text-center px-4">
                AI 역량 평가를 완료하면 상세한 분석 결과를 확인할 수 있습니다
              </p>
              <Link to="/analyze/new">
                <Button className="bg-gradient-to-r from-blue-500 to-purple-500">
                  <Sparkles className="mr-2 h-4 w-4" />
                  역량 평가 시작하기
                </Button>
              </Link>
            </div>
          )}
          
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              주 역량 평가
            </CardTitle>
            {primaryAssessment && (
              <CardDescription>
                {new Date(primaryAssessment.createdAt).toLocaleDateString('ko-KR')} 평가
              </CardDescription>
            )}
          </CardHeader>
          
          <CardContent>
            {primaryAssessment ? (
              <div className="space-y-6">
                {/* 평균 등급 */}
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">평균 등급</p>
                  <Badge className={`text-3xl px-6 py-2 bg-gradient-to-r ${getGradeColor(getAverageGrade(primaryAssessment.competencyScores))} text-white border-0`}>
                    {getAverageGrade(primaryAssessment.competencyScores)}
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-2">
                    평균 {getAverageScore(primaryAssessment.competencyScores)}점
                  </p>
                </div>

                {/* 역량별 점수 */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm">역량별 점수</h4>
                  {primaryAssessment.competencyScores.map((comp, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{comp.name}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {(comp.weight * 100).toFixed(0)}%
                          </Badge>
                          <Badge className={`bg-gradient-to-r ${getGradeColor(getGrade(comp.score))} text-white border-0`}>
                            {getGrade(comp.score)}
                          </Badge>
                          <span className="font-bold">{comp.score}점</span>
                        </div>
                      </div>
                      <Progress value={comp.score} className="h-2" />
                      <p className="text-xs text-muted-foreground">{comp.evidence}</p>
                    </div>
                  ))}
                </div>

                {/* 강점 */}
                {primaryAssessment.strengths && primaryAssessment.strengths.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <ThumbsUp className="h-4 w-4 text-green-500" />
                      강점
                    </h4>
                    <ul className="space-y-1">
                      {primaryAssessment.strengths.map((strength, idx) => (
                        <li key={idx} className="text-sm text-muted-foreground pl-4 border-l-2 border-green-500">
                          {strength}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 개선점 */}
                {primaryAssessment.improvements && primaryAssessment.improvements.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-orange-500" />
                      개선점
                    </h4>
                    <ul className="space-y-1">
                      {primaryAssessment.improvements.map((improvement, idx) => (
                        <li key={idx} className="text-sm text-muted-foreground pl-4 border-l-2 border-orange-500">
                          {improvement}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <Link to="/my-assessments">
                  <Button variant="outline" className="w-full">
                    다른 평가 보기
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">평균 등급</p>
                  <Badge className="text-3xl px-6 py-2 bg-gradient-to-r from-green-400 to-emerald-500 text-white border-0">
                    A-
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-2">평균 82점</p>
                </div>
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm">역량별 점수</h4>
                  {[
                    { name: "프레임워크 숙련도", score: 85, weight: 35 },
                    { name: "DB 설계", score: 78, weight: 30 },
                    { name: "코드 리뷰", score: 82, weight: 25 },
                  ].map((comp, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{comp.name}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{comp.weight}%</Badge>
                          <Badge className={`bg-gradient-to-r ${getGradeColor(getGrade(comp.score))} text-white border-0`}>
                            {getGrade(comp.score)}
                          </Badge>
                          <span className="font-bold">{comp.score}점</span>
                        </div>
                      </div>
                      <Progress value={comp.score} className="h-2" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 주 희망기업 */}
        <Card className="relative">
          {!primaryCompany && (
            <div className="absolute inset-0 backdrop-blur-sm bg-background/50 z-10 flex flex-col items-center justify-center rounded-lg p-6">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">희망기업을 추가하세요</h3>
              <p className="text-sm text-muted-foreground mb-4 text-center">
                지원하고 싶은 기업을 추가하고 관리할 수 있습니다
              </p>
              <Button className="bg-gradient-to-r from-purple-500 to-pink-500">
                <Building2 className="mr-2 h-4 w-4" />
                기업 추가하기
              </Button>
            </div>
          )}
          
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-pink-500" />
              주 희망기업
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            {primaryCompany ? (
              <div className="space-y-6">
                <div className="p-6 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-lg border-2">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <Building2 className="h-6 w-6 text-purple-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-1">{primaryCompany.name}</h3>
                      <Badge variant="secondary">{primaryCompany.industry}</Badge>
                    </div>
                  </div>
                  {primaryCompany.memo && (
                    <p className="text-sm text-muted-foreground mt-3 p-3 bg-background/50 rounded">
                      {primaryCompany.memo}
                    </p>
                  )}
                </div>

                {companyList.length > 1 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">다른 희망기업</h4>
                    {companyList
                      .filter(c => !c.isPrimary)
                      .slice(0, 3)
                      .map((company) => (
                        <div key={company.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                          <div>
                            <p className="font-medium text-sm">{company.name}</p>
                            <p className="text-xs text-muted-foreground">{company.industry}</p>
                          </div>
                        </div>
                      ))}
                  </div>
                )}

                <Button variant="outline" className="w-full">
                  기업 관리
                </Button>
              </div>
            ) : (
              <div className="p-6 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-lg border-2">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <Building2 className="h-6 w-6 text-purple-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-1">카카오</h3>
                    <Badge variant="secondary">IT·인터넷</Badge>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-2">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-1">자기소개서 작성</h3>
                <p className="text-sm text-muted-foreground">
                  역량 분석 결과로 맞춤 자기소개서 생성
                </p>
              </div>
              <Link to="/resume-writer">
                <Button size="lg" className="bg-gradient-to-r from-blue-500 to-purple-500">
                  작성하기
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-2">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-1">모의면접 연습</h3>
                <p className="text-sm text-muted-foreground">
                  AI와 함께하는 실전 면접 시뮬레이션
                </p>
              </div>
              <Link to="/interview">
                <Button size="lg" className="bg-gradient-to-r from-purple-500 to-pink-500">
                  시작하기
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}