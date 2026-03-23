import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Lightbulb, Target, TrendingUp } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function EvaluationResult({ evaluation }) {
  if (!evaluation) return null;

  // JSON 파싱 시도
  let evaluationData;
  try {
    evaluationData = JSON.parse(evaluation);
  } catch {
    evaluationData = { text: evaluation };
  }

  return (
    <Card className="border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 dark:from-blue-950/20 dark:to-indigo-950/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
          <BarChart className="h-5 w-5" />
          AI 평가 결과
        </CardTitle>
        <CardDescription className="text-blue-600/80 dark:text-blue-400/80">
          자소서의 강점과 개선점을 확인하세요
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* JSON 형태 평가 (상세) */}
        {evaluationData.overall !== undefined ? (
          <>
            {/* 종합 점수 */}
            <div className="flex items-center gap-6 p-4 rounded-xl bg-white/60 dark:bg-slate-900/40 border border-blue-100 dark:border-blue-900">
              <div className="relative w-24 h-24 shrink-0">
                <svg className="transform -rotate-90 w-24 h-24">
                  <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-blue-100 dark:text-blue-900" />
                  <circle cx="48" cy="48" r="40" stroke="url(#evalGradient)" strokeWidth="6" fill="transparent"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - evaluationData.overall / 100)}`}
                    className="transition-all duration-1000" />
                  <defs>
                    <linearGradient id="evalGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{evaluationData.overall}</span>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground mb-1">종합 평가</h3>
                <p className="text-sm text-muted-foreground">
                  {evaluationData.overall >= 80 ? "매우 우수한 자소서입니다! 🎉" 
                    : evaluationData.overall >= 60 ? "양호한 수준입니다. 조금만 더 보완하면 완벽해요! 👍"
                    : "개선이 필요합니다. AI 제안을 참고하세요! 💪"}
                </p>
              </div>
            </div>

            {/* 세부 항목 점수 */}
            {evaluationData.categories && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-600" />
                  세부 평가 항목
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {Object.entries(evaluationData.categories).map(([key, data]) => {
                    const labels = {
                      clarity: "명확성",
                      relevance: "직무 관련성",
                      structure: "구조/완성도",
                      impact: "임팩트"
                    };
                    return (
                      <div key={key} className="p-4 rounded-lg bg-white/60 dark:bg-slate-900/40 border border-blue-50 dark:border-blue-900/50 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-semibold text-foreground">{labels[key]}</span>
                          <span className="text-blue-600 dark:text-blue-400 font-bold">{data.score}점</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-blue-100 dark:bg-blue-900/50 overflow-hidden">
                          <div 
                            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-700"
                            style={{ width: `${data.score}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">{data.feedback}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* AI 개선 제안 */}
            {evaluationData.suggestions && evaluationData.suggestions.length > 0 && (
              <div className="space-y-3 p-4 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/10 border border-amber-200 dark:border-amber-800">
                <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  AI 개선 제안
                </h3>
                <ul className="space-y-2">
                  {evaluationData.suggestions.map((suggestion, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-amber-900 dark:text-amber-200">
                      <TrendingUp className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          // 텍스트 형태 평가 (폴백)
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown>{evaluationData.text || evaluation}</ReactMarkdown>
          </div>
        )}

      </CardContent>
    </Card>
  );
}