import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, FileText, MessageSquare, ArrowRight, BarChart2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import CareerPilotHelmIcon from '../components/CareerPilotHelmIcon';

const Landing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const features = [
    {
      icon: BarChart2,
      title: "정밀 역량 분석",
      description: "AI 인사 담당자의 관점으로 당신의 경험을 재해석하고 핵심 역량을 추출합니다.",
      color: "from-[var(--gradient-start)] to-[var(--gradient-mid)]",
    },
    {
      icon: FileText,
      title: "맞춤형 자기소개서",
      description: "분석된 역량을 바탕으로 지원 직무에 최적화된 자기소개서 초안을 작성합니다.",
      color: "from-[var(--gradient-mid)] to-[var(--gradient-end)]",
    },
    {
      icon: MessageSquare,
      title: "실전 모의면접",
      description: "자기소개서 기반으로 예상 면접 질문을 생성하고 실전처럼 연습합니다.",
      color: "from-[var(--gradient-end)] to-[var(--gradient-start)]",
    },
  ];

  const steps = [
    { step: "01", title: "경험 입력", desc: "스펙과 경험을 입력하세요" },
    { step: "02", title: "AI 역량 분석", desc: "핵심 강점을 분석합니다" },
    { step: "03", title: "자소서 생성", desc: "맞춤 자소서를 작성합니다" },
    { step: "04", title: "모의면접", desc: "실전 면접을 연습합니다" },
  ];
    const CareerPilotHelmIcon = ({ className }) => (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="1.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      {/* 메인 원형 림 */}
      <circle cx="12" cy="12" r="6" />
      
      {/* 8방향 살(Spokes) */}
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
      <path d="M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      
      {/* 핸들 끝의 둥근 그립 - 이게 있어야 기어 부품처럼 안 보입니다! */}
      <circle cx="12" cy="2" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="22" r="1" fill="currentColor" stroke="none" />
      <circle cx="2" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="22" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="4.93" cy="4.93" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="19.07" cy="19.07" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="4.93" cy="19.07" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="19.07" cy="4.93" r="0.8" fill="currentColor" stroke="none" />
      
      {/* 중앙 축 */}
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );

  return (
    <div className="min-h-screen bg-background">

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center text-center px-4 pt-24 pb-20 overflow-hidden">
        {/* 배경 블러 오브 */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[var(--gradient-mid)]/20 blur-[120px] rounded-full pointer-events-none" />

        <div className="relative space-y-6 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[var(--gradient-mid)]/30 bg-[var(--gradient-mid)]/10 text-sm text-[var(--gradient-mid)]">
            <Sparkles className="h-3.5 w-3.5" />
            AI 기반 취업 준비 플랫폼
          </div>

          <h1 className="text-5xl md:text-6xl font-bold leading-tight">
            당신의 경험에{" "}
            <span className="bg-gradient-to-r from-[var(--gradient-start)] via-[var(--gradient-mid)] to-[var(--gradient-end)] bg-clip-text text-transparent">
              가치
            </span>
            를 더하세요
          </h1>

          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            AI 에이전트가 당신의 경험을 정밀 분석하여<br />
            최적의 자기소개서와 면접 준비를 도와드립니다.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button
              size="lg"
              className="bg-gradient-to-r from-[var(--gradient-start)] via-[var(--gradient-mid)] to-[var(--gradient-end)] text-white hover:opacity-90 transition-opacity px-8"
              onClick={() => navigate("/analyze")}
            >
              <CareerPilotHelmIcon className="h-7 w-7 text-white" />
              지금 분석 시작하기
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>

            {!user && (
              <Button
                size="lg"
                variant="outline"
                className="px-8"
                onClick={() => navigate("/login")}
              >
                로그인하고 저장하기
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* 진행 단계 */}
      <section className="px-4 py-16 max-w-4xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {steps.map(({ step, title, desc }, i) => (
            <div key={step} className="relative flex flex-col items-center text-center space-y-2">
              {/* 연결선 */}
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-5 left-[60%] w-full h-px bg-gradient-to-r from-[var(--gradient-mid)]/40 to-transparent" />
              )}
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] flex items-center justify-center text-white text-sm font-bold z-10">
                {step}
              </div>
              <p className="font-semibold text-sm text-foreground">{title}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 기능 카드 */}
      <section className="px-4 py-16 max-w-5xl mx-auto">
        <div className="text-center mb-12 space-y-3">
          <h2 className="text-3xl font-bold text-foreground">
            취업 준비의 모든 것을{" "}
            <span className="bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] bg-clip-text text-transparent">
              한 곳에서
            </span>
          </h2>
          <p className="text-muted-foreground">역량 분석부터 모의면접까지 AI가 함께합니다</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, description, color }) => (
            <Card key={title} className="border border-border/50 hover:border-[var(--gradient-mid)]/40 transition-colors group">
              <CardContent className="pt-6 space-y-4">
                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${color} bg-opacity-10`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold text-foreground">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA 배너 */}
      <section className="px-4 py-16 max-w-4xl mx-auto">
        <Card className="border-2 border-[var(--gradient-mid)]/20 bg-gradient-to-br from-[var(--gradient-start)]/10 via-[var(--gradient-mid)]/10 to-[var(--gradient-end)]/10">
          <CardContent className="pt-8 pb-8 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-foreground">지금 바로 시작해보세요</h3>
              <p className="text-muted-foreground">로그인 없이도 분석을 체험할 수 있습니다</p>
            </div>
            <Button
              size="lg"
              className="bg-gradient-to-r from-[var(--gradient-start)] via-[var(--gradient-mid)] to-[var(--gradient-end)] text-white hover:opacity-90 transition-opacity shrink-0"
              onClick={() => navigate("/analyze")}
            >
              무료로 시작하기
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default Landing;