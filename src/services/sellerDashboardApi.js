import { auth } from "../firebase";
import { apiUrl } from "../config/api";

export async function sellerDashboardRequest(path, { method = "GET", body, signal } = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error("Lütfen hesabınıza giriş yapın.");
  const timeout = AbortSignal.timeout(15000);
  const response = await fetch(apiUrl(path), {
    method, signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || result.error || "Bilgiler şu anda alınamıyor. Lütfen tekrar deneyin.");
  return result;
}
