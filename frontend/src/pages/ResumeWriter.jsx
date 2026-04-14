import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { FileText, TrendingUp, Target, Lightbulb, Edit, ArrowRight, CheckCircle, AlertTriangle, RotateCcw, X, Clock, MessageSquare, ChevronDown, ChevronUp, Loader2, Plus, ChevronRight, Sparkles, BarChart, MapPin } from "lucide-react";
import { BASE_URL } from '../config';
import EvaluationResult from '../components/EvaluationResult';
import { MagicPaste } from '@/components/MagicPaste';
import { useAuth } from '@/context/AuthContext'; // 🔥 추가!

const MAX_HISTORY = 3;
const RESUME_HISTORY_KEY = "resume_history";
const RESUME_CACHE_KEY = (jobPosting, experience) => {
  const text = jobPosting + experience;
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return `resume_${hash}`;
};


// ── STAR 단계 정의 ──
const STAR_STEPS = [
  {
    key: "situation",
    label: "상황",
    question: "어떤 문제나 상황이 있었나요?",
    example: "로그인 유지가 되지 않아 사용자가 반복 로그인해야 했습니다.",
    hints: ["사용자 경험 문제", "성능 이슈", "기술적 한계"],
  },
  {
    key: "task",
    label: "역할",
    question: "본인의 역할이나 담당은 무엇이었나요?",
    example: "세션 관리 구조를 개선하는 백엔드 개발을 담당했습니다.",
    hints: ["담당 역할", "책임 범위", "목표"],
  },
  {
    key: "action",
    label: "행동",
    question: "어떤 방법을 선택했나요?",
    example: "Redis를 도입해 세션을 서버 외부에서 관리하도록 구조를 변경했습니다.",
    hints: ["기술 선택 이유", "구조 변경", "팀원과 협의"],
  },
  {
    key: "result",
    label: "결과",
    question: "결과적으로 무엇이 개선되었나요?",
    example: "로그인 유지율이 95%로 향상되고, 사용자 이탈률이 30% 감소했습니다.",
    hints: ["속도 개선", "안정성 향상", "사용자 변화"],
  },
];

const calcProgress = (star) => {
  const filled = STAR_STEPS.filter(s => star?.[s.key]?.trim().length > 0).length;
  return Math.round((filled / STAR_STEPS.length) * 100);
};

// ── STAR 모달 컴포넌트 ──
// ── 원형 진행률 컴포넌트 ──
function CircularProgress({ progress, size = 44 }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (progress / 100) * circ;
  const color = progress === 100 ? "#22c55e" : "url(#cpGrad)";

  return (
    <svg width={size} height={size} className="shrink-0" style={{ transform: "rotate(-90deg)" }}>
      <defs>
        <linearGradient id="cpGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--gradient-start)" />
          <stop offset="100%" stopColor="var(--gradient-end)" />
        </linearGradient>
      </defs>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="currentColor"
        strokeWidth="3" className="text-muted/30" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color}
        strokeWidth="3" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 0.5s ease" }} />
      <text
        x="50%" y="50%"
        dominantBaseline="middle"
        textAnchor="middle"
        fill="currentColor"
        fontSize={size * 0.22}
        fontWeight="bold"
        style={{ transform: "rotate(90deg)", transformOrigin: `${size/2}px ${size/2}px` }}
      >
        {progress}
      </text>
    </svg>
  );
}


