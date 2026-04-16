import { BASE_URL } from '../config';

let logoutCallback = null;

export const setLogoutCallback = (fn) => {
  logoutCallback = fn;
};

export const authFetch = async (url, options = {}) => {
  const token = localStorage.getItem("token");
  
  const res = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers: {
      ...options.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (res.status === 401) {
    // Refresh Token 시도
    const refreshToken = localStorage.getItem("refreshToken");
    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${BASE_URL}/api/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });
        if (refreshRes.ok) {
          const data = await refreshRes.json();
          localStorage.setItem("token", data.token);
          // 원래 요청 재시도
          return fetch(`${BASE_URL}${url}`, {
            ...options,
            headers: {
              ...options.headers,
              Authorization: `Bearer ${data.token}`,
            },
          });
        }
      } catch {}
    }
    // Refresh도 실패 → 자동 로그아웃
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    if (logoutCallback) logoutCallback();
    return res;
  }

  return res;
};