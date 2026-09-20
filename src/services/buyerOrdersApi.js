import { auth } from "../firebase";
import { apiUrl } from "../config/api";

export async function getBuyerOrders() {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Siparişlerinizi görmek için giriş yapmalısınız.");
  const response = await fetch(apiUrl("/api/orders/mine"), { headers: { Authorization: `Bearer ${token}` } });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || "Siparişleriniz şu anda alınamıyor.");
  return Array.isArray(result.orders) ? result.orders : [];
}
