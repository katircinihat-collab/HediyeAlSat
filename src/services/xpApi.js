import { apiUrl } from "../config/api";

async function xpRequest(user, path, options = {}) {
  const token = await user.getIdToken();
  const response = await fetch(apiUrl(`/api/xp${path}`), { ...options, headers: { ...options.headers, Authorization: `Bearer ${token}` } });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || "XP işlemi tamamlanamadı.");
  return result;
}

export const getMyXp = (user) => xpRequest(user, "/me?limit=10");
export const claimWelcomeXp = (user) => xpRequest(user, "/welcome", { method: "POST" });
