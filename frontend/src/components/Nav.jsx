import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "./ui/button";
import { FileText, BarChart2, MessageSquare, Moon, Sun, Zap, User, ChevronDown } from "lucide-react";
import { useState, useEffect, useRef } from "react";

function Nav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [dark, setDark] = useState(() =>
    document.documentElement.classList.contains("dark")
  );
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

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
    { path: "/interview", label: "모의면접", icon: MessageSquare },
  ];

  const userMenuItems = [
    { path: "/my-assessments", label: "나의 역량평가", icon: BarChart2 },
    { path: "/my-resumes", label: "나의 자소서", icon: FileText },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">

        {/* 로고 */}
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => navigate("/")}
        >
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)]">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-lg bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] bg-clip-text text-transparent">
            CareerPilot
          </span>
        </div>

        {/* 메뉴 */}
        <div className="flex items-center gap-1">
          {navItems.map(({ path, label, icon: Icon }) => {
            const isActive = location.pathname === path;
            return (
              <Link key={path} to={path}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  size="sm"
                  className={`gap-2 ${isActive
                    ? "bg-[var(--gradient-start)]/15 text-[var(--gradient-start)]"
                    : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Button>
              </Link>
            );
          })}
        </div>

        {/* 우측 */}
        <div className="flex items-center gap-2">
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
                <User className="h-4 w-4" />
                <span className="hidden md:block">{user.nickname}</span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
              </Button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-xl shadow-lg py-1 z-50">
                  {userMenuItems.map(({ path, label, icon: Icon }) => (
                    <button
                      key={path}
                      onClick={() => { navigate(path); setDropdownOpen(false); }}
                      className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-muted transition-colors ${
                        location.pathname === path
                          ? "text-[var(--gradient-mid)] font-medium"
                          : "text-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  ))}
                  <div className="border-t border-border my-1" />
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-destructive hover:bg-muted transition-colors"
                  >
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>
                로그인
              </Button>
              <Button
                size="sm"
                onClick={() => navigate("/register")}
                className="bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white hover:opacity-90"
              >
                회원가입
              </Button>
            </>
          )}
        </div>

      </div>
    </nav>
  );
}

export default Nav;