import { auth } from "../firebase";
import { apiUrl } from "../config/api";

export async function sellerArchiveRequest(path, body, signal) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Lütfen hesabınıza giriş yapın.");
  const response = await fetch(apiUrl(`/api/orders/${path}`), {
    method: "POST", signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(30000)]) : AbortSignal.timeout(30000),
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body || {}),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(response.status === 409 ? "Bu kayıt temizlenemez. Devam eden ödeme veya finansal geçmiş korunur." : "Bu kayıt silinemedi. Lütfen tekrar deneyin.");
  return result;
}
