import { auth } from "../firebase";
import { apiUrl } from "../config/api";

async function request(path, options = {}, tokenRequired = false) {
  const headers = { ...(options.headers || {}) };
  if (tokenRequired) {
    const user = auth.currentUser;
    if (!user) throw new Error("Oy vermek için giriş yapmalısınız.");
    headers.Authorization = `Bearer ${await user.getIdToken()}`;
  }

  const response = await fetch(apiUrl(path), { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || data.error || "Kapışma işlemi tamamlanamadı.");
  return data;
}

export function getTodayGiftBattle() {
  return request("/api/gift-battle/today");
}

export function getMyGiftBattleVote() {
  return request("/api/gift-battle/mine", {}, true);
}

export function voteGiftBattle(selectedListingId) {
  return request("/api/gift-battle/vote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ selectedListingId })
  }, true);
}
