import { auth } from "../firebase";
import { apiUrl } from "../config/api";

async function request(path, options = {}, tokenRequired = false) {
  const headers = { ...(options.headers || {}) };
  const controller = new AbortController();
  // Backend veri erişimini 7 saniyede sonlandırıyor. Ağ payı bırakırken
  // kullanıcıyı ikinci kez uzun bir loader içinde bekletmemek için üst sınır.
  const timeout = window.setTimeout(() => controller.abort(), 9000);
  if (tokenRequired) {
    const user = auth.currentUser;
    if (!user) throw new Error("Oy vermek için giriş yapmalısınız.");
    headers.Authorization = `Bearer ${await user.getIdToken()}`;
  }

  try {
    const response = await fetch(apiUrl(path), { ...options, headers, signal: controller.signal });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const requestError = new Error(data.message || data.error || "Kapışma işlemi tamamlanamadı.");
      requestError.code = data.code || "GIFT_BATTLE_REQUEST_FAILED";
      requestError.status = response.status;
      throw requestError;
    }
    return data;
  } catch (error) {
    if (error?.name === "AbortError") {
      const timeoutError = new Error("Kapışma servisi geç yanıt verdi. Lütfen tekrar deneyin.", { cause: error });
      timeoutError.code = "GIFT_BATTLE_CLIENT_TIMEOUT";
      throw timeoutError;
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

async function optionalAuthRequest(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (auth.currentUser) headers.Authorization = `Bearer ${await auth.currentUser.getIdToken()}`;
  const response = await fetch(apiUrl(path), { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.message || "Kapışma yüklenemedi."), { status: response.status, code: data.code });
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

export const getCommunityBattles = (limit = 8) => request(`/api/gift-battle/community?limit=${limit}`);
export const getCommunityBattle = (battleId) => optionalAuthRequest(`/api/gift-battle/community/${encodeURIComponent(battleId)}`);
export const createCommunityBattle = (productIds, question) => request("/api/gift-battle/community", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productIds, question }) }, true);
export const voteCommunityBattle = (battleId, choice) => request(`/api/gift-battle/community/${encodeURIComponent(battleId)}/vote`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ choice }) }, true);
export const endCommunityBattle = (battleId) => request(`/api/gift-battle/community/${encodeURIComponent(battleId)}/end`, { method: "POST" }, true);
