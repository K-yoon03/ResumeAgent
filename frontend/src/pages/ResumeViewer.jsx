import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Edit, CheckCircle, BarChart, MessageSquare, Trash2, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { BASE_URL } from '../config';
import ReactMarkdown from "react-markdown";
import EvaluationResult from '../components/EvaluationResult';

export default function ResumeViewer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editMode = searchParams.get("edit") === "true";

  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(editMode);
  const [editedContent, setEditedContent] = useState("");
  const [editedTitle, setEditedTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [evaluating, setEvaluating] = useState(false);

  useEffect(() => {
    fetchResume();
  }, [id]);

  const fetchResume = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${BASE_URL}/api/resume`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const found = data.find(r => r.id === parseInt(id));
        if (found) {
          setResume(found);
          setEditedContent(found.content);
          setEditedTitle(found.title || "");
        } else {
          toast.error("자소서를 찾을 수 없습니다.");
          navigate("/my-resumes");
        }
      }
    } catch {
      toast.error("불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${BASE_URL}/api/resume/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          content: editedContent,
          title: editedTitle
        })
      });
      if (res.ok) {
        const updated = await res.json();
        setResume(updated);
        setIsEditing(false);
        toast.success("수정이 완료되었습니다!");
        if (updated.status === "DRAFT") {
          toast.info("수정되어 다시 확정이 필요합니다.");
        }
      }
    } catch {
      toast.error("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirm = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${BASE_URL}/api/resume/${id}/confirm`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const updated = await res.json();
        setResume(updated);
        toast.success("자소서가 확정되었습니다!");
      }
    } catch {
      toast.error("확정에 실패했습니다.");
    }
  };

  const handleEvaluate = async () => {
    setEvaluating(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${BASE_URL}/api/resume/${id}/evaluate`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const updated = await res.json();
        setResume(updated);
        toast.success("평가가 완료되었습니다!");
      }
    } catch {
      toast.error("평가에 실패했습니다.");
    } finally {
      setEvaluating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${BASE_URL}/api/resume/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success("삭제되었습니다.");
        navigate("/my-resumes");
      }
    } catch {
      toast.error("삭제에 실패했습니다.");
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "DRAFT":
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">작성 중</Badge>;
      case "CONFIRMED":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">확정 완료</Badge>;
      case "EVALUATED":
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">평가 완료</Badge>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--gradient-mid)]" />
      </div>
    );
  }

  if (!resume) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 text-center">
        <p className="text-muted-foreground">자소서를 찾을 수 없습니다.</p>
        <Button onClick={() => navigate("/my-resumes")} className="mt-4">
          목록으로 돌아가기
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 space-y-8">
      
      {/* 헤더 */}
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate("/my-resumes")} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          목록으로
        </Button>

        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 flex-1">
            {isEditing ? (
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                placeholder="제목을 입력하세요"
                className="text-3xl font-bold bg-transparent border-b-2 border-[var(--gradient-mid)] focus:outline-none w-full"
              />
            ) : (
              <h1 className="text-3xl font-bold bg-gradient-to-r from-[var(--gradient-start)] via-[var(--gradient-mid)] to-[var(--gradient-end)] bg-clip-text text-transparent">
                {resume.title || "자기소개서"}
              </h1>
            )}
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              {getStatusBadge(resume.status)}
              <span>
                {resume.createdAt ? new Date(resume.createdAt).toLocaleDateString("ko-KR") : ""}
              </span>
            </div>
          </div>

          {/* 상태별 액션 버튼 */}
          <div className="flex flex-wrap gap-2">
            {resume.status === "DRAFT" && !isEditing && (
              <>
                <Button
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white"
                >
                  <Edit className="mr-1.5 h-3.5 w-3.5" />
                  수정하기
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleConfirm}
                >
                  <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                  확정하기
                </Button>
              </>
            )}

            {resume.status === "CONFIRMED" && (
              <>
                <Button
                  size="sm"
                  onClick={handleEvaluate}
                  disabled={evaluating}
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white"
                >
                  {evaluating ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <BarChart className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  평가받기
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate("/interview", { state: { resume: resume.content } })}
                >
                  <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                  모의면접
                </Button>
              </>
            )}

            {resume.status === "EVALUATED" && (
              <>
                <Button
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit className="mr-1.5 h-3.5 w-3.5" />
                  다시 수정
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate("/interview", { state: { resume: resume.content } })}
                  className="bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white"
                >
                  <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                  모의면접
                </Button>
              </>
            )}

            <Button
              size="sm"
              variant="ghost"
              onClick={handleDelete}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              삭제
            </Button>
          </div>
        </div>
      </div>

      {/* 자소서 내용 */}
      <Card className="border border-border/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-5 w-5 text-[var(--gradient-mid)]" />
            자기소개서
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#6366f1]/5 dark:bg-[#6366f1]/10 border border-[#6366f1]/20 dark:border-[#6366f1]/30">
                <div className="flex gap-3">
                  <span className="text-lg">✨</span>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-[#6366f1] dark:text-[#a78bfa]">
                      AI 초안 검토 및 보완
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      AI가 작성한 내용은 합격을 위한 <b>기본 가이드라인</b>입니다. 
                      여기에 본인만의 구체적인 에피소드를 더해 내용을 보완하면 더욱 설득력 있는 자소서가 완성됩니다.
                    </p>
                  </div>
                </div>
              </div>
              <textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="w-full min-h-[400px] px-4 py-3 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gradient-mid)]/50 focus:border-[var(--gradient-mid)] transition-all resize-none"
              />
              <div className="flex gap-3">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white"
                >
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="mr-2 h-4 w-4" />
                  )}
                  저장하기
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setEditedContent(resume.content);
                    setEditedTitle(resume.title || "");
                  }}
                >
                  취소
                </Button>
              </div>
            </div>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{resume.content}</ReactMarkdown>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 평가 결과 - EvaluationResult 컴포넌트 사용 */}
      {resume.evaluation && <EvaluationResult evaluation={resume.evaluation} />}

    </div>
  );
}