import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "./ui/button";
import { FileText, BarChart2, MessageSquare, Moon, Sun, User, ChevronDown, Settings, Coins } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import CareerPilotHelmIcon from './CareerPilotHelmIcon';

function Nav() {
  const { user, logout, credits } = useAuth(); // 🔥 credits Context에서 가져오기!
  const navigate = useNavigate();
  const location = useLocation();
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem("theme");
    if (saved) return saved === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  // 🔥 interval 제거! Context가 알아서 관리!

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
    navigate("/login");
  };

  const navItems = [
    { path: "/analyze", label: "역량평가", icon: BarChart2 },
    { path: "/my-resumes", label: "자기소개서", icon: FileText },
    { path: "/my-interviews", label: "모의면접", icon: MessageSquare },
  ];

  const userMenuItems = [
    { path: "/my-assessments", label: "나의 역량평가", icon: BarChart2 },
    { path: "/my-resumes", label: "나의 자소서", icon: FileText },
    { path: "/my-interviews", label: "나의 면접", icon: MessageSquare },
    { path: "/my-page", label: "마이페이지", icon: Settings },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">

        <div
          className="flex items-center gap-2.5 cursor-pointer group"
          onClick={() => navigate("/")}
        >
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-[#6366f1] via-[#8b5cf6] to-[#a78bfa] shadow-lg transition-transform group-hover:scale-105 active:scale-95">
            <CareerPilotHelmIcon className="h-5 w-5 text-white" />
          </div>
          
          <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-[#6366f1] to-[#a78bfa] bg-clip-text text-transparent">
            CareerPilot
          </span>
        </div>

        {/* 메뉴 리스트 */}
        <div className="hidden md:flex items-center gap-1">
          {navItems.map(({ path, label, icon: Icon }) => {
            const isActive = location.pathname === path;
            return (
              <Link key={path} to={path}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  size="sm"
                  className={`gap-2 ${isActive
                    ? "bg-[#6366f1]/15 text-[#6366f1] font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Button>
              </Link>
            );
          })}
        </div>

        {/* 우측 유틸리티 섹션 */}
        <div className="flex items-center gap-2">
          
          {/* 🔥 크레딧 표시 (로그인 시에만) */}
          {user && credits !== null && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/20 dark:to-yellow-900/20 border border-amber-200 dark:border-amber-800">
              <Coins className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                {credits >= 999999 ? '∞' : credits}
              </span>
            </div>
          )}

          {/* 다크모드 토글 */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDark(!dark)}
            className="text-muted-foreground"
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {user ? (
            <div className="relative" ref={dropdownRef}>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setDropdownOpen(prev => !prev)}
              >
                <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-[#6366f1] to-[#a78bfa] flex items-center justify-center">
                   <User className="h-3 w-3 text-white" />
                </div>
                <span className="hidden md:block font-medium">{user.nickname || "JobPassenger"}</span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
              </Button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-card border border-border rounded-xl shadow-xl py-2 z-50">
                  <div className="px-4 py-2 border-b border-border mb-1">
                    <p className="text-xs text-muted-foreground">환영합니다!</p>
                    <p className="text-sm font-semibold truncate bg-gradient-to-r from-[#6366f1] via-[#8b5cf6] to-[#a78bfa] bg-clip-text text-transparent">{user.nickname || "JobPassenger"}</p>
                  </div>
                  {userMenuItems.map(({ path, label, icon: Icon }) => (
                    <button
                      key={path}
                      onClick={() => { navigate(path); setDropdownOpen(false); }}
                      className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                        location.pathname === path
                          ? "text-[#6366f1] font-bold"
                          : "text-foreground hover:bg-muted"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  ))}
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
              <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>
                로그인
              </Button>
              <Button
                size="sm"
                onClick={() => navigate("/register")}
                className="bg-gradient-to-r from-[#6366f1] to-[#a78bfa] text-white hover:opacity-90 shadow-sm"
              >
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