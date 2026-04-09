import { createContext, useContext, useState, useEffect } from "react";
import { BASE_URL } from '../config';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [credits, setCredits] = useState(null); // 🔥 크레딧 state 추가!

  // 앱 시작 시 token 있으면 DB에서 유저 정보 가져오기
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }
    fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error("인증 실패");
        return res.json();
      })
      .then(data => {
        setUser({ token, ...data });
        setCredits(data.credits); // 🔥 크레딧 설정!
      })
      .catch(async () => {
        // Access Token 만료 시 Refresh Token으로 갱신 시도
        const refreshToken = localStorage.getItem("refreshToken");
        if (refreshToken) {
          try {
            const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ refreshToken }),
            });
            if (res.ok) {
              const data = await res.json();
              localStorage.setItem("token", data.token);
              setUser(data);
              setCredits(data.credits); // 🔥 크레딧 설정!
              return;
            }
          } catch {
            // Refresh도 실패하면 로그아웃
          }
        }
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        setUser(null);
        setCredits(null); // 🔥 크레딧 초기화!
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handler = (e) => setCredits(e.detail.credits);
    window.addEventListener("credit-updated", handler);
    return () => window.removeEventListener("credit-updated", handler);
  }, []);

  const login = async (data) => {
    localStorage.setItem("token", data.token);
    if (data.refreshToken) {
      localStorage.setItem("refreshToken", data.refreshToken);
    }

    // 전체 유저 정보 가져오기
    try {
      const res = await fetch(`${BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${data.token}` }
      });
      if (res.ok) {
        const fullData = await res.json();
        setUser({ token: data.token, refreshToken: data.refreshToken, ...fullData });
        setCredits(fullData.remainingCredits);
      } else {
        setUser(data);
        setCredits(data.credits);
      }
    } catch {
      setUser(data);
      setCredits(data.credits);
    }

    // 비회원 때 했던 역량평가 있으면 자동으로 DB에 저장
    const pending = sessionStorage.getItem("pendingAssessment");
    if (pending) {
      try {
        const { experience, analysis, scoreData } = JSON.parse(pending);
        await fetch(`${BASE_URL}/api/assessments`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${data.token}`,
          },
          body: JSON.stringify({ experience, analysis, scoreData }),
        });
        sessionStorage.removeItem("pendingAssessment");
      } catch {
        // 저장 실패해도 로그인은 정상 진행
      }
    }
  };

  const logout = async () => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        await fetch(`${BASE_URL}/api/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // 실패해도 로컬은 무조건 지움
      }
    }
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    setUser(null);
    setCredits(null); // 🔥 크레딧 초기화!
  };

  // 🔥 크레딧 갱신 함수 추가!
  const refreshCredits = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    
    try {
      const res = await fetch(`${BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setCredits(data.credits);
      } else if (res.status === 401) {
        // Access Token 만료 시 갱신 시도
        const refreshToken = localStorage.getItem("refreshToken");
        if (refreshToken) {
          const refreshRes = await fetch(`${BASE_URL}/api/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken }),
          });
          if (refreshRes.ok) {
            const newData = await refreshRes.json();
            localStorage.setItem("token", newData.token);
            setUser(newData);
            setCredits(newData.credits);
          }
        }
      }
    } catch (err) {
      console.error('Credit refresh failed:', err);
    }
  };

  // 유저 정보 갱신 (마이페이지 수정 후 호출)
  const refreshUser = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      setUser({ token, ...data });
      setCredits(data.credits); // 🔥 크레딧도 갱신!
    } else if (res.status === 401) {
      // Access Token 만료 시 갱신 시도
      const refreshToken = localStorage.getItem("refreshToken");
      if (refreshToken) {
        const refreshRes = await fetch(`${BASE_URL}/api/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });
        if (refreshRes.ok) {
          const newData = await refreshRes.json();
          localStorage.setItem("token", newData.token);
          setUser(newData);
          setCredits(newData.credits); // 🔥 크레딧도 갱신!
        }
      }
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      loading, 
      refreshUser,
      credits,        // 🔥 추가!
      refreshCredits,  // 🔥 추가!
      isAdmin: user?.role === 'ADMIN'
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);