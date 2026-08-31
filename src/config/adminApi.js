import { auth } from "../firebase";
import { apiUrl } from "./api";

export async function adminApi(path, options = {}) {
  const user = auth.currentUser;

  if (!user) throw new Error("Admin işlemi için giriş yapmalısınız.");

  const token = await user.getIdToken();
  const response = await fetch(apiUrl(`/api/admin${path}`), {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Admin işlemi başarısız oldu.");
  }

  return data;
}
