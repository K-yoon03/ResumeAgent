import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Plus, Clock, Trash2, Sparkles, MessageSquare, CheckCircle, Edit, BarChart, Zap } from "lucide-react";
import { toast } from "sonner";
import { BASE_URL } from '../config';
import { useAuth } from '@/hooks/useAuth';

export default function MyResumes() {
  const navigate = useNavigate();
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin, loading: authLoading } = useAuth();

  useEffect(() => {
    fetchResumes();
  }, []);

  const fetchResumes = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${BASE_URL}/api/resume`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setResumes(data);
      }
    } catch {
      toast.error("불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const deleteResume = async (id) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${BASE_URL}/api/resume/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setResumes(prev => prev.filter(r => r.id !== id));
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

  const getStatusBadge = (status) => {
    switch (status) {
      case "DRAFT":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
            <Edit className="h-3 w-3" />
            작성 중
          </span>
        );
      case "CONFIRMED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle className="h-3 w-3" />
            확정 완료
          </span>
        );
      case "EVALUATED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
            <BarChart className="h-3 w-3" />
            평가 완료
          </span>
        );
      default:
        return null;
    }
  };

  const getActionButtons = (resume) => {
    const token = localStorage.getItem("token");

    // 공통: 보기 버튼
    const viewButton = (
      <Button
        size="sm"
        className="bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white hover:opacity-90"
        onClick={() => navigate(`/resume/${resume.id}`)}
      >
        <FileText className="mr-1.5 h-3.5 w-3.5" />
        보기
      </Button>
    );

    if (resume.status === "DRAFT") {
      // 작성 중: 보기, 수정, 삭제
      return (
        <>
          {viewButton}
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(`/resume/${resume.id}?edit=true`)}
          >
            <Edit className="mr-1.5 h-3.5 w-3.5" />
            수정
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground hover:text-destructive"
            onClick={() => deleteResume(resume.id)}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            삭제
          </Button>
        </>
      );
    }

    if (resume.status === "CONFIRMED") {
      // 확정 완료: 보기, 평가받기, 모의면접, 삭제
      return (
        <>
          {viewButton}
          <BarChart className="mr-1.5 h-3.5 w-3.5" />
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate("/interview", {
              state: { resume: resume.content }
            })}
          >
          <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
            모의면접
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground hover:text-destructive"
            onClick={() => deleteResume(resume.id)}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            삭제
          </Button>
        </>
      );
    }

    if (resume.status === "EVALUATED") {
      // 평가 완료: 보기, 다시 수정, 모의면접, 삭제
      return (
        <>
          {viewButton}
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(`/resume/${resume.id}?edit=true`)}
          >
            <Edit className="mr-1.5 h-3.5 w-3.5" />
            다시 수정
          </Button>
          {isAdmin && (
            <Button
              size="sm"
              variant="outline"
              className="border-purple-500 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/20"
              onClick={() => navigate("/interview/advanced", { 
                state: { 
                  resume: resume.content,
                  jobPosting: resume.jobPosting || ""
                } 
              })}
            >
              <Zap className="mr-1.5 h-3.5 w-3.5" />
              Advanced 면접
            </Button>
          )}
          {/* Advanced (보라색 테두리로 구분) */}
          

          {/* 기본 면접 */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate("/interview", {
              state: { 
                resume: resume.content,
                jobPosting: resume.jobPosting || ""
              }
            })}
          >
            <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
            모의면접
          </Button>

          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground hover:text-destructive"
            onClick={() => deleteResume(resume.id)}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            삭제
          </Button>
        </>
      );
    }

    return viewButton;
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
            나의 자소서
          </h1>
          <p className="text-muted-foreground text-sm">저장된 자기소개서를 확인하세요</p>
        </div>
        <Button
          className="bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white hover:opacity-90"
          onClick={() => navigate("/analyze/new")}
        >
          <Plus className="mr-2 h-4 w-4" />
          새 자소서
        </Button>
      </div>

      {/* 목록 없을 때 */}
      {resumes.length === 0 && (
        <Card className="border border-border/50">
          <CardContent className="pt-12 pb-12 flex flex-col items-center justify-center space-y-4 text-center">
            <div className="inline-flex items-center justify-center p-4 rounded-full bg-[var(--gradient-mid)]/10">
              <Sparkles className="h-8 w-8 text-[var(--gradient-mid)]" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">저장된 자소서가 없습니다</h3>
              <p className="text-sm text-muted-foreground">역량평가 후 자소서를 작성하고 저장해보세요</p>
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

      {/* 자소서 목록 */}
      <div className="space-y-4">
        {resumes.map((resume) => (
          <Card key={resume.id} className="border border-border/50 hover:border-[var(--gradient-mid)]/30 transition-colors">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-start justify-between gap-4">

                {/* 왼쪽 정보 */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <FileText className="h-4 w-4 text-[var(--gradient-mid)] shrink-0" />
                    <span className="font-semibold text-foreground">
                      {resume.title || "자기소개서"}
                    </span>
                    {getStatusBadge(resume.status)}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatDate(resume.createdAt)}
                  </div>
                  {/* 내용 미리보기 */}
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {resume.content?.replace(/#+\s*/g, "").replace(/\*+/g, "").replace(/\n+/g, " ").trim()}
                  </p>
                </div>

                {/* 오른쪽 버튼 */}
                <div className="flex flex-col gap-2 shrink-0">
                  {getActionButtons(resume)}
                </div>

              </div>
            </CardContent>
          </Card>
        ))}
      </div>

    </div>
  );
}