import React, { useState, useEffect, useRef } from "react";
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
  Lock,
  Star
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { toast } from "sonner";
import { BASE_URL } from "../config";
import capCodeMap from "../MappingTable/capCodeMap.json";
import jobCodeMap from "../MappingTable/JobCodeMap.json";

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

const getPercentile = (score) => {
  if (score >= 95) return { text: "상위 3%", color: "#f59e0b", glow: "rgba(245,158,11,0.4)" };
  if (score >= 90) return { text: "상위 5%", color: "#10b981", glow: "rgba(16,185,129,0.4)" };
  if (score >= 85) return { text: "상위 10%", color: "#3b82f6", glow: "rgba(59,130,246,0.4)" };
  if (score >= 80) return { text: "상위 15%", color: "#6366f1", glow: "rgba(99,102,241,0.4)" };
  if (score >= 75) return { text: "상위 25%", color: "#8b5cf6", glow: "rgba(139,92,246,0.4)" };
  if (score >= 70) return { text: "상위 35%", color: "#a78bfa", glow: "rgba(167,139,250,0.4)" };
  if (score >= 65) return { text: "상위 50%", color: "#94a3b8", glow: "rgba(148,163,184,0.4)" };
  return { text: "상위 60%", color: "#64748b", glow: "rgba(100,116,139,0.3)" };
};

const getAverageGrade = (competencyScores) => {
  if (!competencyScores || competencyScores.length === 0) return "N/A";
  const weighted = competencyScores.reduce((sum, c) => sum + (c.score * (c.weight || 0)), 0);
  return getGrade(weighted);
};

const getAverageScore = (competencyScores) => {
  if (!competencyScores || competencyScores.length === 0) return 0;
  const weighted = competencyScores.reduce((sum, c) => sum + (c.score * (c.weight || 0)), 0);
  return Math.round(weighted);
};


const COLOR_STOPS = [
  { at: 15,  hex: "#94a3b8" },
  { at: 35,  hex: "#a78bfa" },
  { at: 50,  hex: "#8b5cf6" },
  { at: 65,  hex: "#6366f1" },
  { at: 75,  hex: "#3b82f6" },
  { at: 85,  hex: "#10b981" },
  { at: 100, hex: "#f59e0b" },
];

const lerpColor = (a, b, t) => {
  const ah = parseInt(a.slice(1), 16), bh = parseInt(b.slice(1), 16);
  const ar = (ah >> 16) & 0xff, ag = (ah >> 8) & 0xff, ab = ah & 0xff;
  const br = (bh >> 16) & 0xff, bg = (bh >> 8) & 0xff, bb = bh & 0xff;
  const r = Math.round(ar + (br - ar) * t).toString(16).padStart(2, '0');
  const g = Math.round(ag + (bg - ag) * t).toString(16).padStart(2, '0');
  const bl = Math.round(ab + (bb - ab) * t).toString(16).padStart(2, '0');
  return `#${r}${g}${bl}`;
};

const getColorByFill = (fill) => {
  for (let i = 0; i < COLOR_STOPS.length - 1; i++) {
    if (fill <= COLOR_STOPS[i + 1].at) {
      const t = (fill - COLOR_STOPS[i].at) / (COLOR_STOPS[i + 1].at - COLOR_STOPS[i].at);
      return lerpColor(COLOR_STOPS[i].hex, COLOR_STOPS[i + 1].hex, t);
    }
  }
  return COLOR_STOPS[COLOR_STOPS.length - 1].hex;
};

