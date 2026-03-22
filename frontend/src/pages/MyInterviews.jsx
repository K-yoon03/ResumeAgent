import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, FileText, Clock, Trash2, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { BASE_URL } from '../config';

export default function MyInterviews() {
  const navigate = useNavigate();
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("chat");
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    fetchInterviews();
  }, []);

  const fetchInterviews = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${BASE_URL}/api/interview`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setInterviews(data);
      }
    } catch {
      toast.error("불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const deleteInterview = async (id) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${BASE_URL}/api/interview/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setInterviews(prev => prev.filter(i => i.id !== id));
        toast.success("삭제되었습니다.");
      }
    } catch {
      toast.error("삭제에 실패했습니다.");
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
  };

  const filtered = interviews.filter(i => i.mode === tab);

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
            나의 모의면접
          </h1>
          <p className="text-muted-foreground text-sm">완료한 모의면접 결과를 확인하세요</p>
        </div>
        <Button
          className="bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white hover:opacity-90"
          onClick={() => navigate("/my-resumes")}
        >
          <FileText className="mr-2 h-4 w-4" />
          자소서에서 시작
        </Button>
      </div>

      {/* 탭 */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setTab("chat")}
          className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
            tab === "chat"
              ? "border-[var(--gradient-mid)] text-[var(--gradient-mid)]"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          💬 1:1 대화형
          <span className="ml-2 text-xs bg-[var(--gradient-mid)]/10 text-[var(--gradient-mid)] px-1.5 py-0.5 rounded-full">
            {interviews.filter(i => i.mode === "chat").length}
          </span>
        </button>
        <button
          onClick={() => setTab("list")}
          className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
            tab === "list"
              ? "border-[var(--gradient-mid)] text-[var(--gradient-mid)]"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          📋 질문 목록형
          <span className="ml-2 text-xs bg-[var(--gradient-mid)]/10 text-[var(--gradient-mid)] px-1.5 py-0.5 rounded-full">
            {interviews.filter(i => i.mode === "list").length}
          </span>
        </button>
      </div>

      {/* 목록 없을 때 */}
      {filtered.length === 0 && (
        <Card className="border border-border/50">
          <CardContent className="pt-12 pb-12 flex flex-col items-center justify-center space-y-4 text-center">
            <div className="inline-flex items-center justify-center p-4 rounded-full bg-[var(--gradient-mid)]/10">
              <Sparkles className="h-8 w-8 text-[var(--gradient-mid)]" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">
                {tab === "chat" ? "1:1 대화형" : "질문 목록형"} 면접 기록이 없습니다
              </h3>
              <p className="text-sm text-muted-foreground">자소서를 기반으로 모의면접을 시작해보세요</p>
            </div>
            <Button
              className="bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white hover:opacity-90"
              onClick={() => navigate("/my-resumes")}
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              면접 시작하기
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 면접 결과 목록 */}
      <div className="space-y-4">
        {filtered.map((interview) => (
          <Card key={interview.id} className="border border-border/50 hover:border-[var(--gradient-mid)]/30 transition-colors">
            <CardContent className="pt-5 pb-5">
              <div className="space-y-3">

                {/* 상단 정보 */}
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-[var(--gradient-mid)] shrink-0" />
                      <span className="font-semibold text-foreground">
                        {tab === "chat" ? "1:1 대화형" : "질문 목록형"} 면접
                      </span>
                      <span className="text-xs bg-[var(--gradient-mid)]/10 text-[var(--gradient-mid)] px-2 py-0.5 rounded-full">
                        {interview.totalQuestions}문항
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDate(interview.createdAt)}
                    </div>
                    {/* 피드백 미리보기 */}
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {interview.feedback?.replace(/#+\s*/g, "").replace(/\*+/g, "").replace(/\n+/g, " ").trim()}
                    </p>
                  </div>

                  {/* 버튼 */}
                  <div className="flex flex-col gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setExpandedId(expandedId === interview.id ? null : interview.id)}
                    >
                      {expandedId === interview.id
                        ? <><ChevronUp className="mr-1.5 h-3.5 w-3.5" />접기</>
                        : <><ChevronDown className="mr-1.5 h-3.5 w-3.5" />상세보기</>
                      }
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => deleteInterview(interview.id)}
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                      삭제
                    </Button>
                  </div>
                </div>

                {/* 상세 내용 펼치기 */}
                {expandedId === interview.id && (
                  <div className="space-y-4 pt-3 border-t border-border">

                    {/* Q&A */}
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-foreground">질문 & 답변</p>
                      <div className="bg-muted/50 rounded-lg px-4 py-3 text-sm prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>
                          {interview.questionsAndAnswers}
                        </ReactMarkdown>
                      </div>
                    </div>

                    {/* 피드백 */}
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-foreground">💡 피드백</p>
                      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3 text-sm prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>
                          {interview.feedback}
                        </ReactMarkdown>
                      </div>
                    </div>

                  </div>
                )}

              </div>
            </CardContent>
          </Card>
        ))}
      </div>

    </div>
  );
}