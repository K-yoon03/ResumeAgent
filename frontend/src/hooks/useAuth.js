import { useState, useEffect } from 'react';
import { BASE_URL } from '../config';

/**
 * 현재 사용자 정보 및 관리자 여부 확인
 */
export function useAuth() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data);
        setIsAdmin(data.role === 'ADMIN'); // 🔥 ROLE_ 포함!
      }
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  return { user, isAdmin, loading };
}