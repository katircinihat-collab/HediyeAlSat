import { auth } from "../firebase";
import { apiUrl } from "../config/api";

export async function updateSellerOrderStatus(orderId, payload) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Sipariş durumunu güncellemek için giriş yapmalısınız.");
  const response = await fetch(apiUrl(`/api/orders/${encodeURIComponent(orderId)}/status`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || "Sipariş durumu güncellenemedi.");
  return result;
}
