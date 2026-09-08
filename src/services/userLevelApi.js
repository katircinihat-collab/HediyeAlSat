import { apiUrl } from "../config/api";

export async function getMyLevel(user) {
  const token = await user.getIdToken();
  const response = await fetch(apiUrl("/api/user-levels/me"), { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error("Seviye bilgisi alınamadı.");
  return response.json();
}

export async function hydrateCommentLevels(comments) {
  const uids = [...new Set(comments.map((item) => item.kullaniciUid).filter(Boolean))];
  if (!uids.length) return comments;
  try {
    const response = await fetch(apiUrl("/api/user-levels/public"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ uids, reviewIds: comments.map((item) => item.id).filter(Boolean) }) });
    if (!response.ok) return comments;
    const result = await response.json();
    const verifiedReviewIds = new Set(result.verifiedReviewIds || []);
    return comments.map((item) => ({ ...item, levelInfo: result.users?.[item.kullaniciUid] || null, verifiedBuyer: verifiedReviewIds.has(item.id) }));
  } catch { return comments; }
}

export async function getPublicLevel(uid) {
  if (!uid) return null;
  try {
    const response = await fetch(apiUrl("/api/user-levels/public"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ uids: [uid] }) });
    if (!response.ok) return null;
    const result = await response.json();
    return result.users?.[uid] || null;
  } catch { return null; }
}

export async function submitVerifiedProductReview(user, listingId, rating, comment) {
  const token = await user.getIdToken();
  const response = await fetch(apiUrl(`/api/user-levels/reviews/${encodeURIComponent(listingId)}`), { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ rating, comment }) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || "Yorum gönderilemedi.");
  return result;
}
