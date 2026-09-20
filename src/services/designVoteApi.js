import { auth } from "../firebase";
import { apiUrl } from "../config/api";

async function request(path, options = {}, tokenRequired = false) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 7000);
  const headers = { ...(options.headers || {}) };
  if (tokenRequired) {
    const user = auth.currentUser;
    if (!user) throw new Error("Oy vermek için giriş yapmalısınız.");
    headers.Authorization = `Bearer ${await user.getIdToken()}`;
  }
  try {
    const response = await fetch(apiUrl(path), { ...options, headers, signal: controller.signal });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "İşlem tamamlanamadı.");
    return data;
  } catch (error) {
    if (error?.name === "AbortError") throw new Error("Tasarım sıralaması zamanında yüklenemedi. Lütfen tekrar deneyin.", { cause: error });
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export function getTopDesigns(limit = 10) {
  return request(`/api/design-votes/top?limit=${limit}`);
}

export function getMyDesignVotes() {
  return request("/api/design-votes/mine", {}, true);
}

export function getDesignVoteSummary(listingIds) {
  return request("/api/design-votes/summary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ listingIds })
  });
}

export function addDesignVote(listingId) {
  return request(`/api/design-votes/${encodeURIComponent(listingId)}`, { method: "POST" }, true);
}

export function removeDesignVote(listingId) {
  return request(`/api/design-votes/${encodeURIComponent(listingId)}`, { method: "DELETE" }, true);
}