const getQualityBadge = (quality) => {
  switch (quality) {
    case "good":             return { icon: "✅", label: "충분",    cardClass: "border-green-200 bg-green-50 dark:border-green-800/40 dark:bg-green-950/20",  badgeClass: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" };
    case "needs_improvement": return { icon: "⚠️", label: "보완 필요", cardClass: "border-amber-200 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-950/20",  badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" };
    case "insufficient":     return { icon: "❗", label: "부족",    cardClass: "border-red-200 bg-red-50 dark:border-red-800/40 dark:bg-red-950/20",         badgeClass: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" };
    default:                 return { icon: "⚠️", label: "보완 필요", cardClass: "border-amber-200 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-950/20",  badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" };
  }
};

const STAR_BLOCKS = [
  { key: "situation", label: "S", title: "Situation", desc: "상황" },
  { key: "task",      label: "T", title: "Task",      desc: "역할" },
  { key: "action",    label: "A", title: "Action",    desc: "행동" },
  { key: "result",    label: "R", title: "Result",    desc: "결과" },
];

function StarReviewModal({ project, onClose, onSave }) {
  const [star, setStar] = useState(project.star || {});
  const [quality, setQuality] = useState(project.quality || {});
  const [editingKey, setEditingKey] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [improving, setImproving] = useState(null);
  const [improveLoading, setImproveLoading] = useState(false);

  const IMPROVE_OPTIONS = [
    { type: "specific", label: "✨ 더 구체적으로 작성", group: "ai" },
    { type: "metric",   label: "🎯 성과 위주로 강조",  group: "ai" },
    { type: "concise",  label: "✂️ 핵심만 간결하게",   group: "ai" },
    { type: "manual",   label: "✍️ 내가 직접 수정",    group: "manual" },
  ];

  const handleImprove = async (key, type) => {
    if (type === "manual") {
      setEditingKey(key);
      setEditValue(star[key] || "");
      setImproving(null);
      return;
    }
    setImproveLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/api/v1/agent/improve-star`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ field: key, content: star[key], type, projectName: project.name }),
      });
      if (res.ok) {
        const data = await res.json();
        const improved = data.improved;
        setStar(prev => ({ ...prev, [key]: improved }));
        setQuality(prev => ({ ...prev, [key]: "good" }));
        if (project.assessmentId) {
          await fetch(`${BASE_URL}/api/assessments/${project.assessmentId}/star/${encodeURIComponent(project.name)}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ field: key, value: improved }),
          });
        }
      }
    } catch {
      toast.error("개선에 실패했어요");
    } finally {
      setImproveLoading(false);
      setImproving(null);
    }
  };

  const handleEditSave = async (key) => {
    setStar(prev => ({ ...prev, [key]: editValue }));
    setQuality(prev => ({ ...prev, [key]: editValue.trim().length > 30 ? "good" : "needs_improvement" }));
    setEditingKey(null);
    const token = localStorage.getItem("token");
    if (project.assessmentId) {
      await fetch(`${BASE_URL}/api/assessments/${project.assessmentId}/star/${encodeURIComponent(project.name)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ field: key, value: editValue }),
      }).catch(() => {});
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700/50 p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors" onClick={onClose}>
          <X className="h-5 w-5" />
        </button>

        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white pr-8">{project.name}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">STAR 내용을 확인하고 더 완벽하게 다듬어 보세요</p>
        </div>

        <div className="space-y-3">
          {STAR_BLOCKS.map(({ key, label, title, desc }) => {
            const q = quality[key] || (star[key] ? "needs_improvement" : "insufficient");
            const badge = getQualityBadge(q);
            const isEditing = editingKey === key;
            const isImproving = improving?.key === key;

            return (
              <div key={key} className={`rounded-xl border p-5 space-y-3 ${badge.cardClass}`}>
                {/* 헤더 */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] text-white text-xs font-bold flex items-center justify-center shrink-0">
                      {label}
                    </span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{title}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">({desc})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${badge.badgeClass}`}>
                      {badge.icon} {badge.label}
                    </span>
                    {!isEditing && (
                      <button
                        onClick={() => setImproving(isImproving ? null : { key })}
                        className="text-xs px-2.5 py-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                      >
                        🪄 문장 다듬기
                      </button>
                    )}
                  </div>
                </div>

                {/* 내용 */}
                {isEditing ? (
                  <div className="space-y-2">
                    <textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1 border-gray-300 dark:border-gray-600" onClick={() => setEditingKey(null)}>취소</Button>
                      <Button size="sm" className="flex-1 bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white" onClick={() => handleEditSave(key)}>저장</Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    {star[key] || <span className="text-gray-400 dark:text-gray-500 italic">내용이 없어요</span>}
                  </p>
                )}

                {/* 개선 옵션 */}
                {isImproving && !isEditing && (
                  <div className="space-y-2 pt-1 border-t border-gray-200 dark:border-gray-700/50">
                    <div className="space-y-1.5 pt-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">🪄 AI 리라이팅</p>
                      <div className="flex flex-wrap gap-2">
                        {IMPROVE_OPTIONS.filter(o => o.group === "ai").map(opt => (
                          <button
                            key={opt.type}
                            onClick={() => handleImprove(key, opt.type)}
                            disabled={improveLoading}
                            className="text-xs px-3 py-1.5 rounded-full bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white hover:opacity-80 transition-all disabled:opacity-50 font-medium shadow-sm"
                          >
                            {improveLoading && improving?.key === key ? "작성 중..." : opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {IMPROVE_OPTIONS.filter(o => o.group === "manual").map(opt => (
                        <button
                          key={opt.type}
                          onClick={() => handleImprove(key, opt.type)}
                          disabled={improveLoading}
                          className="text-xs px-3 py-1.5 rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <Button
          className="w-full bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white hover:opacity-90 shadow-sm"
          onClick={() => onSave({ ...project, star, quality })}
        >
          <CheckCircle className="mr-2 h-4 w-4" />이대로 적용하기
        </Button>
      </div>
    </div>
  );
}

// ── 메인 컴포넌트 ──
function ResumeWriter() {
  const location = useLocation();
  const navigate = useNavigate();
  const { refreshCredits } = useAuth(); // 🔥 추가!

  const experience = location.state?.experience || "";
  const analysis = location.state?.analysis || "";
  const rawScoreData = location.state?.scoreData || null;
  const assessmentId = location.state?.assessmentId || null;

  const [scoreData, setScoreData] = useState(() => {
    if (rawScoreData) {
      return typeof rawScoreData === "string"
        ? (() => { try { return JSON.parse(rawScoreData); } catch { return null; } })()
        : rawScoreData;
    }
    return null;
  });

  // assessmentId 있으면 API로 scoreData 로드
  useEffect(() => {
    if (assessmentId && !rawScoreData) {
      const token = localStorage.getItem("token");
      fetch(`${BASE_URL}/api/assessments/${assessmentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.scoreData) {
            try { setScoreData(JSON.parse(data.scoreData)); } catch {}
          }
        }).catch(() => {});
    }
  }, [assessmentId]);

  // ── 프로젝트 STAR 관련 state ──
  const [projects, setProjects] = useState([]);
  const [projectsExtracted, setProjectsExtracted] = useState(false);
  const [extractLoading, setExtractLoading] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectsDone, setProjectsDone] = useState(false);
  const [projectsSkipped, setProjectsSkipped] = useState(false);
  const [showAddProject, setShowAddProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectStack, setNewProjectStack] = useState("");
  const [projectAiHints, setProjectAiHints] = useState({}); // {projectName_step: [hints]}
  const [projectAiHintUsed, setProjectAiHintUsed] = useState({}); // {projectName_step: true}
  const extractedRef = useRef(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [useCircular, setUseCircular] = useState(false); // 뱃지 vs 원형 토글

  const [showMagicPaste, setShowMagicPaste] = useState(false);
  const [showSavedPostings, setShowSavedPostings] = useState(false);
  const [savedPostings, setSavedPostings] = useState([]);
  const [loadingPostings, setLoadingPostings] = useState(false);
  const [deletingPosting, setDeletingPosting] = useState(null);

  const [savedResumeId, setSavedResumeId] = useState(null); // 추가!
  const [evaluation, setEvaluation] = useState(null); // 추가!
  const [evaluating, setEvaluating] = useState(false); 

  const [resume, setResume] = useState("");
  const [editedResume, setEditedResume] = useState("");
  const [loading, setLoading] = useState(false);
  const [jobPosting, setJobPosting] = useState("");
  const [jobForm, setJobForm] = useState({
    companyName: "", position: "", mainTasks: "",
    requirements: "", preferred: "", techStack: "",
    workPlace: "", employmentType: "", vision: "",
  });
  const [jobConfirmed, setJobConfirmed] = useState(false);
  const [jobMode, setJobMode] = useState(null);
  const [editableSections, setEditableSections] = useState(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [resumeFeedback, setResumeFeedback] = useState(null);
  const [feedbackOpen, setFeedbackOpen] = useState(true);
  const [hasCache, setHasCache] = useState(() => {
    const h = sessionStorage.getItem(RESUME_HISTORY_KEY);
    return h ? JSON.parse(h).length > 0 : false;
  });

  const confirmedTextareaRef = useRef(null);

  useEffect(() => {
    if (isConfirmed && confirmedTextareaRef.current) {
      const el = confirmedTextareaRef.current;
      el.style.height = "auto";
      el.style.height = el.scrollHeight + "px";
    }
  }, [isConfirmed]);

  // 진입 시 프로젝트 자동 추출
  useEffect(() => {
    if (!projectsExtracted && !projectsDone && !projectsSkipped) {
      if (extractedRef.current) return;
      extractedRef.current = true;
      if (assessmentId) {
        extractStarFromAssessment();
      } else if (experience) {
        extractProjects();
      }
    }
  }, []);
  useEffect(() => {
    if (editedResume) {
      const textareas = document.querySelectorAll("textarea");
      textareas.forEach(el => {
        el.style.height = "auto";
        el.style.height = el.scrollHeight + "px";
      });
    }
  }, [editedResume]);

const extractStarFromAssessment = async () => {
  if (extractLoading) return;
  setExtractLoading(true);
  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${BASE_URL}/api/assessments/${assessmentId}/extract-star`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      if (data.length > 0) {
        setProjects(data.map(p => ({
          name: p.itemName,
          assessmentId: assessmentId,
          star: {
            situation: p.situation || "",
            task: p.task || "",
            action: p.action || "",
            result: p.result || "",
          },
          quality: p.quality || {},
          isCreative: p.isCreative,
        })));
      }
      setProjectsExtracted(true);
    } else {
      // extract-star 실패 시 기존 방식으로 fallback
      await extractProjects();
    }
  } catch {
    setProjectsExtracted(true);
  } finally {
    setExtractLoading(false);
  }
};

const extractProjects = async () => {
  if (extractLoading) return;
  setExtractLoading(true);
  try {
    const token = localStorage.getItem("token");
    
    // 백엔드 /extract가 알아서 처리
    // - assessmentId 있고 저장된 거 있으면 → 반환
    // - 없으면 → 추출 + 저장
    const res = await fetch(`${BASE_URL}/api/projects/extract`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { "Authorization": `Bearer ${token}` }),
      },
      body: JSON.stringify({
        experience,
        assessmentId: assessmentId
      }),
    });
    
    if (res.ok) {
      const data = await res.json();
      if (data.length > 0) {
        setProjects(data.map(p => ({
          ...p,
          star: {
            situation: p.situation || "",
            reason: p.reason || "",
            action: p.action || "",
            result: p.result || "",
          }
        })));
      }
      setProjectsExtracted(true);
    } else {
      setProjectsExtracted(true);
    }
  } catch {
    setProjectsExtracted(true);
  } finally {
    setExtractLoading(false);
  }
};

  const saveProjectStar = async (updated) => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        if (updated.id) {
          // 기존 프로젝트 업데이트
          await fetch(`${BASE_URL}/api/projects/${updated.id}/star`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
              situation: updated.star.situation || "",
              reason: updated.star.reason || "",
              action: updated.star.action || "",
              result: updated.star.result || "",
            })
          });
        } else {
          // 신규 프로젝트 저장
          const res = await fetch(`${BASE_URL}/api/projects`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
              name: updated.name,
              techStack: updated.techStack,
              assessmentId: location.state?.assessmentId || null,
              situation: updated.star.situation || "",
              reason: updated.star.reason || "",
              action: updated.star.action || "",
              result: updated.star.result || "",
            })
          });
          if (res.ok) {
            const data = await res.json();
            updated.id = data.id; // id 받아서 업데이트
          }
        }
      } catch {
        // 저장 실패해도 로컬 상태는 업데이트
      }
    }
    setProjects(prev => prev.map(p => p.name === updated.name ? updated : p));
    setSelectedProject(null);
    toast.success("경험이 저장되었습니다!");
  };
  const handleDeleteProject = async (idx, project) => {
    // DB에서 삭제
    if (project.id) {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          await fetch(`${BASE_URL}/api/projects/${project.id}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
          });
        } catch {
          // 삭제 실패해도 로컬에서는 제거
        }
      }
    }
    // state에서 제거
    setProjects(prev => prev.filter((_, i) => i !== idx));
    setDeleteConfirm(null);
    toast.success("프로젝트가 삭제되었습니다.");
  };

  const addProject = async () => {
    if (!newProjectName.trim()) { toast.error("프로젝트 이름을 입력해주세요!"); return; }
    
    const token = localStorage.getItem("token");
    let savedId = null;

    if (token) {
      try {
        const res = await fetch(`${BASE_URL}/api/projects`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            name: newProjectName.trim(),
            techStack: newProjectStack.trim() || "미입력",
            assessmentId: location.state?.assessmentId || null
          })
        });
        if (res.ok) {
          const data = await res.json();
          savedId = data.id;
        }
      } catch {}
    }

    setProjects(prev => [...prev, {
      id: savedId,
      name: newProjectName.trim(),
      techStack: newProjectStack.trim() || "미입력",
      star: {}
    }]);
    setNewProjectName(""); setNewProjectStack(""); setShowAddProject(false);
    toast.success("프로젝트가 추가되었습니다!");
  };

  const buildAdditionalInfo = () => {
    if (projectsSkipped || projects.length === 0) return "";
    const withStar = projects.filter(p => calcProgress(p.star) > 0);
    if (withStar.length === 0) return "";
    return withStar.map(p => {
      const s = p.star;
      return `[프로젝트: ${p.name}]\n` +
        (s.situation ? `- 상황: ${s.situation}\n` : "") +
        (s.task ? `- 역할: ${s.task}\n` : "") +
        (s.action ? `- 행동: ${s.action}\n` : "") +
        (s.result ? `- 결과: ${s.result}` : "");
    }).join("\n\n");
  };

  const getDisplayTextFromSections = (sections) => {
    return Object.entries(sections)
      .map(([title, content], i) =>
        `${i + 1}. ${title}\n\n${content.replace(/\[AI\]|\[\/AI\]/g, "")}`
      ).join("\n\n");
  };



  if (!experience && !analysis && !assessmentId) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center space-y-4">
        <h2 className="text-xl font-semibold text-foreground">데이터가 없습니다.</h2>
        <p className="text-muted-foreground">먼저 역량 분석을 진행해주세요.</p>
        <Button onClick={() => navigate("/analyze")} className="bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white">
          역량 분석하러 가기
        </Button>
      </div>
    );
  }

  const scoreCategories = scoreData?.competencyScores
    ? scoreData.competencyScores.map(c => ({ name: c.name || c.capCode, score: c.score }))
    : [];

  const getHistory = () => JSON.parse(sessionStorage.getItem(RESUME_HISTORY_KEY) || "[]");

  const saveToHistory = (cacheKey, fullText, form, mode, posting) => {
    const history = getHistory();
    const preview = form.companyName
      ? `${form.companyName}${form.position ? " · " + form.position : ""}`
      : mode === "quick" ? "임의 회사" : "채용공고 없음";
    const resultPreview = fullText.replace(/#+\s*/g, "").replace(/\*+/g, "").replace(/\n+/g, " ").trim().slice(0, 60) + "...";
    const newEntry = { key: cacheKey, timestamp: Date.now(), preview, resultPreview, savedJobForm: form, savedJobMode: mode, savedJobPosting: posting };
    const filtered = history.filter(h => h.key !== cacheKey);
    const removedKeys = filtered.slice(MAX_HISTORY - 1).map(h => h.key);
    removedKeys.forEach(k => sessionStorage.removeItem(k));
    const updated = [newEntry, ...filtered].slice(0, MAX_HISTORY);
    sessionStorage.setItem(RESUME_HISTORY_KEY, JSON.stringify(updated));
    setHasCache(true);
  };

  const openHistory = () => {
    const history = getHistory();
    if (history.length === 0) { toast.error("이전 자소서 내용이 없습니다."); return; }
    setIsHistoryOpen(true);
  };

  const restoreFromHistory = (entry) => {
    const cached = sessionStorage.getItem(entry.key);
    if (!cached) { toast.error("해당 자소서를 찾을 수 없습니다."); return; }
    try {
      const { resume: r, editableSections: es } = JSON.parse(cached);
      if (entry.savedJobForm) setJobForm(entry.savedJobForm);
      if (entry.savedJobMode) setJobMode(entry.savedJobMode);
      if (entry.savedJobPosting) { setJobPosting(entry.savedJobPosting); setJobConfirmed(true); }
      if (r) setResume(r);
      if (es) { setEditableSections(es); setEditedResume(getDisplayTextFromSections(es)); }
      setIsConfirmed(false); setIsHistoryOpen(false);
      toast.success("이전 자소서를 불러왔습니다.");
    } catch { toast.error("불러오는데 실패했습니다."); }
  };

  const resetJobPosting = () => {
    setJobForm({ companyName: "", position: "", mainTasks: "", requirements: "", preferred: "", techStack: "", workPlace: "", employmentType: "", vision: "" });
    setJobPosting(""); setJobConfirmed(false); setJobMode(null);
    toast.success("채용공고가 초기화되었습니다.");
  };

  const resetResume = () => {
    setResume(""); setEditedResume(""); setEditableSections(null); setIsConfirmed(false); setResumeFeedback(null);
    toast.success("자소서가 초기화되었습니다.");
  };
  const handleProjectsDone = async () => {
    const token = localStorage.getItem("token");
    if (token) {
      const toSave = projects.filter(p => calcProgress(p.star) > 0);
      for (const project of toSave) {
        try {
          if (project.id) {
            // 기존 프로젝트 STAR 업데이트
            await fetch(`${BASE_URL}/api/projects/${project.id}/star`, {
              method: "PUT",
              headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
              body: JSON.stringify(project.star)
            });
          } else {
            // 신규 프로젝트 저장
            const res = await fetch(`${BASE_URL}/api/projects`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
              body: JSON.stringify({
                name: project.name,
                techStack: project.techStack,
                assessmentId: location.state?.assessmentId || null,
                ...project.star
              })
            });
            if (res.ok) {
              const data = await res.json();
              // id 업데이트
              setProjects(prev => prev.map(p => p.name === project.name ? { ...p, id: data.id } : p));
            }
          }
        } catch {}
      }
    }
    setProjectsDone(true);
  };

  const clearHistory = () => {
    const history = getHistory();
    history.forEach(entry => sessionStorage.removeItem(entry.key));
    sessionStorage.removeItem(RESUME_HISTORY_KEY);
    setHasCache(false); setIsHistoryOpen(false);
    toast.success("이전 자소서 내용이 모두 삭제되었습니다.");
  };

  const formatTime = (ts) => {
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const handleJobFormChange = (e) => {
    setJobForm({ ...jobForm, [e.target.name]: e.target.value });
    e.target.style.height = "auto";
    e.target.style.height = e.target.scrollHeight + "px";
  };
  // 저장된 공고 목록 불러오기 (JobPostings + Companies 공고 통합)
const fetchSavedPostings = async () => {
  setLoadingPostings(true);
  const token = localStorage.getItem("token");
  try {
    // 기존 JobPostings
    const jobRes = await fetch(`${BASE_URL}/api/job-postings`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const jobData = jobRes.ok ? await jobRes.json() : [];

    // Companies + 각 기업의 공고 병렬 로드
    const companyRes = await fetch(`${BASE_URL}/api/companies`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const companies = companyRes.ok ? await companyRes.json() : [];

    const companyItems = (await Promise.all(
      companies.map(async (c) => {
        // 공고 조회
        const postings = await fetch(`${BASE_URL}/api/companies/${c.id}/postings`, {
          headers: { "Authorization": `Bearer ${token}` }
        }).then(r => r.ok ? r.json() : []).catch(() => []);

        if (postings.length === 0) {
          // 공고 없는 기업 → 회사명만 채워주는 항목
          return [{
            id: `company_${c.id}`,
            companyName: c.companyName,
            position: "",
            mainTasks: "", requirements: "", preferred: "",
            techStack: "", workPlace: "", employmentType: "", vision: "",
            _source: "company",
            _companyId: c.id,
            _isPrimary: c.isPrimary || false,
            _noPosting: true,
          }];
        }

        // 공고 있는 기업 → 공고별 항목
        return postings.map(p => {
          let parsed = null;
          try { parsed = JSON.parse(p.parsedData); } catch {}
          // parsedData가 jobForm 형식인지 JD 분석 결과인지 구분
          const isJobFormData = parsed && parsed.mainTasks !== undefined;
          return {
            id: `company_${p.id}`,
            companyName: c.companyName,
            position: p.position || (isJobFormData ? parsed?.position : "") || "",
            mainTasks: isJobFormData ? parsed?.mainTasks || "" : "",
            requirements: isJobFormData ? parsed?.requirements || "" : "",
            preferred: isJobFormData ? parsed?.preferred || "" : "",
            techStack: isJobFormData ? parsed?.techStack || "" : "",
            workPlace: isJobFormData ? parsed?.workPlace || "" : "",
            employmentType: isJobFormData ? parsed?.employmentType || "" : "",
            vision: isJobFormData ? parsed?.vision || "" : "",
            _source: "company",
            _companyId: c.id,
            _postingId: p.id,
            _isPrimary: c.isPrimary || false,
          };
        });
      })
    )).flat();

    setSavedPostings([
      ...jobData,
      ...companyItems.sort((a, b) => (b._isPrimary ? 1 : 0) - (a._isPrimary ? 1 : 0)),
    ]);
  } catch {
    toast.error("공고를 불러오는데 실패했습니다.");
  } finally {
    setLoadingPostings(false);
  }
};
 
// 저장된 공고 선택
const selectSavedPosting = (posting) => {
  setJobForm({
    companyName: posting.companyName || "",
    position: posting.position || "",
    mainTasks: posting.mainTasks || "",
    requirements: posting.requirements || "",
    preferred: posting.preferred || "",
    techStack: posting.techStack || "",
    workPlace: posting.workPlace || "",
    employmentType: posting.employmentType || "",
    vision: posting.vision || "",
  });
  setShowSavedPostings(false);
  setJobMode("form");
  toast.success("저장된 공고를 불러왔습니다!");
};
 
// 저장된 공고 삭제
const deleteSavedPosting = async (id) => {
  const token = localStorage.getItem("token");
  try {
    const res = await fetch(`${BASE_URL}/api/job-postings/${id}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (res.ok) {
      setSavedPostings(prev => prev.filter(p => p.id !== id));
      setDeletingPosting(null);
      toast.success("공고가 삭제되었습니다.");
    }
  } catch {
    toast.error("삭제에 실패했습니다.");
  }
};
  const confirmJobForm = () => {
    if (!jobForm.companyName && !jobForm.position && !jobForm.mainTasks) {
      toast.error("최소 회사명, 직무, 주요 업무 중 하나는 입력해주세요."); return;
    }
    const formatted = `
회사명: ${jobForm.companyName || "없음"}
직무/포지션: ${jobForm.position || "없음"}
주요 업무: ${jobForm.mainTasks || "없음"}
자격 요건: ${jobForm.requirements || "없음"}
우대 사항: ${jobForm.preferred || "없음"}
기술 스택: ${jobForm.techStack || "없음"}
근무지: ${jobForm.workPlace || "없음"}
고용 형태: ${jobForm.employmentType || "없음"}
회사 비전/문화: ${jobForm.vision || "없음"}
    `.trim();
    setJobPosting(formatted); setJobConfirmed(true);
    toast.success("채용공고가 입력되었습니다.");
  };

  const parseResumeToSections = (text) => {
    const cleanText = text.replace(/\[FEEDBACK\][\s\S]*?\[\/FEEDBACK\]/g, "").trim();
    const sectionTitles = ["성장 과정", "지원 동기", "직무 역량", "입사 후 포부"];
    const result = {};
    sectionTitles.forEach((title, i) => {
      const currentPattern = new RegExp(`${i + 1}\\.\\s*\\*{0,2}${title}\\*{0,2}`);
      const nextPattern = i < sectionTitles.length - 1
        ? new RegExp(`${i + 2}\\.\\s*\\*{0,2}${sectionTitles[i + 1]}\\*{0,2}`)
        : null;
      const startMatch = cleanText.search(currentPattern);
      const endMatch = nextPattern ? cleanText.search(nextPattern) : cleanText.length;
      if (startMatch !== -1) {
        let content = cleanText.slice(startMatch, endMatch !== -1 ? endMatch : cleanText.length);
        content = content.replace(currentPattern, "").trim();
        result[title] = content;
      } else {
        result[title] = "";
      }
    });
    return result;
  };

  const parseFeedback = (text) => {
    const match = text.match(/\[FEEDBACK\]([\s\S]*?)\[\/FEEDBACK\]/);
    if (!match) return null;
    const lines = match[1].trim().split("\n").filter(l => l.trim());
    const feedback = { included: [], enhanced: [], excluded: [] };
    lines.forEach(line => {
      if (line.startsWith("- 포함:")) feedback.included.push(line.replace("- 포함:", "").trim());
      else if (line.startsWith("- 보강:")) feedback.enhanced.push(line.replace("- 보강:", "").trim());
      else if (line.startsWith("- 제외:")) feedback.excluded.push(line.replace("- 제외:", "").trim());
    });
    return feedback;
  };

  const generateResume = async () => {
    setResume(""); setEditedResume(""); setEditableSections(null); setIsConfirmed(false); setResumeFeedback(null);
    setLoading(true);

    const additionalInfo = buildAdditionalInfo();
    const cacheKey = RESUME_CACHE_KEY(jobPosting, experience + additionalInfo);
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        const { resume: r, feedback: fb } = JSON.parse(cached);
        if (r && r.trim().length > 0) {
          const cleanText = r.replace(/\[FEEDBACK\][\s\S]*?\[\/FEEDBACK\]/g, "").trim();
          setResume(r); setEditedResume(cleanText);
          if (fb) setResumeFeedback(fb);
          setLoading(false);
          toast.success("이전에 생성한 자소서를 불러왔습니다.");
          return;
        } else {
          sessionStorage.removeItem(cacheKey);
        }
      } catch { sessionStorage.removeItem(cacheKey); }
    }

    const token = localStorage.getItem("token"); // 🔥 추가!

    const response = await fetch(`${BASE_URL}/api/resume/generate`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        experience: experience || additionalInfo,
        analysis: analysis || "",
        jobPosting,
        additionalInfo: experience ? additionalInfo : ""
      })
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = ""; let fullText = ""; let done = false;

    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (line.startsWith("data:")) {
          const text = line.slice(5);
          if (text.trim() === "[DONE]") { done = true; break; }
          if (text === "") { fullText += "\n"; setResume(prev => prev + "\n"); }
          else { fullText += text; setResume(prev => prev + text); }
        }
      }
    }
    if (buffer && buffer.startsWith("data:")) {
      const text = buffer.slice(5);
      if (text.trim() !== "[DONE]") { fullText += text; setResume(prev => prev + text); }
    }

    const feedback = parseFeedback(fullText);
    if (feedback) setResumeFeedback(feedback);
    const cleanText = fullText.replace(/\[FEEDBACK\][\s\S]*?\[\/FEEDBACK\]/g, "").trim();
    setEditedResume(cleanText);
    sessionStorage.setItem(cacheKey, JSON.stringify({ resume: fullText, editableSections: null, feedback }));
    saveToHistory(cacheKey, fullText, jobForm, jobMode, jobPosting);
    setLoading(false);
  };

  const handleConfirm = async () => {
    setIsAnimating(true);
    setTimeout(() => { setIsAnimating(false); setIsConfirmed(true); }, 800);

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      let jobPostingId = null;
      let resumeId = null;
      
      if (jobMode === "form" && jobConfirmed) {
        const jpRes = await fetch(`${BASE_URL}/api/job-postings`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body: JSON.stringify(jobForm)
        });
        if (jpRes.ok) { const jpData = await jpRes.json(); jobPostingId = jpData.id; }
      }
      
      const title = jobForm.companyName
        ? `${jobForm.companyName}${jobForm.position ? " · " + jobForm.position : ""}`
        : "자기소개서";
        
      // 자소서 저장
      const saveRes = await fetch(`${BASE_URL}/api/resume/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ content: editedResume, title, assessmentId: location.state?.assessmentId || null, jobPostingId })
      });
      
      if (saveRes.ok) {
        const savedData = await saveRes.json();
        resumeId = savedData.id;
        setSavedResumeId(resumeId); // 🔥 이 줄 추가!!!
        
        // 확정 API 호출
        await fetch(`${BASE_URL}/api/resume/${resumeId}/confirm`, {
          method: "PUT",
          headers: { "Authorization": `Bearer ${token}` }
        });
        
        toast.success("자소서가 저장되었습니다.");
      }
    } catch { 
      toast.error("저장에 실패했습니다."); 
    }
  };
  const handleEvaluate = async () => {
    if (!savedResumeId) {
      toast.error("자소서 ID가 없습니다. 다시 확정해주세요.");
      return;
    }
      
    setEvaluating(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${BASE_URL}/api/resume/${savedResumeId}/evaluate`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setEvaluation(data.evaluation);
        refreshCredits(); // 🔥 크레딧 갱신!
        toast.success("평가가 완료되었습니다!");
      } else {
        // 🔥 추가: res.ok가 false면 에러 throw
        throw new Error(`평가 실패: ${res.status}`);
      }
    } catch (err) {
      console.error(err);
      toast.error("평가에 실패했습니다.");
    } finally {
      setEvaluating(false);
    }
  };

  const inputClass = "w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--gradient-mid)]/50 focus:border-[var(--gradient-mid)] transition-all";
  const textareaClass = `${inputClass} resize-none overflow-hidden`;
  const allProjectsProgress = projects.length > 0
    ? Math.round(projects.reduce((sum, p) => sum + calcProgress(p.star), 0) / projects.length)
    : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 space-y-8">

      {/* STAR 모달 */}
      {selectedProject && (
        <StarReviewModal
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
          onSave={saveProjectStar}
        />
      )}
      {/* 삭제 확인 모달 */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-foreground">프로젝트 삭제</h3>
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">{deleteConfirm.project.name}</strong> 프로젝트를 삭제하시겠어요?<br />
              작성한 STAR 내용이 모두 사라집니다.
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
              className="flex-1 bg-red-500 text-white hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700"
              onClick={() => handleDeleteProject(deleteConfirm.idx, deleteConfirm.project)}
            >
              삭제
            </Button>
            </div>
          </div>
        </div>
      )}

      {/* 확정 애니메이션 */}
      {isAnimating && (
        <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
          <style>{`
            @keyframes confirmFlash { 0% { opacity: 0; } 20% { opacity: 1; } 100% { opacity: 0; } }
            @keyframes confirmSweep { 0% { transform: scaleX(0); transform-origin: left; } 100% { transform: scaleX(1); transform-origin: left; } }
            @keyframes confirmBadge { 0% { transform: scale(0.5) translateY(20px); opacity: 0; } 40% { transform: scale(1.1) translateY(0); opacity: 1; } 70% { transform: scale(1) translateY(0); opacity: 1; } 100% { transform: scale(1) translateY(0); opacity: 0; } }
          `}</style>
          <div className="absolute inset-0 bg-green-500/10" style={{ animation: "confirmFlash 0.8s ease-out forwards" }} />
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-green-400 via-emerald-400 to-green-400" style={{ animation: "confirmSweep 0.8s ease-out forwards" }} />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex items-center gap-3 bg-green-500 text-white px-6 py-3 rounded-full shadow-2xl text-sm font-semibold" style={{ animation: "confirmBadge 0.8s ease-out forwards" }}>
              <CheckCircle className="h-5 w-5" />자소서가 확정되었습니다!
            </div>
          </div>
        </div>
      )}

      {/* 헤더 */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center p-3 rounded-full bg-gradient-to-br from-[var(--gradient-start)] via-[var(--gradient-mid)] to-[var(--gradient-end)]">
          <FileText className="h-7 w-7 text-white" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-[var(--gradient-start)] via-[var(--gradient-mid)] to-[var(--gradient-end)] bg-clip-text text-transparent">
          역량 분석 및 자기소개서
        </h1>
        <p className="text-muted-foreground">AI가 분석한 당신의 역량과 맞춤형 자기소개서를 확인하세요</p>
      </div>

      <Tabs defaultValue="analysis" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="analysis">역량 분석</TabsTrigger>
          <TabsTrigger value="resume">자기소개서</TabsTrigger>
        </TabsList>

        {/* 역량 분석 탭 */}
        <TabsContent value="analysis" className="space-y-6 mt-6">
          {scoreData && (
            <Card className="border border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-5 w-5 text-[var(--gradient-mid)]" />종합 역량 점수
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-8">
                  <div className="relative w-28 h-28 shrink-0">
                    <svg className="transform -rotate-90 w-28 h-28">
                      <circle cx="56" cy="56" r="48" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-muted" />
                      <circle cx="56" cy="56" r="48" stroke="url(#scoreGradient)" strokeWidth="8" fill="transparent"
                        strokeDasharray={`${2 * Math.PI * 48}`}
                        strokeDashoffset={`${2 * Math.PI * 48 * (1 - scoreData.totalScore / 100)}`}
                        className="transition-all duration-1000" />
                      <defs>
                        <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="var(--gradient-start)" />
                          <stop offset="50%" stopColor="var(--gradient-mid)" />
                          <stop offset="100%" stopColor="var(--gradient-end)" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-bold">{scoreData.totalScore}</span>
                    </div>
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    종합 역량 점수 <strong className="text-foreground">{scoreData.totalScore}점</strong>으로,{" "}
                    {scoreData.totalScore >= 80 ? "매우 우수한" : scoreData.totalScore >= 60 ? "양호한" : "보완이 필요한"} 수준입니다.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
          {scoreCategories.length > 0 && (
            <Card className="border border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Target className="h-5 w-5 text-[var(--gradient-mid)]" />세부 역량 분석
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {scoreCategories.map(({ name, score }) => (
                  <div key={name} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{name}</span>
                      <span className="text-muted-foreground">{score}점</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-[var(--gradient-start)] via-[var(--gradient-mid)] to-[var(--gradient-end)] transition-all duration-700"
                        style={{ width: `${score}%` }} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          {scoreData && (
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base text-green-600 dark:text-green-400">
                    <Lightbulb className="h-5 w-5" />강점
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {scoreData.strengths?.map((s, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Badge variant="secondary" className="mt-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">{i + 1}</Badge>
                        <span className="text-sm">{s}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              <Card className="border border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base text-orange-600 dark:text-orange-400">
                    <Target className="h-5 w-5" />개선 포인트
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {scoreData.improvements?.map((imp, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Badge variant="secondary" className="mt-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">{i + 1}</Badge>
                        <span className="text-sm">{imp}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}
          {analysis && (
            <Card className="border border-border/50">
              <CardHeader><CardTitle className="text-base">🔍 상세 분석 리포트</CardTitle></CardHeader>
              <CardContent>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{analysis}</ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          )}
          {!scoreData && (
            <Card className="border border-border/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-sm">
                  <AlertTriangle className="h-4 w-4" />역량 점수를 불러오지 못했습니다.
                </div>
                {analysis && (
                  <div className="prose prose-sm dark:prose-invert max-w-none mt-4">
                    <ReactMarkdown>{analysis}</ReactMarkdown>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 자기소개서 탭 */}
        <TabsContent value="resume" className="space-y-6 mt-6">

          {/* ── 프로젝트 STAR 단계 ── */}
          {!projectsDone && !projectsSkipped && (
            <Card className="border border-[var(--gradient-mid)]/30">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  🗂️ 프로젝트 경험 정리
                  <Badge className="bg-[var(--gradient-mid)]/10 text-[var(--gradient-mid)]">자소서 퀄리티 향상</Badge>
                </CardTitle>
                <CardDescription>
                  작성하신 경험을 AI가 STAR 기법으로 분석했습니다. 내용을 확인하고 더 완벽하게 다듬어 보세요.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {extractLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    심층 인터뷰 기반으로 경험을 추출하고 있어요...
                  </div>
                ) : (
                  <>
                    {/* 전체 완성도 */}
                    {projects.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">전체 완성도</span>
                          <span className={`font-semibold ${allProjectsProgress === 100 ? "text-green-500" : "text-[var(--gradient-mid)]"}`}>
                            {allProjectsProgress}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${allProjectsProgress === 100 ? "bg-green-500" : "bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)]"}`}
                            style={{ width: `${allProjectsProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* 뷰 토글 */}
                    <div className="flex justify-end mb-2">
                      <button
                        onClick={() => setUseCircular(v => !v)}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                      >
                        {useCircular ? "뱃지 뷰" : "원형 뷰"} 전환
                      </button>
                    </div>

                    {/* 프로젝트 카드 목록 */}
                    {projects.map((project, idx) => {
                      const progress = calcProgress(project.star || {});
                      const star = project.star || {};
                      const summary = star.situation
                        ? star.situation.slice(0, 60) + (star.situation.length > 60 ? "..." : "")
                        : null;

                      return (
                        <div key={idx} className="group relative rounded-xl border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-gray-800/60 hover:border-purple-300 dark:hover:border-purple-700/50 hover:shadow-sm transition-all duration-200 p-5">

                          {/* 삭제 버튼 */}
                          <button
                            onClick={() => {
                              if (progress > 0) setDeleteConfirm({ idx, project });
                              else handleDeleteProject(idx, project);
                            }}
                            className="absolute top-3 right-3 text-muted-foreground/40 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all duration-200"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>

                          <div className="flex items-center gap-3 pr-5">
                            {/* 원형 그래프 버전 */}
                            {useCircular && (
                              <CircularProgress progress={progress} size={44} />
                            )}

                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">{project.name}</p>
                                {!useCircular && (
                                  progress === 100 ? (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 font-medium">✅ 완성</span>
                                  ) : progress > 0 ? (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 font-medium">{progress}%</span>
                                  ) : (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 font-medium">미작성</span>
                                  )
                                )}
                              </div>
                              {summary ? (
                                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-1">{summary}</p>
                              ) : (
                                <p className="text-xs text-gray-400 dark:text-gray-500 italic">STAR 내용을 작성하면 요약이 표시돼요</p>
                              )}
                            </div>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedProject(project)}
                              className="shrink-0 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-purple-400 dark:hover:border-purple-500 transition-colors"
                            >
                              {progress > 0 ? "AI 분석 결과 보기" : "STAR 작성하기"}
                              <ChevronRight className="ml-1 h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}

                    {/* 프로젝트 추가 */}
                    {!showAddProject ? (
                      <button
                        onClick={() => setShowAddProject(true)}
                        className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-[var(--gradient-mid)]/30 text-sm text-[var(--gradient-mid)] hover:bg-[var(--gradient-mid)]/5 transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                        프로젝트 직접 추가
                      </button>
                    ) : (
                      <div className="space-y-2 p-4 rounded-xl border border-[var(--gradient-mid)]/30 bg-[var(--gradient-mid)]/5">
                        <input type="text" value={newProjectName}
                          onChange={(e) => setNewProjectName(e.target.value)}
                          placeholder="프로젝트 이름"
                          className={`${inputClass} bg-background text-foreground`}
                        />
                        <input type="text" value={newProjectStack}
                          onChange={(e) => setNewProjectStack(e.target.value)}
                          placeholder="기술 스택 (예: React, Spring Boot)"
                          className={`${inputClass} bg-background text-foreground`}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" className="flex-1 bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white hover:opacity-90"
                            onClick={addProject}>추가</Button>
                          <Button size="sm" variant="outline" onClick={() => setShowAddProject(false)}>취소</Button>
                        </div>
                      </div>
                    )}

                    {projects.length === 0 && projectsExtracted && !extractLoading && (
                      <p className="text-sm text-muted-foreground text-center py-2">
                        추출된 프로젝트가 없어요. 직접 추가해보세요!
                      </p>
                    )}

                    <div className="flex gap-3 pt-2">
                      <Button
                        className="flex-1 bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white hover:opacity-90"
                        onClick={handleProjectsDone}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        완료! 자소서 작성하러 가기
                      </Button>
                      <Button variant="outline" onClick={() => setProjectsSkipped(true)} className="text-muted-foreground">
                        건너뛰기
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* 완료/스킵 상태 표시 */}
          {(projectsDone || projectsSkipped) && (
            <div className={`flex items-center gap-2 text-sm px-1 py-2 rounded-lg ${
              projectsSkipped
                ? "text-amber-600 dark:text-amber-400 bg-amber-500/10"
                : allProjectsProgress >= 75
                ? "text-green-600 dark:text-green-400 bg-green-500/10"
                : "text-[var(--gradient-mid)] bg-[var(--gradient-mid)]/10"
            }`}>
              {projectsSkipped ? (
                <>
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span>경험 서술을 건너뛰었어요. AI 보완 내용이 많아질 수 있어요.</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>
                    경험 서술 완료!
                    {allProjectsProgress > 0 && ` (평균 완성도 ${allProjectsProgress}%)`}
                    자소서에 반영됩니다.
                  </span>
                </>
              )}
              <button
              className="ml-auto text-xs px-3 py-1.5 rounded-lg border border-[var(--gradient-mid)]/30 text-[var(--gradient-mid)] hover:bg-[var(--gradient-mid)]/10 transition-colors shrink-0"
              onClick={() => { setProjectsDone(false); setProjectsSkipped(false); }}
            >
              ✏️ 다시 작성
            </button>
            </div>
          )}

          {/* 채용공고 + 자소서 */}
          {(projectsDone || projectsSkipped) && (
            <>
              <Card className="border border-border/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">채용공고 입력</CardTitle>
                      <CardDescription>채용공고를 입력하면 더 정확한 자소서가 생성됩니다</CardDescription>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="sm" onClick={openHistory} className="shrink-0">
                        <RotateCcw className="mr-1.5 h-3.5 w-3.5" />불러오기
                      </Button>
                      {jobMode && (
                        <Button variant="outline" size="sm" onClick={resetJobPosting} className="shrink-0 text-muted-foreground">
                          <X className="mr-1.5 h-3.5 w-3.5" />초기화
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!jobMode && (
                    <>
                      <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />바로 만들기 시 모의 면접 진행이 불가능합니다.
                      </p>
                      
                      <div className="grid grid-cols-2 gap-3">
                        {/* 매직 페이스트 버튼 */}
                        <Button
                          variant="outline"
                          className="border-2 border-dashed border-[var(--gradient-mid)]/40 hover:bg-[var(--gradient-mid)]/5"
                          onClick={() => setShowMagicPaste(true)}
                        >
                          <Sparkles className="mr-2 h-4 w-4 text-[var(--gradient-mid)]" />
                          매직 페이스트
                        </Button>
                        
                        {/* 저장된 공고 불러오기 */}
                        <Button
                          variant="outline"
                          className="border-2 border-dashed border-blue-400/40 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                          onClick={() => {
                            setShowSavedPostings(true);
                            fetchSavedPostings();
                          }}
                        >
                          <FileText className="mr-2 h-4 w-4 text-blue-600" />
                          불러오기
                        </Button>
                      </div>
                      
                      <div className="flex gap-3">
                        <Button className="flex-1 bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white hover:opacity-90"
                          onClick={() => setJobMode("form")}>
                          📋 직접 입력하기
                        </Button>
                        <Button variant="outline" className="flex-1" onClick={() => setJobMode("quick")}>
                          ⚡ 바로 만들기
                        </Button>
                      </div>
                    </>
                  )}
                  <MagicPaste 
                    isOpen={showMagicPaste}
                    onClose={() => setShowMagicPaste(false)}
                    onParsed={(json) => {
                      // 1. 개별 입력 칸(jobForm)에 데이터 꽂아넣기
                      setJobForm({
                        companyName: json.companyName || "",
                        position: json.position || "",
                        mainTasks: json.mainTasks || "",
                        requirements: json.requirements || "",
                        preferred: json.preferred || "",
                        techStack: json.techStack || "",
                        workPlace: json.workPlace || "",
                        employmentType: json.employmentType || "",
                        vision: json.vision || "",
                      });

                      // 2. 모드를 'form'으로 바꿔서 입력 폼 화면이 보이게 하기
                      setJobMode("form");

                      // 3. 모달 닫기
                      setShowMagicPaste(false);

                      toast.success('채용공고 정보가 자동 입력되었습니다!');
                    }}
                  />
                {showSavedPostings && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                  <div className="relative w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
                    <button
                      className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowSavedPostings(false)}
                    >
                      <X className="h-5 w-5" />
                    </button>
              
                    <h3 className="text-xl font-bold text-foreground mb-1">저장된 채용공고</h3>
                    <p className="text-sm text-muted-foreground mb-5">불러올 공고를 선택해주세요</p>
              
                    {loadingPostings ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-[var(--gradient-mid)]" />
                      </div>
                    ) : savedPostings.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p>저장된 공고가 없습니다.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {savedPostings.map((posting) => (
                          <div
                            key={posting.id}
                            className="group relative p-4 rounded-xl border border-border hover:border-[var(--gradient-mid)]/40 hover:bg-[var(--gradient-mid)]/5 transition-all cursor-pointer"
                            onClick={() => selectSavedPosting(posting)}
                          >
                            {/* 삭제 버튼 (JobPostings만) */}
                            {!posting._source && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeletingPosting(posting.id);
                                }}
                                className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
              
                            <div className="space-y-2 pr-8">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-foreground">{posting.companyName}</h4>
                                {posting.position && (
                                  <Badge variant="secondary" className="text-xs">{posting.position}</Badge>
                                )}
                                {posting._source === "company" && (
                                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                                    posting._isPrimary
                                      ? "bg-pink-500/20 text-pink-500"
                                      : "bg-pink-500/10 text-pink-400"
                                  }`}>
                                    {posting._isPrimary ? "⭐ 주 목표기업" : posting._noPosting ? "목표기업" : "목표기업 공고"}
                                  </span>
                                )}
                              </div>
                              
                              {posting.workPlace && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {posting.workPlace}
                                </p>
                              )}
                              
                              {posting.employmentType && (
                                <p className="text-xs text-muted-foreground">{posting.employmentType}</p>
                              )}
                              
                              {posting.createdAt && !isNaN(new Date(posting.createdAt)) && (
                                <p className="text-xs text-muted-foreground">
                                  {new Date(posting.createdAt).toLocaleDateString("ko-KR")}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {deletingPosting && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="relative w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-4">
                  <h3 className="text-lg font-bold text-foreground">공고 삭제</h3>
                  <p className="text-sm text-muted-foreground">
                    선택한 채용공고를 삭제하시겠습니까?<br />
                    이 작업은 되돌릴 수 없습니다.
                  </p>
                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => setDeletingPosting(null)}
                    >
                      취소
                    </Button>
                    <Button 
                      className="flex-1 bg-red-500 text-white hover:bg-red-600"
                      onClick={() => deleteSavedPosting(deletingPosting)}
                    >
                      삭제
                    </Button>
                  </div>
                </div>
              </div>
            )}
                  {jobMode === "quick" && (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">⚠️ 임의의 회사로 자기소개서가 제작됩니다.</p>
                      <Button variant="outline" size="sm" onClick={() => setJobMode(null)}>← 돌아가기</Button>
                    </div>
                  )}
                  {jobMode === "form" && (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">회사명, 직무, 주요 업무 중 최소 하나는 입력해주세요.</p>
                      {[
                        { name: "companyName", label: "🏢 회사명", type: "input", placeholder: "회사명" },
                        { name: "position", label: "💼 직무 / 포지션", type: "input", placeholder: "직무명" },
                        { name: "mainTasks", label: "📋 주요 업무", type: "textarea", placeholder: "주요 업무 내용" },
                        { name: "requirements", label: "✅ 자격 요건", type: "textarea", placeholder: "자격 요건" },
                        { name: "preferred", label: "⭐ 우대 사항", type: "textarea", placeholder: "우대 사항" },
                        { name: "techStack", label: "🛠 필요 역량 / 기술", type: "input", placeholder: "사용 도구, 기술, 역량 등" },
                        { name: "workPlace", label: "📍 근무지", type: "input", placeholder: "근무지" },
                        { name: "employmentType", label: "📄 고용 형태", type: "input", placeholder: "정규직, 인턴 등" },
                        { name: "vision", label: "💡 회사 비전/문화", type: "textarea", placeholder: "회사 비전 및 문화" },
                      ].map(({ name, label, type, placeholder }) => (
                        <div key={name} className="space-y-1.5">
                          <label className="text-sm font-medium text-foreground">{label}</label>
                          {type === "input" ? (
                            <input type="text" name={name} value={jobForm[name]}
                              onChange={handleJobFormChange} placeholder={placeholder} className={inputClass} />
                          ) : (
                            <textarea name={name} value={jobForm[name]}
                              onChange={handleJobFormChange} placeholder={placeholder}
                              rows={2} className={textareaClass} />
                          )}
                        </div>
                      ))}
                      <div className="flex gap-3">
                        <Button className="flex-1 bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white hover:opacity-90"
                          onClick={confirmJobForm}>
                          ✅ 채용공고 입력 완료
                        </Button>
                        <Button variant="outline" onClick={() => setJobMode(null)}>← 돌아가기</Button>
                      </div>
                      {jobConfirmed && (
                        <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm">
                          <CheckCircle className="h-4 w-4" />채용공고 입력 완료
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {jobMode && (
                <div className="flex gap-2">
                  <Button
                    className="flex-1 bg-gradient-to-r from-[var(--gradient-start)] via-[var(--gradient-mid)] to-[var(--gradient-end)] text-white hover:opacity-90"
                    onClick={generateResume} disabled={loading}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    {loading ? "AI가 작성 중입니다..." : "✍️ 자소서 생성하기"}
                  </Button>
                  {editedResume && (
                    <Button variant="outline" size="sm" onClick={resetResume} className="shrink-0 text-muted-foreground">
                      <X className="mr-1.5 h-3.5 w-3.5" />초기화
                    </Button>
                  )}
                </div>
              )}

              {(loading || editedResume) && (
                <Card className={`border transition-all duration-500 ${isConfirmed ? "border-green-400/50" : "border-border/50"}`}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Edit className="h-5 w-5 text-[var(--gradient-mid)]" />
                      {loading ? "✍️ 작성 중..." : isConfirmed ? (
                        <span className="flex items-center gap-2">
                          자기소개서 확정 완료
                          <Badge className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs">✅ 저장됨</Badge>
                        </span>
                      ) : "자기소개서 검토 및 수정"}
                    </CardTitle>
                    {!loading && !isConfirmed && <CardDescription>자유롭게 수정한 후 확정하기를 눌러주세요.</CardDescription>}
                    {isConfirmed && <CardDescription className="text-green-600 dark:text-green-400">자소서가 저장되었습니다. 다시 수정하려면 아래 버튼을 눌러주세요.</CardDescription>}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {loading ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>{resume}</ReactMarkdown>
                      </div>
                    ) : (
                      <>
                        <textarea
                          ref={isConfirmed ? confirmedTextareaRef : undefined}
                          className={`w-full px-4 py-3 rounded-lg border text-foreground text-sm focus:outline-none transition-all duration-500 resize-none overflow-hidden leading-relaxed ${
                            isConfirmed
                              ? "border-green-400/40 bg-green-50/5 dark:bg-green-950/10 focus:ring-2 focus:ring-green-400/30"
                              : "border-input bg-background focus:ring-2 focus:ring-[var(--gradient-mid)]/50 focus:border-[var(--gradient-mid)]"
                          }`}
                          value={editedResume}
                          onChange={(e) => {
                            if (!isConfirmed) {
                              setEditedResume(e.target.value);
                              e.target.style.height = "auto";
                              e.target.style.height = e.target.scrollHeight + "px";
                            }
                          }}
                          onInput={(e) => { e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }}
                          readOnly={isConfirmed}
                        />
                        {!isConfirmed && (
                          <Button className="w-full bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white hover:opacity-90"
                            onClick={handleConfirm} disabled={isAnimating}>
                            <CheckCircle className="mr-2 h-4 w-4" />✅ 자소서 확정하기
                          </Button>
                        )}
                        {isConfirmed && (
                          <Button variant="outline" className="w-full border-green-300 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/20"
                            onClick={() => setIsConfirmed(false)}>
                            ✏️ 다시 수정하기
                          </Button>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              )}

              {resumeFeedback && !loading && (
                <Card className="border border-border/50">
                  <CardHeader className="pb-2">
                    <button className="flex items-center justify-between w-full text-left"
                      onClick={() => setFeedbackOpen(prev => !prev)}>
                      <CardTitle className="text-base">💡 AI 작성 근거</CardTitle>
                      {feedbackOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </button>
                  </CardHeader>
                  {feedbackOpen && (
                    <CardContent className="space-y-3">
                      {resumeFeedback.included?.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-xs font-semibold text-green-600 dark:text-green-400">✅ 포함된 경험</p>
                          {resumeFeedback.included.map((item, i) => <p key={i} className="text-sm text-muted-foreground pl-3">{item}</p>)}
                        </div>
                      )}
                      {resumeFeedback.enhanced?.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">🔧 보강된 내용</p>
                          {resumeFeedback.enhanced.map((item, i) => <p key={i} className="text-sm text-muted-foreground pl-3">{item}</p>)}
                        </div>
                      )}
                      {resumeFeedback.excluded?.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-xs font-semibold text-muted-foreground">📌 이번 자소서에서 우선순위가 밀린 경험</p>
                          {resumeFeedback.excluded.map((item, i) => <p key={i} className="text-sm text-muted-foreground pl-3">{item}</p>)}
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              )}

              {isConfirmed && !loading && (
                <>
                  {/* 평가 결과 (있으면 표시) */}
                  {evaluation && <EvaluationResult evaluation={evaluation} />}
                  
                  <Card className="border-2 border-[var(--gradient-mid)]/20 ...">
                    <CardContent className="pt-6">
                      <div className="flex flex-col gap-4">
                        <div>
                          <h3 className="text-lg font-semibold mb-1">다음 단계</h3>
                          <p className="text-sm text-muted-foreground">평가를 받거나 모의면접을 진행하세요</p>
                        </div>
                        <div className="flex gap-3">
                          {/* 평가받기 버튼 */}
                          {!evaluation && (
                            <Button
                              onClick={handleEvaluate}
                              disabled={evaluating}
                              className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500 text-white"
                            >
                              {evaluating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BarChart className="mr-2 h-4 w-4" />}
                              평가받기
                            </Button>
                          )}
                          {/* 모의면접 버튼 */}
                          {jobPosting && (
                            <Button
                              size="lg"
                              className="flex-1 bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white"
                              onClick={() => navigate("/interview", { state: { resume: editedResume, jobPosting, analysis } })}
                            >
                              모의면접 시작<ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* 히스토리 모달 */}
      {isHistoryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-lg mx-4 bg-card border border-border rounded-2xl shadow-2xl p-6">
            <button className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setIsHistoryOpen(false)}>
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-lg font-bold text-foreground mb-1">이전 자소서</h3>
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm text-muted-foreground">불러올 자소서를 선택해주세요</p>
              <Button variant="ghost" size="sm" onClick={clearHistory} className="text-muted-foreground hover:text-destructive text-xs">전체 삭제</Button>
            </div>
            <div className="space-y-3">
              {getHistory().map((entry, idx) => (
                <button key={entry.key} onClick={() => restoreFromHistory(entry)}
                  className="w-full text-left p-4 rounded-xl border border-border hover:border-[var(--gradient-mid)]/50 hover:bg-[var(--gradient-mid)]/5 transition-all group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--gradient-mid)]/15 text-[var(--gradient-mid)]">
                          {idx + 1}번째 최근
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />{formatTime(entry.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-foreground truncate">{entry.preview}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{entry.resultPreview}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-[var(--gradient-mid)] transition-colors shrink-0 mt-1" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default ResumeWriter;