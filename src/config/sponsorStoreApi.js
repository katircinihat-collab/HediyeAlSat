import { auth } from "../firebase";
import { apiUrl } from "./api";

export async function sponsorStoreApi(path, options = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error("İşlem için giriş yapmalısınız.");
  const token = await user.getIdToken();
  const response = await fetch(apiUrl(`/api/sponsor-store${path}`), {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers, Authorization: `Bearer ${token}` }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "İşlem tamamlanamadı.");
  return data;
}
