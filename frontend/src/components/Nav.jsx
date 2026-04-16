import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "./ui/button";
import { Moon, Sun, User, ChevronDown, Settings, Coins, BarChart2, FileText, MessageSquare, LayoutDashboard, Building2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import CareerPilotHelmIcon from './CareerPilotHelmIcon';
import jobCodeMap from '../MappingTable/JobCodeMap.json';

const getGrade = (score) => {
  if (!score) return null;
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
  if (!grade) return "";
  if (grade.startsWith("S") || grade.startsWith("A")) return "bg-[#EEEDFE] text-[#534AB7]";
  if (grade.startsWith("B")) return "bg-[#EAF3DE] text-[#3B6D11]";
  return "bg-[#F1EFE8] text-[#5F5E5A]";
};

const megaMenus = [
  {
    label: "역량평가",
    icon: BarChart2,
    items: [
      { path: "/analyze/new", label: "역량평가 실시" },
      { path: "/my-assessments", label: "내 역량평가 목록" },
    ],
  },
  {
    label: "자기소개서",
    icon: FileText,
    items: [
      { path: "/resume-select", label: "자소서 작성" },
      { path: "/my-resumes", label: "내 자소서 보기" },
    ],
  },
  {
    label: "모의면접",
    icon: MessageSquare,
    items: [
      { path: "/interview/advanced", label: "자소서 기반 면접" },
      { path: "/interview", label: "일반 모의면접" },
      { path: "/my-interviews", label: "내 면접 기록" },
    ],
  },
  {
    label: "목표기업",
    icon: Building2,
    items: [
      { path: "/companies/new", label: "새 목표기업 추가" },
      { path: "/companies", label: "목표기업 보기" },
    ],
  },
];

function Nav() {
  const { user, logout, credits } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem("theme");
    if (saved) return saved === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  const [openMenu, setOpenMenu] = useState(null);
  const [userDropdown, setUserDropdown] = useState(false);
  const navRef = useRef(null);
  const userRef = useRef(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) setOpenMenu(null);
      if (userRef.current && !userRef.current.contains(e.target)) setUserDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 페이지 이동 시 메뉴 닫기
  useEffect(() => {
    setOpenMenu(null);
    setUserDropdown(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    setUserDropdown(false);
    navigate("/login");
  };

  // 주 역량 점수 추출
  const primaryScore = user?.primaryAssessment
    ? (() => {
        try {
          const sd = JSON.parse(user.primaryAssessment.scoreData);
          return sd.totalScore ?? null;
        } catch { return null; }
      })()
    : null;

  const grade = getGrade(primaryScore);

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md" ref={navRef}>
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">

        {/* 로고 */}
        <div className="flex items-center gap-2.5 cursor-pointer group" onClick={() => navigate(user ? "/dashboard" : "/")}>
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-[#6366f1] via-[#8b5cf6] to-[#a78bfa] shadow-lg transition-transform group-hover:scale-105 active:scale-95">
            <CareerPilotHelmIcon className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-[#6366f1] to-[#a78bfa] bg-clip-text text-transparent">
            CareerPilot
          </span>
        </div>

        {/* 메가 메뉴 */}
        <div className="hidden md:flex items-center gap-1">
          {user && megaMenus.map((menu) => {
            const isActive = menu.items.some(i => location.pathname === i.path);
            const isOpen = openMenu === menu.label;
            return (
              <div key={menu.label} className="relative">
                <button
                  onClick={() => setOpenMenu(isOpen ? null : menu.label)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                    isActive || isOpen
                      ? "text-[#6366f1] font-semibold bg-[#6366f1]/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <menu.icon className="h-3.5 w-3.5" />
                  {menu.label}
                  <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>

                {isOpen && (
                  <div className="absolute top-full left-0 mt-1.5 w-44 bg-card border border-border rounded-xl shadow-xl py-1.5 z-50">
                    {menu.items.map(({ path, label }) => (
                      <button
                        key={path}
                        onClick={() => {
                          navigate(path);
                          setOpenMenu(null);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                          location.pathname === path
                            ? "text-[#6366f1] font-semibold bg-[#6366f1]/5"
                            : "text-foreground hover:bg-muted"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* 대시보드 */}
          {user && (
            <Link to="/dashboard">
              <button className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                location.pathname === "/dashboard"
                  ? "text-[#6366f1] font-semibold bg-[#6366f1]/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}>
                <LayoutDashboard className="h-3.5 w-3.5" />
                대시보드
              </button>
            </Link>
          )}

          {/* 비로그인 메뉴 */}
          {!user && (
            <Link to="/analyze">
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
                <BarChart2 className="h-4 w-4" />
                역량평가
              </Button>
            </Link>
          )}
        </div>

        {/* 우측 */}
        <div className="flex items-center gap-2">

          {/* 크레딧 */}
          {user && credits !== null && (
            <Link to="/credits">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 hover:border-amber-400 transition-colors cursor-pointer">
                <Coins className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                  {credits >= 999999 ? "∞" : credits} cr
                </span>
              </div>
            </Link>
          )}

          {/* 다크모드 */}
          <Button variant="ghost" size="icon" onClick={() => setDark(!dark)} className="text-muted-foreground">
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {user ? (
            <div className="relative" ref={userRef}>
              <button
                onClick={() => setUserDropdown(prev => !prev)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors text-sm"
              >
                <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-[#6366f1] to-[#a78bfa] flex items-center justify-center">
                  <User className="h-3 w-3 text-white" />
                </div>
                <span className="hidden md:block font-medium max-w-[80px] truncate">{user.nickname || "JobPassenger"}</span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${userDropdown ? "rotate-180" : ""}`} />
              </button>

              {userDropdown && (
                <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-xl shadow-xl py-2 z-50">

                  {/* 정보 카드 */}
                  <div className="px-4 py-3 border-b border-border mb-1">
                    <p className="text-sm font-semibold truncate bg-gradient-to-r from-[#6366f1] via-[#8b5cf6] to-[#a78bfa] bg-clip-text text-transparent mb-2">
                      {user.nickname || "JobPassenger"}
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${grade ? getGradeColor(grade) : "bg-muted text-muted-foreground"}`}>
                        {grade ?? "미평가"}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 font-medium">
                        {credits >= 999999 ? "∞" : credits} cr
                      </span>
                    </div>
                    {user.mappedJobCode && (
                      <p className="text-xs text-muted-foreground mt-1.5 truncate">
                        {jobCodeMap[user.mappedJobCode] ?? user.mappedJobCode}
                        {user.isTemporaryJob && <span className="ml-1 text-amber-500">(임시)</span>}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => { navigate("/my-page"); setUserDropdown(false); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                    마이페이지
                  </button>

                  <div className="border-t border-border my-1" />
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>로그인</Button>
              <Button size="sm" onClick={() => navigate("/register")}
                className="bg-gradient-to-r from-[#6366f1] to-[#a78bfa] text-white hover:opacity-90 shadow-sm">
                회원가입
              </Button>
            </div>
          )}
        </div>

      </div>
    </nav>
  );
}

export default Nav;