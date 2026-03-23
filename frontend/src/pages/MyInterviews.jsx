import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, FileText, Clock, Trash2, Sparkles, X, Award } from "lucide-react";
import { toast } from "sonner";
import { BASE_URL } from '../config';

export default function MyInterviews() {
  const navigate = useNavigate();
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [chatModal, setChatModal] = useState(null); // 🔥 채팅 모달
  const [summaryModal, setSummaryModal] = useState(null); // 🔥 총평 모달

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
        setInterviews(data.filter(i => i.mode === "chat")); // chat만 필터링
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

  // 🔥 Q&A를 채팅 메시지로 파싱
  const parseMessages = (qna) => {
    if (!qna) return [];
    
    const messages = [];
    const parts = qna.split(/\n\n(?=(?:지원자:|면접관:|피드백:))/); // 다음 역할 전까지 split
    
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.startsWith("지원자:")) {
        messages.push({ 
          role: "user", 
          content: trimmed.replace(/^지원자:\s*/, "").trim() 
        });
      } else if (trimmed.startsWith("면접관:")) {
        messages.push({ 
          role: "interviewer", 
          content: trimmed.replace(/^면접관:\s*/, "").trim() 
        });
      } else if (trimmed.startsWith("피드백:")) {
        messages.push({ 
          role: "feedback", 
          content: trimmed.replace(/^피드백:\s*/, "").trim() 
        });
      }
    }
    
    return messages;
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

      {/* 목록 없을 때 */}
      {interviews.length === 0 && (
        <Card className="border border-border/50">
          <CardContent className="pt-12 pb-12 flex flex-col items-center justify-center space-y-4 text-center">
            <div className="inline-flex items-center justify-center p-4 rounded-full bg-[var(--gradient-mid)]/10">
              <Sparkles className="h-8 w-8 text-[var(--gradient-mid)]" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">면접 기록이 없습니다</h3>
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
        {interviews.map((interview) => {
          // 한 줄 요약 추출 (## 🎯 한 줄 요약 다음 줄)
          const summaryMatch = interview.summaryFeedback?.match(/## 🎯 한 줄 요약\s*\n([^\n]+)/);
          const oneLiner = summaryMatch ? summaryMatch[1].trim() : "종합 총평 보기";
          
          return (
            <Card key={interview.id} className="border border-border/50 hover:border-[var(--gradient-mid)]/30 transition-colors">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-[var(--gradient-mid)] shrink-0" />
                      <span className="font-semibold text-foreground">1:1 대화형 면접</span>
                      <span className="text-xs bg-[var(--gradient-mid)]/10 text-[var(--gradient-mid)] px-2 py-0.5 rounded-full">
                        {interview.totalQuestions}문항
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDate(interview.createdAt)}
                    </div>
                    {/* 한 줄 요약 */}
                    <p className="text-sm text-muted-foreground italic">
                      💬 "{oneLiner}"
                    </p>
                  </div>

                  {/* 버튼 */}
                  <div className="flex flex-col gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setChatModal(interview)}
                    >
                      <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                      상세보기
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                      onClick={() => setSummaryModal(interview)}
                    >
                      <Award className="mr-1.5 h-3.5 w-3.5" />
                      총평 보기
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteConfirm(interview.id)}
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                      삭제
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 🔥 채팅 모달 */}
      {chatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div>
                <h3 className="text-lg font-bold text-foreground">면접 상세 내용</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {formatDate(chatModal.createdAt)} · {chatModal.totalQuestions}문항
                </p>
              </div>
              <button
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setChatModal(null)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {parseMessages(chatModal.questionsAndAnswers).map((msg, idx) => (
                <div key={idx} className={`flex flex-col gap-1 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                  <span className="text-xs text-muted-foreground px-1">
                    {msg.role === "interviewer" ? "🧑‍💼 면접관" : msg.role === "user" ? "🙋 나" : "💡 피드백"}
                  </span>
                  <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm prose prose-sm dark:prose-invert ${
                    msg.role === "user"
                      ? "bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white rounded-tr-sm"
                      : msg.role === "feedback"
                      ? "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-tl-sm"
                      : "bg-muted rounded-tl-sm"
                  }`}>
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 🔥 총평 모달 */}
      {summaryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div>
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Award className="h-5 w-5 text-blue-500" />
                  종합 총평
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {formatDate(summaryModal.createdAt)} · {summaryModal.totalQuestions}문항
                </p>
              </div>
              <button
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setSummaryModal(null)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl px-5 py-4 prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{summaryModal.summaryFeedback}</ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-4 max-w-sm w-full">
            <h3 className="text-lg font-bold text-foreground">면접 기록 삭제</h3>
            <p className="text-sm text-muted-foreground">
              이 면접 기록을 삭제하시겠습니까?<br />
              이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1" 
                onClick={() => setDeleteConfirm(null)}
              >
                취소
              </Button>
              <Button 
                className="flex-1 bg-red-500 text-white hover:bg-red-600" 
                onClick={() => {
                  deleteInterview(deleteConfirm);
                  setDeleteConfirm(null);
                }}
              >
                삭제
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}