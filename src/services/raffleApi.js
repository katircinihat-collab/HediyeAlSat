import { apiUrl } from "../config/api";

async function request(path, { user, ...options } = {}) {
  const headers = { ...options.headers };
  if (user) headers.Authorization = `Bearer ${await user.getIdToken()}`;
  const response = await fetch(apiUrl(`/api/raffles${path}`), { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || "Kura işlemi tamamlanamadı.");
    error.code = data.code || `HTTP_${response.status}`;
    throw error;
  }
  return data;
}

export const getActiveRaffle = () => request("/active");
export const getRaffleMe = (eventId, user) => request(`/${eventId}/me`, { user });
export const joinRaffle = (eventId, user, giftHint) => request(`/${eventId}/join`, { user, method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ giftHint }) });
export const cancelRaffle = (eventId, user) => request(`/${eventId}/join`, { user, method: "DELETE" });
export const updateRaffleHint = (eventId, user, giftHint) => request(`/${eventId}/hint`, { user, method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ giftHint }) });
export const getRaffleResult = (eventId, user) => request(`/${eventId}/result`, { user });
export const getRaffleMessages = (eventId) => request(`/${eventId}/messages`);
export const sendRaffleMessage = (eventId, user, message) => request(`/${eventId}/messages`, { user, method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message }) });
