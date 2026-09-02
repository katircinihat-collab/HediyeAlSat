import { auth } from "../firebase";
import { apiUrl } from "../config/api";

export async function confirmOrderDelivery(orderId) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Teslimatı doğrulamak için giriş yapmalısınız.");
  const response = await fetch(apiUrl(`/api/orders/${encodeURIComponent(orderId)}/confirm-delivery`), {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || "Teslimat doğrulanamadı.");
  return result;
}
