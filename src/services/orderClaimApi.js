import { auth } from "../firebase";
import { apiUrl } from "../config/api";

async function request(path, options = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error("Bu işlem için giriş yapmalısınız.");
  const token = await user.getIdToken();
  const response = await fetch(apiUrl(path), { ...options, headers: { "Content-Type": "application/json", ...options.headers, Authorization: `Bearer ${token}` } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Talep işlemi tamamlanamadı.");
  return data;
}
export const createOrderClaim = (orderId, payload) => request(`/api/orders/${encodeURIComponent(orderId)}/claim`, { method: "POST", body: JSON.stringify(payload) });
export const cancelOrderClaim = (claimId) => request(`/api/order-claims/${encodeURIComponent(claimId)}/cancel`, { method: "POST" });
