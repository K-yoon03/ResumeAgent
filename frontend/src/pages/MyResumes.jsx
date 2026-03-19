import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Plus, Clock, Trash2, Sparkles, MessageSquare } from "lucide-react";
import { toast } from "sonner";

export default function MyResumes() {
  const navigate = useNavigate();
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResumes();
  }, []);

  const fetchResumes = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch("http://localhost:8080/api/resume", {
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
      const res = await fetch(`http://localhost:8080/api/resume/${id}`, {
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
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white hover:opacity-90"
                    onClick={() => navigate("/resume-writer", {
                      state: { savedResume: resume }
                    })}
                  >
                    <FileText className="mr-1.5 h-3.5 w-3.5" />
                    보기
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate("/interview", {
                      state: { resume: resume.content }
                    })}
                  >
                    <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                    면접 시작
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
                </div>

              </div>
            </CardContent>
          </Card>
        ))}
      </div>

    </div>
  );
}