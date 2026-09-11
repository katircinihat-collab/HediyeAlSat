import { apiUrl } from "../config/api";

export async function initializeListingBoost(user, listingId, packageId) {
  const token = await user.getIdToken();
  const response = await fetch(apiUrl("/api/listing-boosts/initialize"), {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ listingId, packageId })
  });
  const result = await response.json();
  if (!response.ok) {
    const error = new Error(result.message || "Öne çıkarma ödemesi başlatılamadı.");
    error.code = result.code;
    throw error;
  }
  return result;
}
