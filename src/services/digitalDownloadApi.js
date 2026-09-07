import { auth } from "../firebase";
import { apiUrl } from "../config/api";

export async function getDigitalDownload(orderId) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Dijital dosyayı indirmek için giriş yapmalısınız.");
  const response = await fetch(apiUrl(`/api/digital-assets/download/${encodeURIComponent(orderId)}`), {
    headers: { Authorization: `Bearer ${token}` }
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.download?.url) throw new Error(result.message || "Dijital dosya indirilemedi.");
  return result.download;
}
