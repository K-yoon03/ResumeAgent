import { BASE_URL } from '../config';

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("token");

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  // 크레딧 부족
  if (res.status === 402) {
    const data = await res.json().catch(() => ({}));
    window.dispatchEvent(new CustomEvent("credit-insufficient", {
      detail: { required: data.required ?? 1, remaining: data.remaining ?? 0 }
    }));
    throw new Error("CREDIT_INSUFFICIENT");
  }

  // 크레딧 잔액 헤더 있으면 갱신
  const remaining = res.headers.get("X-Remaining-Credits");
  if (remaining !== null) {
    window.dispatchEvent(new CustomEvent("credit-updated", {
      detail: { credits: parseInt(remaining) }
    }));
  }

  return res;
}