// 역량별 점수 Progress 애니메이션
const AnimatedProgress = ({ value }) => {
  const [animValue, setAnimValue] = useState(0);
  useEffect(() => {
    setAnimValue(0);
    let start = null;
    const animate = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / 1000, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimValue(Math.round(value * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    const timer = setTimeout(() => requestAnimationFrame(animate), 200);
    return () => clearTimeout(timer);
  }, [value]);
  return <Progress value={animValue} className="h-2" />;
};

const PercentileChart = ({ score, jobName }) => {
  const pct = parseInt(getPercentile(score).text.replace("상위 ", "").replace("%", ""));
  const targetFill = 100 - pct;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const [animFill, setAnimFill] = useState(0);

  useEffect(() => {
    setAnimFill(0);
    let start = null;
    const animate = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / 1500, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimFill(Math.round(targetFill * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    const timer = setTimeout(() => requestAnimationFrame(animate), 100);
    return () => clearTimeout(timer);
  }, [pct]);

  const color = getColorByFill(animFill);
  const offset = circumference - circumference * (animFill / 100);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-40 h-40 p-2">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100" overflow="visible">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="currentColor" strokeWidth="9" className="text-muted/30" />
          <circle cx="50" cy="50" r={radius} fill="none" stroke={color} strokeWidth="9"
            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 8px ${color}66)` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold" style={{ color }}>상위 {100 - animFill}%</span>
        </div>
      </div>
      <p className="text-lg font-bold">{score}점</p>
      <p className="text-xs text-muted-foreground text-center">추정치 기반 · {jobName}</p>
    </div>
  );
};

const PercentileChartLocked = () => {
  const circleRef = useRef(null);
  const textRef = useRef(null);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;

  const getFillColor = (fill) => {
    const stops = [
      { at: 0,   hex: "#64748b" },
      { at: 20,  hex: "#94a3b8" },
      { at: 40,  hex: "#a78bfa" },
      { at: 55,  hex: "#8b5cf6" },
      { at: 65,  hex: "#6366f1" },
      { at: 75,  hex: "#3b82f6" },
      { at: 85,  hex: "#10b981" },
      { at: 100, hex: "#f59e0b" },
    ];
    for (let i = 0; i < stops.length - 1; i++) {
      if (fill <= stops[i + 1].at) {
        const t = (fill - stops[i].at) / (stops[i + 1].at - stops[i].at);
        return lerpColor(stops[i].hex, stops[i + 1].hex, t);
      }
    }
    return stops[stops.length - 1].hex;
  };

  useEffect(() => {
    const keyframes = [
      { t: 0,   fill: 0  },
      { t: 0.7, fill: 85 },
      { t: 1.0, fill: 80 },
    ];
    const duration = 3000;
    let start = null;
    let raf;

    const getKeyframeFill = (progress) => {
      for (let i = 0; i < keyframes.length - 1; i++) {
        if (progress <= keyframes[i + 1].t) {
          const t = (progress - keyframes[i].t) / (keyframes[i + 1].t - keyframes[i].t);
          const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
          return keyframes[i].fill + (keyframes[i + 1].fill - keyframes[i].fill) * eased;
        }
      }
      return 80;
    };

    const animate = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const fill = getKeyframeFill(progress);
      const offset = circumference * (1 - fill / 100);
      const color = getFillColor(fill);
      const displayPct = Math.round(100 - fill);
      if (circleRef.current) {
        circleRef.current.style.strokeDashoffset = offset;
        circleRef.current.style.stroke = color;
        circleRef.current.style.filter = `drop-shadow(0 0 8px ${color}66)`;
      }
      if (textRef.current) {
        textRef.current.textContent = `상위 ${displayPct}%`;
        textRef.current.style.color = color;
      }
      if (progress < 1) raf = requestAnimationFrame(animate);
    };

    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="relative">
      <div className="blur-sm flex flex-col items-center gap-2 pointer-events-none select-none">
        <div className="relative w-40 h-40 p-2">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100" overflow="visible">
            <circle cx="50" cy="50" r={radius} fill="none" stroke="currentColor" strokeWidth="9" className="text-muted/30" />
            <circle ref={circleRef} cx="50" cy="50" r={radius} fill="none" strokeWidth="9"
              strokeDasharray={circumference} strokeDashoffset={circumference} strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span ref={textRef} className="text-xl font-bold">상위 100%</span>
          </div>
        </div>
        <p className="text-lg font-bold">나는 상위 몇 %일까?</p>
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
  );
};

export function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [companyList, setCompanyList] = useState([]);

  useEffect(() => { fetchDashboard(); }, []);

  const fetchDashboard = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) { setError("로그인이 필요합니다."); setLoading(false); return; }
      const response = await fetch(`${BASE_URL}/api/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("데이터를 불러올 수 없습니다.");
      const responseData = await response.json();
      setData(responseData);
      setCompanyList((responseData.companyList || []).sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0)));
    } catch (error) {
      setError(error.message || "데이터를 불러올 수 없습니다.");
    } finally { setLoading(false); }
  };

  const handleSetPrimary = async (id) => {
    setCompanyList(prev =>
      prev.map(c => ({ ...c, isPrimary: c.id === id }))
          .sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0))
    );
    try {
      const token = localStorage.getItem("token");
      await fetch(`${BASE_URL}/api/companies/${id}/primary`, {
        method: "PUT", headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("주 희망기업이 변경되었습니다!");
    } catch { toast.error("변경에 실패했습니다."); fetchDashboard(); }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <Sparkles className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">로딩 중...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-lg font-semibold mb-2">오류가 발생했습니다</p>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Link to="/login"><Button>로그인하기</Button></Link>
      </div>
    </div>
  );

  const userData = data?.user || { nickname: "사용자", email: "" };
  const desiredJob = data?.desiredJob;
  const primaryAssessment = data?.primaryAssessment;
  const primaryCompany = data?.primaryCompany;
  const primaryJobPosting = data?.primaryJobPosting;
  const gapReport = data?.gapReport;
  const credits = data?.credits || { remaining: 0, daily: 50, used: 0 };

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-6">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center p-3 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500">
          <LayoutDashboard className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
          나의 커리어 대시보드
        </h1>
        <p className="text-lg text-muted-foreground">안녕하세요, {userData.nickname}님!</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="bg-muted/20">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Briefcase className="h-4 w-4" />내 역량 분포
            </CardTitle>
          </CardHeader>
          <CardContent>
            {primaryAssessment?.capabilityVector && Object.keys(primaryAssessment.capabilityVector).length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {Object.entries(primaryAssessment.capabilityVector)
                  .filter(([_, v]) => v > 0)
                  .sort(([, a], [, b]) => b - a)
                  .map(([code, score]) => (
                    <span
                      key={code}
                      className="text-xs px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500 font-medium"
                    >
                      {code}: {Math.round(score * 100)}
                    </span>
                  ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground text-sm mb-3">역량평가를 완료하면 표시됩니다</p>
                <Link to="/analyze/new">
                  <Button size="sm">역량 평가 시작</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />예상 상위 퍼센테이지
            </CardTitle>
          </CardHeader>
          <CardContent>
            {primaryAssessment
              ? <PercentileChart score={primaryAssessment.totalScore} jobName={primaryAssessment.groupName} />
              : <PercentileChartLocked />
            }
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4" />크레딧
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold mb-2">
              {credits.remaining}<span className="text-lg text-muted-foreground">/{credits.daily}</span>
            </div>
            <Progress value={(credits.remaining / credits.daily) * 100} className="h-2 mb-2" />
            <p className="text-sm text-muted-foreground">오늘 사용: {credits.used} 크레딧</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
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
                  <Sparkles className="mr-2 h-4 w-4" />역량 평가 시작하기
                </Button>
              </Link>
            </div>
          )}
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-500" />주 역량 평가
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
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">평균 등급</p>
                  <Badge className={`text-3xl px-6 py-6 bg-gradient-to-r ${getGradeColor(getGrade(primaryAssessment.totalScore))} text-white border-0`}>
                    {getGrade(primaryAssessment.totalScore)}
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-2">
                    평균 {primaryAssessment.totalScore}점
                  </p>
                  {primaryAssessment.grade && (
                    <div className="mt-2">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                        primaryAssessment.grade === "PROFESSIONER"
                          ? "bg-yellow-500/15 text-yellow-500"
                          : "bg-blue-500/15 text-blue-500"
                      }`}>
                        {primaryAssessment.evaluatedJobCode} [{primaryAssessment.grade}]
                      </span>
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm">역량별 점수</h4>
                  {(primaryAssessment.coreScores || []).map((comp, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{comp.name}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{(comp.weight * 100).toFixed(0)}%</Badge>
                          <Badge className={`bg-gradient-to-r ${getGradeColor(getGrade(comp.score))} text-white border-0`}>
                            {getGrade(comp.score)}
                          </Badge>
                          <span className="font-bold">{comp.score}점</span>
                        </div>
                      </div>
                      <AnimatedProgress value={comp.score} />
                      <p className="text-xs text-muted-foreground">{comp.evidence}</p>
                    </div>
                  ))}
                  {((primaryAssessment.nonCoreScores || []).length > 0 || 
                    (primaryAssessment.commonScores || []).length >= 0) && (
                    <details className="space-y-2" open>
                      <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors py-1">
                        보조 역량
                      </summary>
                      <div className="space-y-4 pt-2 border-t border-border/50">

                        {/* 보조 역량 */}
                        {(primaryAssessment.nonCoreScores || []).length > 0 && (
                          <div className="space-y-3">
                            <h5 className="text-xs font-semibold text-muted-foreground">보조 역량</h5>
                            {primaryAssessment.nonCoreScores.map((comp, idx) => (
                              <div key={idx} className="space-y-1">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">{comp.name}</span>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">{(comp.weight * 100).toFixed(0)}%</Badge>
                                    <Badge className={`bg-gradient-to-r ${getGradeColor(getGrade(comp.score))} text-white border-0 text-xs`}>
                                      {getGrade(comp.score)}
                                    </Badge>
                                    <span className="text-xs font-bold">{comp.score}점</span>
                                  </div>
                                </div>
                                <Progress value={comp.score} className="h-1" />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </details>
                  )}
                  {(primaryAssessment.coreUnknownScores || []).length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-border/50">
                      <h4 className="font-semibold text-xs text-muted-foreground flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 text-muted-foreground" />
                        심층분석에서 확인되지 않은 항목
                      </h4>
                      {primaryAssessment.coreUnknownScores.map((comp, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>{comp.name}</span>
                          <Badge variant="outline" className="text-xs">미확인</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                  {(primaryAssessment.commonScores || []).length > 0 && (
                    <div className="pt-2 border-t border-border/50">
                      <h5 className="text-xs font-semibold text-muted-foreground mb-2">자격증 · 어학</h5>
                      {primaryAssessment.measureType === "TECH_STACK" ? (
                        // IT 개발 직군 → 뱃지만
                        <div className="flex flex-wrap gap-2">
                          {primaryAssessment.commonScores.map((comp, idx) => (
                            <span key={idx} className="text-xs px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-500 font-medium">
                              {comp.name} ✓
                            </span>
                          ))}
                        </div>
                      ) : (
                        // 자격증이 중요한 직군 → 기여 점수 표시
                        <div className="space-y-2">
                          {primaryAssessment.commonScores.map((comp, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">{comp.name}</span>
                              <Badge className="bg-green-500/15 text-green-500 border-0 text-xs">
                                +{primaryAssessment.certEffect || 0}점 기여
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {primaryAssessment.strengths?.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <ThumbsUp className="h-4 w-4 text-green-500" />강점
                    </h4>
                    <ul className="space-y-1">
                      {primaryAssessment.strengths.map((s, idx) => (
                        <li key={idx} className="text-sm text-muted-foreground pl-4 border-l-2 border-green-500">{s.replace(" 설계 역량 보유", " ✦ L2")}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {primaryAssessment.improvements?.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-orange-500" />개선점
                    </h4>
                    <ul className="space-y-1">
                      {primaryAssessment.improvements.map((i, idx) => (
                        <li key={idx} className="text-sm text-muted-foreground pl-4 border-l-2 border-orange-500">{i}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {primaryAssessment.jobRanking && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <Award className="h-4 w-4 text-yellow-500" />직군 매칭
                    </h4>
                    {Object.entries(primaryAssessment.jobRanking)
                      .filter(([_, v]) => v > 0)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 3)
                      .map(([code, score]) => (
                        <div key={code} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{code}</span>
                          <Badge variant="outline" className="text-xs">
                            {score.toFixed(2)}점
                          </Badge>
                        </div>
                      ))}
                  </div>
                )}
                
                <Link to="/my-assessments">
                  <Button variant="outline" className="w-full">다른 평가 보기</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">평균 등급</p>
                  <Badge className="text-3xl px-6 py-2 bg-gradient-to-r from-green-400 to-emerald-500 text-white border-0">A-</Badge>
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
                          <Badge className={`bg-gradient-to-r ${getGradeColor(getGrade(comp.score))} text-white border-0`}>{getGrade(comp.score)}</Badge>
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

        <Card className="relative bg-muted/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-pink-500" />희망기업
            </CardTitle>
            {primaryJobPosting && (
              <div className="text-xs text-muted-foreground mt-1">
                주 목표: {primaryJobPosting.companyName} · {primaryJobPosting.position}
              </div>
            )}
          </CardHeader>
          <CardContent>
            {/* Gap 분석 카드 - primaryJobPosting + gapReport 있을 때 */}
            {primaryJobPosting && gapReport && (
              <div className="mb-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-purple-500" />역량 갭 분석
                  </h4>
                  <span className="text-xs text-muted-foreground">{primaryJobPosting.analyzedJobCode}</span>
                </div>

                {/* Gap 항목 */}
                <div className="space-y-2">
                  {Object.entries(gapReport.gaps || {}).map(([code, gap]) => {
                    const statusColor = {
                      MATCH: "text-green-500 bg-green-500/10",
                      CLOSE: "text-yellow-500 bg-yellow-500/10",
                      GAP: "text-red-500 bg-red-500/10"
                    }[gap.status] || "";
                    const statusLabel = { MATCH: "충족", CLOSE: "근접", GAP: "부족" }[gap.status] || "";
                    const userPct = Math.round((gap.userScore || 0) * 100);
                    const reqPct = Math.round((gap.requiredScore || 0) * 100);
                    return (
                      <div key={code} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{code}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground">{userPct} / {reqPct}</span>
                            <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
                              {statusLabel}
                            </span>
                          </div>
                        </div>
                        <div className="relative h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="absolute inset-y-0 left-0 bg-purple-500/40 rounded-full"
                            style={{ width: `${reqPct}%` }} />
                          <div className="absolute inset-y-0 left-0 bg-purple-500 rounded-full"
                            style={{ width: `${userPct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 액션 아이템 */}
                {(gapReport.actionItems || []).length > 0 && (
                  <details className="pt-2 border-t border-border/50">
                    <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground py-1">
                      개선 로드맵 ({gapReport.actionItems.length}개)
                    </summary>
                    <div className="mt-2 space-y-2">
                      {gapReport.actionItems.map((item, idx) => (
                        <div key={idx} className="p-2.5 rounded-lg bg-muted/40 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium">{item.capability}</span>
                            <span className="text-xs text-muted-foreground">~{item.estimatedWeeks}주</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{item.action}</p>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            )}

            {/* 기업 목록 */}
            <div className="space-y-3">
              {companyList.length > 0 ? companyList.map((company) => (
                <div key={company.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  company.isPrimary ? "border-pink-500/30 bg-pink-500/5" : "border-border/50 bg-muted/20"
                }`}>
                  <div className={`p-2 rounded-lg shrink-0 ${company.isPrimary ? "bg-pink-500/10" : "bg-muted"}`}>
                    <Building2 className={`h-4 w-4 ${company.isPrimary ? "text-pink-500" : "text-muted-foreground"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">{company.name}</p>
                      {company.isPrimary && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-pink-500/15 text-pink-500 shrink-0">주</span>
                      )}
                      {company.companySize && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">{company.companySize}</span>
                      )}
                    </div>
                    {company.industry && <p className="text-xs text-muted-foreground">{company.industry}</p>}
                  </div>
                  {!company.isPrimary && (
                    <button onClick={() => handleSetPrimary(company.id)}
                      className="p-1.5 shrink-0 rounded-lg hover:bg-yellow-500/10 text-muted-foreground hover:text-yellow-500 transition-colors">
                      <Star className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )) : (
                <div className="text-center py-6">
                  <Building2 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-3">등록된 희망기업이 없어요</p>
                  <Link to="/companies/new">
                    <Button size="sm" variant="outline">기업 추가하기</Button>
                  </Link>
                </div>
              )}
              {companyList.length > 0 && (
                <Link to="/companies">
                  <Button variant="outline" className="w-full mt-2" size="sm">기업 관리</Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-2">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-1">자기소개서 작성</h3>
                <p className="text-sm text-muted-foreground">역량 분석 결과로 맞춤 자기소개서 생성</p>
              </div>
              <Link to="/resume-select">
                <Button size="lg" className="bg-gradient-to-r from-blue-500 to-purple-500">
                  작성하기<ArrowRight className="ml-2 h-4 w-4" />
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
                <p className="text-sm text-muted-foreground">AI와 함께하는 실전 면접 시뮬레이션</p>
              </div>
              <Link to="/interview">
                <Button size="lg" className="bg-gradient-to-r from-purple-500 to-pink-500">
                  시작하기<ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}